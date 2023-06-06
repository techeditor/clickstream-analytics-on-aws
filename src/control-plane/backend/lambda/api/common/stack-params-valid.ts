/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { SecurityGroupRule, VpcEndpoint } from '@aws-sdk/client-ec2';
import { REDSHIFT_MODE } from './model-ln';
import { ClickStreamBadRequestError, ClickStreamSubnet, IngestionServerSinkBatchProps, PipelineSinkType, SubnetType } from './types';
import { checkVpcEndpoint, containRule, getSubnetsAZ, isEmpty } from './utils';
import { CPipelineResources, IPipeline } from '../model/pipeline';
import { describeSecurityGroupsWithRules, describeSubnetsWithType, describeVpcEndpoints, listAvailabilityZones } from '../store/aws/ec2';
import { getSecretValue } from '../store/aws/secretsmanager';

export const validatePattern = (parameter: string, pattern: string, value: string | undefined) => {
  if (!value) {
    throw new ClickStreamBadRequestError(`Validate error, ${parameter}: undefined not match ${pattern}. Please check and try again.`);
  }
  const regexp = new RegExp(pattern);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    throw new ClickStreamBadRequestError(`Validate error, ${parameter}: ${value} not match ${pattern}. Please check and try again.`);
  }
  return true;
};

export const validateSecretModel = async (region: string, key: string, secretArn: string, pattern: string) => {
  try {
    validatePattern(key, pattern, secretArn);
    const secretContent = await getSecretValue(region, secretArn);
    if (!secretContent) {
      throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret is undefined. Please check and try again.');
    }
    const secret = JSON.parse(secretContent);
    const keys = secret.issuer &&
      secret.userEndpoint &&
      secret.authorizationEndpoint &&
      secret.tokenEndpoint &&
      secret.appClientId &&
      secret.appClientSecret;
    if (!keys) {
      throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret format mismatch. Please check and try again.');
    }
  } catch (err) {
    throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret format mismatch. Please check and try again.');
  }
  return true;
};

export const validatePipelineNetwork = async (pipeline: IPipeline, resources: CPipelineResources) => {
  const network = pipeline.network;
  if (isEmpty(network.privateSubnetIds)) {
    // public subnets only
    // pipeline.network.privateSubnetIds = pipeline.network.publicSubnetIds;
    throw new ClickStreamBadRequestError(
      'Validate error, The current version does not support deployment with public subnet only. ' +
      'Please check and try again.',
    );
  }
  if (network.publicSubnetIds.length < 2 || network.privateSubnetIds.length < 2) {
    throw new ClickStreamBadRequestError(
      'Validate error, the Data ingestion network for pipeline at least two subnets. ' +
      'Please check and try again.',
    );
  }

  const allSubnets = await describeSubnetsWithType(pipeline.region, network.vpcId, SubnetType.ALL);
  const privateSubnets = allSubnets.filter(subnet => network.privateSubnetIds.includes(subnet.id));
  const publicSubnets = allSubnets.filter(subnet => network.publicSubnetIds.includes(subnet.id));
  const privateSubnetsAZ = getSubnetsAZ(privateSubnets);
  const publicSubnetsAZ = getSubnetsAZ(publicSubnets);
  if (publicSubnetsAZ.length < 2 || privateSubnetsAZ.length < 2) {
    throw new ClickStreamBadRequestError(
      'Validate error, the Data ingestion subnets AZ must cross two AZ. ' +
      'Please check and try again.',
    );
  }
  const azInPublic = publicSubnetsAZ.filter(az => privateSubnetsAZ.includes(az));
  const azInPrivate = privateSubnetsAZ.filter(az => publicSubnetsAZ.includes(az));
  if (azInPublic.length !== privateSubnetsAZ.length && azInPrivate.length !== privateSubnetsAZ.length) {
    throw new ClickStreamBadRequestError(
      'Validate error, the Data ingestion subnets AZ can not meeting conditions. ' +
      'Please check and try again.',
    );
  }

  const isolatedSubnets = allSubnets.filter(subnet => subnet.type == SubnetType.ISOLATED);
  if (isolatedSubnets.length > 0) {
    const vpcEndpoints = await describeVpcEndpoints(pipeline.region, network.vpcId);
    const vpcEndpointSecurityGroups: string[] = [];
    for (let vpce of vpcEndpoints) {
      for (let group of vpce.Groups!) {
        vpcEndpointSecurityGroups.push(group.GroupId!);
      }
    }

    const vpcEndpointSecurityGroupRules = await describeSecurityGroupsWithRules(pipeline.region, vpcEndpointSecurityGroups);

    for (let privateSubnet of privateSubnets) {
      if (privateSubnet.type === SubnetType.ISOLATED) {
        validateVpcEndpoint(pipeline.region, privateSubnet, vpcEndpoints, vpcEndpointSecurityGroupRules,
          [
            's3',
            'logs',
          ]);
        if (pipeline.ingestionServer) {
          const services = [
            'ecr.dkr',
            'ecr.api',
            'ecs',
            'ecs-agent',
            'ecs-telemetry',
          ];
          if (pipeline.ingestionServer.sinkType === PipelineSinkType.KINESIS) {
            services.push('kinesis-streams');
          }
          validateVpcEndpoint(pipeline.region, privateSubnet, vpcEndpoints, vpcEndpointSecurityGroupRules, services);
        }
        if (pipeline.dataProcessing) {
          validateVpcEndpoint(pipeline.region, privateSubnet, vpcEndpoints, vpcEndpointSecurityGroupRules,
            [
              'emr-serverless',
              'glue',
            ]);
        }
        if (pipeline.dataModeling) {
          validateVpcEndpoint(pipeline.region, privateSubnet, vpcEndpoints, vpcEndpointSecurityGroupRules,
            [
              'redshift-data',
              'sts',
              'dynamodb',
            ]);
        }
      }
    }
  }


  if (pipeline.dataModeling?.redshift) {
    let redshiftType = '';
    let vpcSubnets = allSubnets;
    let redshiftSubnets: ClickStreamSubnet[] = [];
    let redshiftSecurityGroups: string[] = [];
    let redshiftSecurityGroupsRules: SecurityGroupRule[] = [];
    let portOfRedshift = 5439;

    if (pipeline.dataModeling?.redshift?.newServerless) {
      redshiftType = REDSHIFT_MODE.NEW_SERVERLESS;
      if (pipeline.dataModeling?.redshift?.newServerless?.network.vpcId !== pipeline.network.vpcId) {
        vpcSubnets = await describeSubnetsWithType(
          pipeline.region, pipeline.dataModeling.redshift.newServerless.network.vpcId, SubnetType.ALL);
      }
      redshiftSubnets = vpcSubnets.filter(
        subnet => pipeline.dataModeling?.redshift?.newServerless?.network.subnetIds.includes(subnet.id));
      redshiftSecurityGroups = pipeline.dataModeling?.redshift?.newServerless?.network.securityGroups;
      redshiftSecurityGroupsRules = await describeSecurityGroupsWithRules(pipeline.region, redshiftSecurityGroups);
    } else if (pipeline.dataModeling?.redshift?.provisioned) {
      redshiftType = REDSHIFT_MODE.PROVISIONED;
      if (resources?.redshift?.network.vpcId !== pipeline.network.vpcId) {
        vpcSubnets = await describeSubnetsWithType(
          pipeline.region, resources?.redshift?.network.vpcId!, SubnetType.ALL);
      }
      redshiftSubnets = vpcSubnets.filter(
        subnet => resources?.redshift?.network.subnetIds?.includes(subnet.id));
      redshiftSecurityGroups = resources?.redshift?.network.securityGroups!;
      redshiftSecurityGroupsRules = await describeSecurityGroupsWithRules(pipeline.region, redshiftSecurityGroups);
      portOfRedshift = resources.redshift?.endpoint.port ?? 5439;
    }

    const azSet = new Set<string>();
    const quickSightSubnets: ClickStreamSubnet[] = [];
    for (let subnet of redshiftSubnets) {
      if (!azSet.has(subnet.availabilityZone)) {
        quickSightSubnets.push(subnet);
      }
      azSet.add(subnet.availabilityZone);
    }
    resources.quickSightSubnetIds = quickSightSubnets.map(subnet => subnet.id);

    if (redshiftType === REDSHIFT_MODE.NEW_SERVERLESS) {
      const azInRegion = await listAvailabilityZones(pipeline.region);
      if (azInRegion.length < 2) {
        throw new ClickStreamBadRequestError(
          `Validate error, error in obtaining ${pipeline.region} availability zones information. ` +
          'Please check and try again.',
        );
      } else if (azInRegion.length === 2) {
        if (azSet.size < 2 || redshiftSubnets.length < 3) {
          throw new ClickStreamBadRequestError(
            `Validate error, the network for deploying ${redshiftType} Redshift at least three subnets that cross two AZs. ` +
            'Please check and try again.',
          );
        }
      } else if (azSet.size < 3) {
        throw new ClickStreamBadRequestError(
          `Validate error, the network for deploying ${redshiftType} Redshift at least three subnets that cross three AZs. ` +
          'Please check and try again.',
        );
      }
    }

    const validSubnets = [];
    for (let quickSightSubnet of quickSightSubnets) {
      const redshiftCidrRule: SecurityGroupRule = {
        IsEgress: false,
        IpProtocol: 'tcp',
        FromPort: portOfRedshift,
        ToPort: portOfRedshift,
        CidrIpv4: quickSightSubnet.cidr,
      };
      if (containRule(redshiftSecurityGroups, redshiftSecurityGroupsRules, redshiftCidrRule)) {
        validSubnets.push(quickSightSubnet.id);
        break;
      }
    }
    if (isEmpty(validSubnets)) {
      throw new ClickStreamBadRequestError(
        `Validate error, security groups error of ${redshiftType} Redshift. ` +
        'Please check and try again.',
      );
    }
  }

  return true;
};

export const validateSinkBatch = (sinkType: PipelineSinkType, sinkBatch: IngestionServerSinkBatchProps) => {
  if (sinkType === PipelineSinkType.KAFKA) {
    if (sinkBatch.intervalSeconds < 0 || sinkBatch.intervalSeconds > 3000) {
      throw new ClickStreamBadRequestError(
        'Validate error, the sink batch interval must 0 <= interval <= 3000 for Kafka sink. ' +
        'Please check and try again.',
      );
    }
    if (sinkBatch.size < 1 || sinkBatch.size > 50000) {
      throw new ClickStreamBadRequestError(
        'Validate error, the sink batch size must 1 <= size <=50000 for Kafka sink. ' +
        'Please check and try again.',
      );
    }
  }
  if (sinkType === PipelineSinkType.KINESIS) {
    if (sinkBatch.intervalSeconds < 0 || sinkBatch.intervalSeconds > 300) {
      throw new ClickStreamBadRequestError(
        'Validate error, the sink batch interval must 0 <= interval <= 300 for Kinesis sink. ' +
        'Please check and try again.',
      );
    }
    if (sinkBatch.size < 1 || sinkBatch.size > 10000) {
      throw new ClickStreamBadRequestError(
        'Validate error, the sink batch size must 1 <= size <= 10000 for Kinesis sink. ' +
        'Please check and try again.',
      );
    }
  }
  return true;
};

const validateVpcEndpoint = (region: string, subnet: ClickStreamSubnet, vpcEndpoints: VpcEndpoint[],
  securityGroupsRules: SecurityGroupRule[],
  services: string[]) => {
  let prefix = `com.amazonaws.${region}`;
  if (region.startsWith('cn')) {
    prefix = 'cn.com.amazonaws.cn-northwest-1';
  }
  services = services.map(s => `${prefix}.${s}`);
  const invalidServices = checkVpcEndpoint(subnet.routeTable!, vpcEndpoints,
    securityGroupsRules, subnet, services);
  if (!isEmpty(invalidServices)) {
    throw new ClickStreamBadRequestError(
      `Validate error, vpc endpoint error in subnet: ${subnet.id}, detail: ${JSON.stringify(invalidServices)}. ` +
      'Please check and try again.',
    );
  }
};



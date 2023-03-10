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

import { SelectProps } from '@cloudscape-design/components';

export {};
declare global {
  interface IPipeline {
    pipelineId?: string;
    projectId: string;
    name: string;
    description: string;
    region: string;
    dataCollectionSDK: string;
    tags: ITag[];
    ingestionServer: {
      network: {
        vpcId: string;
        publicSubnetIds: string[];
        privateSubnetIds: string[];
      };
      size: {
        serverMin: string;
        serverMax: string;
        warmPoolSize: string;
        scaleOnCpuUtilizationPercent: string;
      };
      domain: {
        hostedZoneId: string;
        hostedZoneName: string;
        recordName: string;
      };
      loadBalancer: {
        serverEndpointPath: string;
        serverCorsOrigin: string;
        protocol: string;
        enableApplicationLoadBalancerAccessLog: boolean;
        logS3Bucket: string;
        logS3Prefix: string;
        notificationsTopicArn: string;
      };
      sinkType: string;
      sinkS3: {
        s3DataBucket: string;
        s3DataPrefix: string;
        s3BufferSize: string;
        s3BufferInterval: string;
      };
      sinkMSK: any;
      sinkKDS: any;
    };
    etl: any;
    dataModel: any;
    status?: string;
    createAt?: string;
    updateAt?: string;
  }

  interface IExtPipeline extends IPipeline {
    // temporary properties
    selectedRegion: SelectProps.Option | null;
    selectedVPC: SelectProps.Option | null;
    selectedSDK: SelectProps.Option | null;
    selectedPublicSubnet: OptionDefinition[];
    selectedPrivateSubnet: OptionDefinition[];
    enableEdp: boolean;
    selectedHostedZone: SelectProps.Option | null;
  }
}
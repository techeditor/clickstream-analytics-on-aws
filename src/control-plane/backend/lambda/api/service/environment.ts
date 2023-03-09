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

import { ApiSuccess } from '../common/request-valid';
import { listRegions } from '../store/aws/account';
import { athenaPing, listWorkGroups } from '../store/aws/athena';
import { describeVpcs, describeSubnets } from '../store/aws/ec2';
import { listRoles } from '../store/aws/iam';
import { listMSKCluster, mskPing } from '../store/aws/kafka';
import { listQuickSightUsers, quickSightPing } from '../store/aws/quicksight';
import { describeRedshiftClusters } from '../store/aws/redshift';
import { listHostedZones } from '../store/aws/route53';
import { listBuckets } from '../store/aws/s3';

export class EnvironmentServ {

  public async listRegions(_req: any, res: any, next: any) {
    try {
      const result = await listRegions();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeVpcs(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await describeVpcs(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeSubnets(req: any, res: any, next: any) {
    try {
      const { region, vpcId, subnetType } = req.query;
      const result = await describeSubnets(region, vpcId, subnetType);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listBuckets(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listBuckets(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listMSKCluster(req: any, res: any, next: any) {
    try {
      const { region, vpcId } = req.query;
      const result = await listMSKCluster(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeRedshiftClusters(req: any, res: any, next: any) {
    try {
      const { region, vpcId } = req.query;
      const result = await describeRedshiftClusters(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listQuickSightUsers(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listQuickSightUsers(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listRoles(req: any, res: any, next: any) {
    try {
      const { service } = req.query;
      const result = await listRoles(service);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listHostedZones(_req: any, res: any, next: any) {
    try {
      const result = await listHostedZones();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listWorkGroups(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listWorkGroups(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async athenaPing(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await athenaPing(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async mskPing(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await mskPing(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async quicksightPing(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await quickSightPing(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
}
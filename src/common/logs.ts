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

import { Aws, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { getShortIdOfStack } from './stack';

export function createLogGroupWithKmsKey(
  scope: Construct,
  props: {
    prefix?: string;
    retention?: RetentionDays;
  },
) {
  const shortId = getShortIdOfStack(Stack.of(scope));
  const logGroupName = `${props.prefix ?? 'clickstream-loggroup'}-${shortId}`;
  const logGroupKmsKey = new Key(scope, 'LogGroupKmsKey', {
    description: 'KMS key for log group encryption',
    enableKeyRotation: true,
  });
  const logGroup = new LogGroup(scope, 'LogGroup', {
    logGroupName,
    encryptionKey: logGroupKmsKey,
    retention: props.retention ?? RetentionDays.SIX_MONTHS,
  });
  const policyStatement = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
    principals: [new ServicePrincipal('logs.amazonaws.com')],
    resources: ['*'],
    conditions: {
      ArnLike: {
        'kms:EncryptionContext:aws:logs:arn': `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${logGroupName}`,
      },
    },
  });
  logGroupKmsKey.addToResourcePolicy(policyStatement);
  return logGroup;
}

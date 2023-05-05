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

import {
  AutosuggestProps,
  Button,
  Container,
  FormField,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import { getMSKList, getSecurityGroups } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceCreateMehod } from 'ts/const';

interface BufferMSKProps {
  pipelineInfo: IExtPipeline;
  changeSelfHosted: (selfHosted: boolean) => void;
  changeCreateMSKMethod: (type: string) => void;
  changeSelectedMSK: (msk: SelectProps.Option) => void;
  changeMSKTopic: (topic: string) => void;
  changeKafkaBrokers: (brokers: string) => void;
  changeKafkaTopic: (topic: string) => void;
  changeSecurityGroup: (sg: SelectProps.Option) => void;
}

const BufferMSK: React.FC<BufferMSKProps> = (props: BufferMSKProps) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changeSelfHosted,
    changeSelectedMSK,
    changeMSKTopic,
    changeKafkaBrokers,
    changeKafkaTopic,
    changeSecurityGroup,
  } = props;
  const [loadingMSK, setLoadingMSK] = useState(false);
  const [loadingSG, setLoadingSG] = useState(false);
  const [mskOptionList, setMSKOptionList] = useState<AutosuggestProps.Options>(
    []
  );
  const [vpcSGOptionList, setVpcSGOptionList] = useState<SelectProps.Options>(
    []
  );

  // get msk clusters by region
  const getAllMSKClusterList = async () => {
    setLoadingMSK(true);
    try {
      const { success, data }: ApiResponse<MSKResponse[]> = await getMSKList({
        vpcId: pipelineInfo.network.vpcId,
        region: pipelineInfo.region,
      });
      if (success) {
        const mskOptions: AutosuggestProps.Options = data.map((element) => ({
          label: element.name,
          value: element.arn,
          description: element.securityGroupId,
          labelTag: element.type,
          iconAlt: element.arn,
        }));
        setMSKOptionList(mskOptions);
        setLoadingMSK(false);
      }
    } catch (error) {
      setLoadingMSK(false);
    }
  };

  // get Security Groups By VPC
  const getSecurityGroupByVPC = async () => {
    setLoadingSG(true);
    try {
      const { success, data }: ApiResponse<SecurityGroupResponse[]> =
        await getSecurityGroups({
          region: pipelineInfo.region,
          vpcId: pipelineInfo.selectedVPC?.value || '',
        });
      if (success) {
        const sgOptions: SelectProps.Options = data.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: element.description,
        }));
        setVpcSGOptionList(sgOptions);
      }
      setLoadingSG(false);
    } catch (error) {
      setLoadingSG(false);
    }
  };

  useEffect(() => {
    getAllMSKClusterList();
  }, []);

  useEffect(() => {
    if (pipelineInfo.kafkaSelfHost) {
      getSecurityGroupByVPC();
    }
  }, [pipelineInfo.kafkaSelfHost]);

  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.msk.mskCluster')}
        description={t('pipeline:create.msk.mskClusterDesc')}
      />

      <Container disableContentPaddings>
        <Tabs
          onChange={(e) => {
            changeSelfHosted(e.detail.activeTabId === 'manual' ? true : false);
          }}
          activeTabId={pipelineInfo.kafkaSelfHost ? 'manual' : 'select'}
          tabs={[
            {
              label: t('pipeline:create.msk.select'),
              id: 'select',
              content: (
                <div className="plr-20">
                  <SpaceBetween direction="vertical" size="l">
                    {pipelineInfo.mskCreateMethod ===
                      ResourceCreateMehod.EXSITING && (
                      <FormField
                        label={t('pipeline:create.msk.exsitingMSK')}
                        description={t('pipeline:create.msk.exsitingMSKDesc')}
                      >
                        <div className="flex">
                          <div className="flex-1">
                            <Select
                              placeholder={
                                t('pipeline:create.msk.selectMSK') || ''
                              }
                              statusType={loadingMSK ? 'loading' : 'finished'}
                              selectedOption={pipelineInfo.selectedMSK}
                              onChange={({ detail }) =>
                                changeSelectedMSK(detail.selectedOption)
                              }
                              options={mskOptionList}
                              filteringType="auto"
                              selectedAriaLabel="Selected"
                            />
                          </div>
                          <div className="ml-20">
                            <Button
                              loading={loadingMSK}
                              iconName="refresh"
                              onClick={() => {
                                getAllMSKClusterList();
                              }}
                            />
                          </div>
                        </div>
                      </FormField>
                    )}
                    <FormField
                      label={t('pipeline:create.msk.topic')}
                      description={t('pipeline:create.msk.topicDesc')}
                    >
                      <Input
                        placeholder={
                          t('pipeline:create.msk.enterTopicName') || ''
                        }
                        value={pipelineInfo.ingestionServer.sinkKafka.topic}
                        onChange={(e) => {
                          changeMSKTopic(e.detail.value);
                        }}
                      />
                    </FormField>
                  </SpaceBetween>
                </div>
              ),
            },
            {
              label: t('pipeline:create.msk.manual'),
              id: 'manual',
              content: (
                <SpaceBetween direction="vertical" size="l">
                  <div className="plr-20">
                    <SpaceBetween direction="vertical" size="l">
                      <FormField
                        label={t('pipeline:create.msk.brokerLink')}
                        description={t('pipeline:create.msk.brokerLinkDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.brokerLindPlaceHolder') || ''
                          }
                          value={pipelineInfo.kafkaBrokers}
                          onChange={(e) => {
                            changeKafkaBrokers(e.detail.value);
                          }}
                        />
                      </FormField>
                      <FormField
                        label={t('pipeline:create.msk.topic')}
                        description={t('pipeline:create.msk.manualTopicDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.enterTopicName') || ''
                          }
                          value={pipelineInfo.ingestionServer.sinkKafka.topic}
                          onChange={(e) => {
                            changeKafkaTopic(e.detail.value);
                          }}
                        />
                      </FormField>
                      <FormField
                        label={t('pipeline:create.securityGroup')}
                        description={t('pipeline:create.mskSecurityGroupDesc')}
                      >
                        <Select
                          selectedOption={pipelineInfo.selectedSelfHostedMSKSG}
                          options={vpcSGOptionList}
                          placeholder={
                            t('pipeline:create.securityGroupPlaceholder') || ''
                          }
                          selectedAriaLabel="Selected"
                          statusType={loadingSG ? 'loading' : 'finished'}
                          onChange={(e) => {
                            changeSecurityGroup(e.detail.selectedOption);
                          }}
                        />
                      </FormField>
                    </SpaceBetween>
                  </div>
                </SpaceBetween>
              ),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default BufferMSK;

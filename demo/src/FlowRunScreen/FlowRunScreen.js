import React, { useEffect } from 'react';
import { FlatList } from 'react-native';
import { useApiClient } from '../LoginContext';
import LogEntryView from './LogEntryView';
import { useLog } from './useLog';
import SNSMobileSDK from '../../..';

/** @typedef {import('./useLog').LogEntry} LogEntry */
/** @typedef {import('react-native').ListRenderItemInfo} ListRenderItemInfo */

/**
 * @param {ListRenderItemInfo<LogEntry>} itemInfo 
 */
const renderLogEntry = ({ item }) => {
  return <LogEntryView title={item.title} message={item.message} />;
};

/**
 * @param {LogEntry} data 
 */
const keyExtractor = (data) => data.id;

export default function FlowRunScreen({ route }) {
  const apiClient = useApiClient();
  const { externalUserId, levelName, flowName, flowType, testApplicantConf } = route.params;
  const [logEntries, log, clearLog] = useLog();

  useEffect(() => {
    let sdkInstance = null;
    const launchSdk = async () => {
      const accessToken = await apiClient.getAccessToken(externalUserId, levelName, flowType);

      var builder;
      if (levelName) {

        builder = SNSMobileSDK.init(accessToken, () => {
          log('Token expired');
          return apiClient.getAccessToken(externalUserId, levelName, flowType);
        });

        if (apiClient.apiUrl === "https://api.sumsub.com") {
          // prod is the default as from now
        } else if (apiClient.apiUrl === "https://test-api.sumsub.com") {
          builder.onTestEnv()
        } else {
          builder.withBaseUrl(apiClient.apiUrl)
        }

      } else {

        builder = SNSMobileSDK.Builder(apiClient.apiUrl, flowName)
          .withAccessToken(accessToken, () => {
            log('Token expired');
            return apiClient.getAccessToken(externalUserId, levelName, flowType);
          });
      }

      if (testApplicantConf) {
        builder.withApplicantConf({
          "email": "test@test.com",
          "phone": "79211234567"
        });
      }

      sdkInstance = builder
        .withHandlers({
          onLog: ({ message }) => log('onLog: ', message),
          onStatusChanged: (message) => log('onStatusChanged: ', message),
          onEvent: (message) => log('onEvent: ', message),
          onActionResult: (result) => {
            log('onActionResult: ', result)
            return new Promise(resolve => {
              resolve("continue") // or "cancel" to force the user interface to close
            })
          },
        })
        .withDebug(true)
        .build();

      try {
        const result = await sdkInstance.launch();
        log('Got return result', result);
      } catch (error) {
        log(error.message);
      }
    };

    launchSdk();

    return () => {
      clearLog();
      if (sdkInstance) {
        sdkInstance.dismiss();
      }
    };
  }, [externalUserId, flowName, flowType, apiClient, log, clearLog]);

  return <FlatList data={logEntries} keyExtractor={keyExtractor} renderItem={renderLogEntry} />;
}

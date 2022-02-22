import React from 'react';
import PropTypes from 'prop-types';
import { FlatList, Pressable, Text, View, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useFlowsList } from './useFlowsList';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

export default function FlowsList({ externalUserId, testApplicantConf }) {
  const [flowList, levelList, isLoading] = useFlowsList();
  const [showLevels, setShowLevels] = useState(true);
  const navigation = useNavigation();

  const launchSdk = async (levelName, flowName, flowType) => {
    navigation.push('FlowRun', {
      levelName,
      flowName,
      flowType,
      externalUserId,
      testApplicantConf
    });
  };

  const renderFlowItem = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPress={() => launchSdk(null, item.name, item.type)}
      >
        <Text>{item.name}</Text>
      </Pressable>
    );
  };

  const renderLevelItem = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPress={() => launchSdk(item.name, null, item.flowType)}
      >
        <Text>{item.name}</Text>
      </Pressable>
    );
  };

  if (isLoading) {
    return <ActivityIndicator color="#2196f3" size="large" />;
  }
  return (
    showLevels
    ?
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Pick the level:</Text>
        <Button title="Switch to Flows" onPress={() => setShowLevels(false)} />
      </View>
      <FlatList data={levelList} renderItem={renderLevelItem} keyExtractor={(item) => item.id} />
    </View>
    :
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Pick the flow:</Text>
        <Button title="Switch to Levels" onPress={() => setShowLevels(true)} />
      </View>
      <FlatList data={flowList} renderItem={renderFlowItem} keyExtractor={(item) => item.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  titleRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  item: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16, 
  },
  container: {
    flex: 1,
    padding: 0,
  },

  itemPressed: {
    backgroundColor: '#cccccc',
  },
});

FlowsList.propTypes = {
  externalUserId: PropTypes.string.isRequired,
  testApplicantConf: PropTypes.bool
};

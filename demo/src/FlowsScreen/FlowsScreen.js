import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Button } from 'react-native';
import { hri } from 'human-readable-ids';
import FlowsList from './FlowsList';
import ApplicantIdGenerator from './ApplicantIdGenerator';
import OptionSwitch from './OptionSwitch';

export default function FlowsScreen({ navigation }) {
  const [showOptions, setShowOptions] = useState(false);
  const [testApplicantConf, setTestApplicantConf] = useState(false);
  const [externalUserId, setExternalUserId] = useState(hri.random());

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View>
          <Button title="Options" onPress={() => setShowOptions(!showOptions)} />
        </View>
      ),
    })
  }, [navigation, showOptions]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.options, {display: showOptions ? 'flex' : 'none'}]}>
        <OptionSwitch isOn={testApplicantConf} onToggle={setTestApplicantConf} title="Test initial email and phone"/>
      </View>
      <ApplicantIdGenerator id={externalUserId} onNewId={setExternalUserId} />
      <FlowsList 
        externalUserId={externalUserId}
        testApplicantConf={testApplicantConf}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'flex-start'
  },

  options: {
    paddingBottom: 8,
  }
})
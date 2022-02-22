import React, { useState } from "react";
import PropTypes, { bool, string } from 'prop-types';
import { View, Switch, StyleSheet, Text, Pressable } from "react-native";

export default function OptionSwitch({ title, isOn, onToggle }) {
  const [isEnabled, setIsEnabled] = useState(isOn);
  const toggleSwitch = () => setIsEnabled(previousState => {
    onToggle(!previousState)
    return !previousState
  });

  return (
    <View style={styles.container}>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={toggleSwitch}>
        <View style={styles.label}>
            <Text>{title}</Text>
        </View>
        <Switch 
            style={styles.switch}
            onValueChange={toggleSwitch}
            value={isEnabled}
        />
      </Pressable>
    </View>
  );
}

OptionSwitch.propTypes = {
    onToggle: PropTypes.func,
    isOn: bool,
    title: string
};
  
const styles = StyleSheet.create({
  container: {
    display: 'flex',
  },

  switch: {
    flex: 1,
    flexGrow: 1,
    marginTop:3,
    marginBottom: 3,

  },

  label: {
    flexGrow: 2,
    justifyContent: 'center'
  },

  row: {
    flexDirection: 'row',
    width: '100%',
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 16,
    paddingRight: 16
  },

  rowPressed: {
    backgroundColor: '#cccccc',
  },

});
import React from 'react';
import PropTypes, { string } from 'prop-types';
import { Text, TextInput, StyleSheet, View, Button } from 'react-native';
import { hri } from 'human-readable-ids';

export default function ApplicantIdGenerator({ id, onNewId }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>External User Id:</Text>

      <View style={styles.inputRow}>
        <TextInput style={styles.input} autoCorrect={false} value={id} onChangeText={onNewId} />
        <Button title="Generate new" onPress={() => onNewId(hri.random())} />
      </View>
    </View>
  );
}

ApplicantIdGenerator.propTypes = {
  onNewId: PropTypes.func,
  id: string,
};

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10
  },

  inputRow: {
    flexDirection: 'row',
    width: '100%',
  },

  input: {
    borderColor: 'gray',
    height: 40,
    flex: 1,
    paddingLeft: 5,
    borderWidth: 1,
    marginRight: 6
  },
});

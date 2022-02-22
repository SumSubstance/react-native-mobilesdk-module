import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';

const LogEntryView = React.memo(({ title, message }) => {
  var displayMessage = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
  if (displayMessage.length > 4000) { 
    displayMessage = displayMessage.substr(0, 4000) + "..."
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text>{displayMessage}</Text>
    </View>
  );
});

LogEntryView.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderBottomColor: '#cccccc',
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
});

export default LogEntryView;

import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './LoginScreen/LoginScreen';
import FlowsScreen from './FlowsScreen/FlowsScreen';
import FlowsRunScreen from './FlowRunScreen/FlowRunScreen';
import { useLoginContext } from './LoginContext';

const Stack = createStackNavigator();

export default function Navigation() {
  const { isLoggedIn, logout } = useLoginContext();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        headerTitleStyle: {
          alignSelf: 'center',
        },
      }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen
              name="Flows"
              component={FlowsScreen}
              options={{
                title: 'Demo',
                headerRight: () => (
                  <View style={styles.buttonContainer}>
                    <Button title="Logout" color="#ff5f52" onPress={logout} />
                  </View>
                ),
              }}
            />
            <Stack.Screen name="FlowRun" component={FlowsRunScreen} options={{ title: 'Log entries' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={Login} options={{ title: 'Login to Sumsub' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    paddingRight: 6
  },
});

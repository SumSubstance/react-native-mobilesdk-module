import 'react-native-gesture-handler';
import React from 'react';
import { LoginProvider } from './LoginContext';
import Navigation from './Navigation';

const App = () => {
  return (
    <LoginProvider>
      <Navigation />
    </LoginProvider>
  );
};

export default App;

import React, { useState } from "react";
import PropTypes from "prop-types";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { RNCamera } from "react-native-camera";
import { decode as base64Decode } from "base-64";
import { useLoginContext } from "../LoginContext";

function decodeLoginData(barcodeData) {
  try {
    const data = JSON.parse(base64Decode(barcodeData));
    if (data.url && data.t) {
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default function Login() {
  const { login, isRestoring } = useLoginContext();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleBarCode = async (barcode) => {
    if (isLoggingIn) {
      return;
    }
    const loginData = decodeLoginData(barcode.data);
    if (!loginData) {
      return;
    }
    try {
      setIsLoggingIn(true);
      await login(loginData.url, loginData.t, loginData.sbx > 0, loginData.c);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isRestoring || isLoggingIn) {
    return (
      <SafeAreaView style={styles.spinnerContainer}>
        <ActivityIndicator color="#2196f3" size="large" />
        <Text>Please wait</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <RNCamera
        style={styles.camera}
        autoFocus={RNCamera.Constants.AutoFocus.on}
        type={RNCamera.Constants.Type.back}
        captureAudio={false}
        onBarCodeRead={handleBarCode}
      />
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Enable <Text style={{ fontWeight: "bold" }}>msdkLoginQrCode</Text> feature flag, then go to your profile
          settings and scan the QR code.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: "center",
    justifyContent: 'center',
    flex: 1
  },
  safeArea: {
    flex: 1,
    alignItems: "stretch",
    backgroundColor: "white",
  },
  camera: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  hintContainer: {
    padding: 16,
    backgroundColor: "white",
    flex: 0,
  },
  hintText: {
    textAlign: "center",
    fontSize: 16,
  },
});

Login.propTypes = {
  onAuthenticated: PropTypes.func,
};

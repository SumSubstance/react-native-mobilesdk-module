import React, { useState, useContext, useMemo, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-community/async-storage";
import { ApiClient } from "./api";

const STORAGE_KEY = "@AuthData";

/**
 * @typedef {object} LoginContext
 * @property {null|ApiClient} apiClient
 * @property {boolean} isLoggedIn
 * @property {boolean} isRestoring
 * @property {(url: string, authToken: string) => Promise<void>} login
 * @property {() => Promise<void>} logout
 */

const Context = React.createContext();

export function LoginProvider({ children }) {
  const [isRestoring, setIsRestoring] = useState(true);
  const [apiClient, setApiClient] = useState(null);

  const login = useCallback(
    async (url, authToken, isSandbox, clientName) => {
      const client = new ApiClient(url, authToken, isSandbox, clientName);
      try {
        await client.getAuthInfo();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ url, authToken, isSandbox, clientName }));
        setApiClient(new ApiClient(url, authToken, isSandbox, clientName));
      } catch (error) {
        if (error.status !== 401) {
          throw error;
        }
      }
    },
    []
  );

  useEffect(() => {
    async function restoreToken() {
      const rawData = await AsyncStorage.getItem(STORAGE_KEY)
      if (!rawData) {
        return;
      }
      const { url, authToken, isSandbox, clientName } = JSON.parse(rawData);
      await login(url, authToken, isSandbox, clientName);
    }
    setIsRestoring(true);
    restoreToken().finally(() => setIsRestoring(false));
  }, [login]);

  const logout = useCallback(async () => {
    setApiClient(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const loginContext = useMemo(
    () => ({
      apiClient,
      login,
      logout,
      isLoggedIn: apiClient !== null,
      isRestoring,
    }),
    [apiClient, isRestoring, login, logout]
  );
  return <Context.Provider value={loginContext}>{children}</Context.Provider>;
}

/**
 * @returns {LoginContext}
 */
export function useLoginContext() {
  return useContext(Context);
}

/**
 * @returns {ApiClient|null}
 */
export function useApiClient() {
  return useLoginContext().apiClient;
}

import { URL } from "react-native-url-polyfill";
import { Platform } from 'react-native';
import { version } from '../../package.json';

/**
 * @typedef {object} ApiFetchOptions
 * @property {'GET'|'PUT"|'POST'|'DELETE'} [method='GET']
 * @property {object} [queryParameters]
 */

/**
 * @callback ApiFetch
 * @param {string} resource
 * @param {ApiFetchOptions} options
 * @return {Promise<*>}
 */

/**
 * @param {URL} baseUrl
 * @param {string} authToken
 * @param {boolean} isSandbox
 * @param {string} client
 * @return {ApiFetch}
 */
function createApiFetch(baseUrl, authToken, isSandbox, clientName) {

  var headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${authToken}`,
    "X-Client-Id": "msdkDemo",
    "X-Mob-OS": (Platform.OS == "ios" ? "iOS" : (Platform.OS == "android" ? "Android" : Platform.OS)),
    "X-Mob-App": "SumsubRN.demo",
    "X-Mob-App-Ver": version,
  }

  if (isSandbox) {
    headers["Cookie"] = "_ss_route=sbx";
  }
  if (clientName) {
    headers["X-Impersonate"] = encodeURIComponent(clientName);
  }

  return async (resource, { method = "GET", queryParameters = {} } = {}) => {
    const fullUrl = new URL(resource, baseUrl);
    for (const [key, value] of Object.entries(queryParameters)) {
      fullUrl.searchParams.append(key, value);
    }
    const response = await fetch(fullUrl.href, {
      method,
      headers: headers,
    });

    if (!response.ok) {
      const error = new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      error.status = response.status
      throw error
    }

    return response.json();
  };
}

export class ApiClient {
  /**
   * @param {string} url
   * @param {string} authToken
   */
  constructor(url, authToken, isSandbox, clientName) {
    this.apiUrl = url;
    this.isSandbox = isSandbox;
    this.clientName = clientName;

    const resourcesUrl = new URL("/resources/", url);
    this.apiFetch = createApiFetch(resourcesUrl, authToken, isSandbox, clientName);
  }

  async getAuthInfo() {
    return this.apiFetch("auth/info");
  }

  /**
   * @param {string} externalUserId
   * @param {string} flowType
   * @returns {Promise<string>}
   */
  async getAccessToken(externalUserId, levelName, flowType) {

    var params = {
      "userId": externalUserId
    };
    
    if (flowType == "actions") {
      params["externalActionId"] = externalUserId + "-action";
    }

    if (levelName) {
      params["levelName"] = levelName;
    }

    const response = await this.apiFetch("accessTokens", {
      method: "POST",
      queryParameters: params,
    });
    return response.token;
  }

  async fetchLevels() {
    return this.apiFetch("applicants/-/levels");
  }

  async fetchFlows() {
    return this.apiFetch("sdkIntegrations/flows");
  }
}

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// Register the browser redirect handler for Expo Go / dev builds
WebBrowser.maybeCompleteAuthSession();

const hostUri = Constants.expoConfig?.hostUri;
const localIP = hostUri ? hostUri.split(":")[0] : "192.168.96.116";

let resolvedApiUrl = `http://${localIP}:5000`;
if (Platform.OS === 'android' && !Constants.isDevice) {
  resolvedApiUrl = "http://localhost:5000";
} else if (Platform.OS === 'ios' && !Constants.isDevice) {
  resolvedApiUrl = "http://127.0.0.1:5000";
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || resolvedApiUrl;

export const OAUTH_CALLBACK_SCHEME = "wastoo";
export const OAUTH_CALLBACK_PATH = "auth/oauth-callback";

/**
 * Opens the backend Facebook OAuth flow in the system browser.
 */
export async function openFacebookOAuth(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const redirectUri = Linking.createURL(OAUTH_CALLBACK_PATH);
  const authUrl = `${API_URL}/auth/facebook?client=mobile`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== "success") {
      return null;
    }

    const parsed = Linking.parse(result.url);
    const params = parsed.queryParams as Record<string, string> | undefined;

    const accessToken = params?.accessToken;
    const refreshToken = params?.refreshToken;

    if (!accessToken || !refreshToken) {
      console.error(
        "[FacebookOAuth] Callback URL missing tokens. Received URL:",
        result.url
      );
      return null;
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("[FacebookOAuth] Failed to open auth session:", error);
    return null;
  }
}

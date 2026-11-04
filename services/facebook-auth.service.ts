import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL } from "../lib/api";

// Register the browser redirect handler for Expo Go / dev builds
WebBrowser.maybeCompleteAuthSession();

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

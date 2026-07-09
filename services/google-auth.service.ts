import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// Register the browser redirect handler for Expo Go / dev builds
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.9:3000";

// The deep-link URL the backend must redirect to after OAuth success.
// Matches the `wastoo://` scheme defined in app.json
export const OAUTH_CALLBACK_SCHEME = "wastoo";
export const OAUTH_CALLBACK_PATH = "auth/oauth-callback";

/**
 * Opens the backend Google OAuth flow in the system browser.
 *
 * Flow:
 *  1. App opens  GET /auth/google?state=mobile  in a browser tab.
 *  2. User signs in with Google.
 *  3. Backend validates, creates JWT tokens, and redirects to:
 *       wastoo://auth/oauth-callback?accessToken=<TOKEN>&refreshToken=<RTOKEN>
 *  4. Expo intercepts the deep-link and WebBrowser.openAuthSessionAsync resolves.
 *  5. We parse the URL and return the tokens to the caller.
 *
 * IMPORTANT: In your backend .env set:
 *   MOBILE_URL=wastoo://
 * And update the callback to append tokens as query params:
 *   res.redirect(`${mobileUrl}auth/oauth-callback?accessToken=${token.accessToken}&refreshToken=${token.refreshToken}`);
 */
export async function openGoogleOAuth(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  // The redirect URI that the backend should send the user back to
  const redirectUri = Linking.createURL(OAUTH_CALLBACK_PATH);

  // The backend OAuth start URL – pass state=mobile so the server knows
  // to redirect back to the mobile deep-link instead of the web frontend.
  const authUrl = `${API_URL}/auth/google?state=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== "success") {
      // User cancelled or an error occurred in the browser
      return null;
    }

    // Parse query params from the returned deep-link URL
    const parsed = Linking.parse(result.url);
    const params = parsed.queryParams as Record<string, string> | undefined;

    const accessToken = params?.accessToken;
    const refreshToken = params?.refreshToken;

    if (!accessToken || !refreshToken) {
      console.error(
        "[GoogleOAuth] Callback URL missing tokens. Received URL:",
        result.url
      );
      return null;
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("[GoogleOAuth] Failed to open auth session:", error);
    return null;
  }
}

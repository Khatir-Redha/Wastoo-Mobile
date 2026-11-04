import axios from "axios";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL } from "../lib/api";

WebBrowser.maybeCompleteAuthSession();

export const OAUTH_CALLBACK_SCHEME = "wastoo";
export const OAUTH_CALLBACK_PATH = "auth/callback";
export const OAUTH_CALLBACK_URL = `${OAUTH_CALLBACK_SCHEME}://${OAUTH_CALLBACK_PATH}`;

const STATE_KEY = "google_oauth_state";
const VERIFIER_KEY = "google_oauth_verifier";

const randomHex = async (size: number) =>
  Array.from(await Crypto.getRandomBytesAsync(size))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * Opens Google's backend-mediated OAuth flow. Only a short-lived code and
 * state are returned through the app link; the verifier remains in SecureStore.
 */
export async function openGoogleOAuth(): Promise<{
  code: string;
  state: string;
} | null> {
  const state = await randomHex(32);
  const verifier = await randomHex(32);
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  await SecureStore.setItemAsync(STATE_KEY, state);
  await SecureStore.setItemAsync(VERIFIER_KEY, verifier);

  try {
    const authUrl =
      `${API_URL}/auth/google?client=mobile` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(challenge)}`;
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      OAUTH_CALLBACK_URL,
    );

    if (result.type !== "success") {
      await clearPendingGoogleOAuth();
      return null;
    }

    const parsed = Linking.parse(result.url);
    const params = parsed.queryParams as Record<string, string> | undefined;
    const code = params?.code;
    const returnedState = params?.state;

    if (
      parsed.scheme !== OAUTH_CALLBACK_SCHEME ||
      parsed.hostname !== "auth" ||
      parsed.path !== "callback" ||
      typeof code !== "string" ||
      typeof returnedState !== "string" ||
      returnedState !== state
    ) {
      await clearPendingGoogleOAuth();
      throw new Error("Google sign-in returned an invalid callback.");
    }

    return { code, state: returnedState };
  } catch (error) {
    await clearPendingGoogleOAuth();
    throw error;
  }
}

export async function exchangeGoogleOAuthCode(
  code: string,
  state: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [expectedState, verifier] = await Promise.all([
    SecureStore.getItemAsync(STATE_KEY),
    SecureStore.getItemAsync(VERIFIER_KEY),
  ]);

  if (
    !expectedState ||
    expectedState !== state ||
    !verifier ||
    !/^[a-f0-9]{64}$/.test(code)
  ) {
    await clearPendingGoogleOAuth();
    throw new Error("This Google sign-in link is invalid or has expired.");
  }

  try {
    const response = await axios.post(
      `${API_URL}/auth/google/exchange`,
      { code, state, codeVerifier: verifier },
      { timeout: 10000 },
    );

    const accessToken = response.data?.accessToken;
    const refreshToken = response.data?.refreshToken;
    if (
      typeof accessToken !== "string" ||
      typeof refreshToken !== "string" ||
      !accessToken ||
      !refreshToken
    ) {
      throw new Error(
        "The server returned an invalid Google sign-in response.",
      );
    }

    return { accessToken, refreshToken };
  } finally {
    await clearPendingGoogleOAuth();
  }
}

export async function clearPendingGoogleOAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(STATE_KEY),
    SecureStore.deleteItemAsync(VERIFIER_KEY),
  ]);
}

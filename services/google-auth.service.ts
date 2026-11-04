import axios from "axios";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL } from "../lib/api";
import {
  decodeJwtIdentity,
  withAuthCredentialWrite,
} from "../lib/auth-session";

WebBrowser.maybeCompleteAuthSession();

export const OAUTH_CALLBACK_SCHEME = "wastoo";
export const OAUTH_CALLBACK_PATH = "auth/callback";
export const OAUTH_CALLBACK_URL = `${OAUTH_CALLBACK_SCHEME}://${OAUTH_CALLBACK_PATH}`;

const STATE_KEY = "google_oauth_state";
const VERIFIER_KEY = "google_oauth_verifier";
const ATTEMPT_KEY = "google_oauth_attempt";

const logGoogleAuth = (
  stage: string,
  attemptId: string,
  details: Record<string, unknown> = {},
) => {
  if (__DEV__) console.info("[GoogleAuth]", { stage, attemptId, ...details });
};

const randomHex = async (size: number) =>
  Array.from(await Crypto.getRandomBytesAsync(size))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * Opens Google's backend-mediated OAuth flow. Only a short-lived code and
 * state are returned through the app link; the verifier remains in SecureStore.
 */
export async function openGoogleOAuth(
  attemptId: string,
  isCurrentAttempt: () => boolean,
): Promise<{
  code: string;
  state: string;
  attemptId: string;
} | null> {
  if (!attemptId) {
    throw new Error("A Google sign-in attempt ID is required.");
  }
  const state = await randomHex(32);
  const verifier = await randomHex(32);
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  if (!isCurrentAttempt()) {
    throw new Error("A newer sign-in attempt has replaced this one.");
  }
  await withAuthCredentialWrite(async () => {
    if (!isCurrentAttempt()) {
      throw new Error("A newer sign-in attempt has replaced this one.");
    }
    await SecureStore.setItemAsync(STATE_KEY, state);
    await SecureStore.setItemAsync(VERIFIER_KEY, verifier);
    await SecureStore.setItemAsync(ATTEMPT_KEY, attemptId);
  });

  try {
    if (!isCurrentAttempt()) {
      await clearPendingGoogleOAuth(attemptId);
      throw new Error("A newer sign-in attempt has replaced this one.");
    }
    const authUrl =
      `${API_URL}/auth/google?client=mobile` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&attempt_id=${encodeURIComponent(attemptId)}` +
      `&prompt=select_account`;
    logGoogleAuth("BROWSER_AUTHENTICATION_OPENED", attemptId);
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      OAUTH_CALLBACK_URL,
    );

    if (result.type !== "success") {
      await clearPendingGoogleOAuth(attemptId);
      return null;
    }
    logGoogleAuth("CALLBACK_RECEIVED", attemptId, { source: "browser-result" });

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
      await clearPendingGoogleOAuth(attemptId);
      throw new Error("Google sign-in returned an invalid callback.");
    }

    return { code, state: returnedState, attemptId };
  } catch (error) {
    await clearPendingGoogleOAuth(attemptId);
    throw error;
  }
}

export async function getGoogleOAuthAttemptId(state: string) {
  const [expectedState, attemptId] = await Promise.all([
    SecureStore.getItemAsync(STATE_KEY),
    SecureStore.getItemAsync(ATTEMPT_KEY),
  ]);
  return expectedState === state && attemptId ? attemptId : null;
}

export async function exchangeGoogleOAuthCode(
  code: string,
  state: string,
  attemptId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [expectedState, verifier, storedAttemptId] = await Promise.all([
    SecureStore.getItemAsync(STATE_KEY),
    SecureStore.getItemAsync(VERIFIER_KEY),
    SecureStore.getItemAsync(ATTEMPT_KEY),
  ]);

  if (
    !expectedState ||
    expectedState !== state ||
    !verifier ||
    storedAttemptId !== attemptId ||
    !/^[a-f0-9]{64}$/.test(code)
  ) {
    await clearPendingGoogleOAuth(attemptId);
    throw new Error("This Google sign-in link is invalid or has expired.");
  }

  try {
    const apiEndpoint = new URL(`${API_URL}/auth/google/exchange`);
    logGoogleAuth("AUTHORIZATION_CODE_EXCHANGE_HTTP_STARTED", attemptId, {
      host: apiEndpoint.host,
      path: apiEndpoint.pathname,
    });
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

    logGoogleAuth("AUTHORIZATION_CODE_EXCHANGE_HTTP_COMPLETED", attemptId, {
      jwtIdentity: decodeJwtIdentity(accessToken),
    });
    return { accessToken, refreshToken };
  } finally {
    await clearPendingGoogleOAuth(attemptId);
  }
}

export async function clearPendingGoogleOAuth(attemptId?: string) {
  await withAuthCredentialWrite(async () => {
    if (attemptId) {
      const storedAttemptId = await SecureStore.getItemAsync(ATTEMPT_KEY);
      if (storedAttemptId !== attemptId) return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(STATE_KEY),
      SecureStore.deleteItemAsync(VERIFIER_KEY),
      SecureStore.deleteItemAsync(ATTEMPT_KEY),
    ]);
  });
}

export async function clearGoogleOAuthAttempt(attemptId: string | null) {
  if (attemptId) await clearPendingGoogleOAuth(attemptId);
}

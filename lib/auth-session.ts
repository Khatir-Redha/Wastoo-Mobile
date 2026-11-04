let generation = 0;
let credentialWrites = Promise.resolve();
let profileRequestSequence = 0;
let activeProfileRequestId = 0;

export type JwtIdentity = {
  id?: number;
  sub?: string | number;
  iss?: string;
  aud?: string | string[];
};

export const decodeJwtIdentity = (token: string): JwtIdentity | null => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload || typeof globalThis.atob !== "function") return null;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = globalThis.atob(
      base64.padEnd(Math.ceil(base64.length / 4) * 4, "="),
    );
    const utf8 = decodeURIComponent(
      Array.from(
        binary,
        (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
      ).join(""),
    );
    const claims: unknown = JSON.parse(utf8);
    if (typeof claims !== "object" || claims === null) return null;
    const payload = claims as Record<string, unknown>;
    const audience = payload.aud;
    return {
      ...(typeof payload.id === "number" ? { id: payload.id } : {}),
      ...(typeof payload.sub === "string" || typeof payload.sub === "number"
        ? { sub: payload.sub }
        : {}),
      ...(typeof payload.iss === "string" ? { iss: payload.iss } : {}),
      ...(typeof audience === "string" ||
      (Array.isArray(audience) &&
        audience.every((entry) => typeof entry === "string"))
        ? { aud: audience as string | string[] }
        : {}),
    };
  } catch {
    return null;
  }
};

export const getAuthSessionGeneration = () => generation;
export const isCurrentAuthSessionGeneration = (requestGeneration: number) =>
  requestGeneration === generation;

export const beginProfileRequest = () => {
  profileRequestSequence += 1;
  activeProfileRequestId = profileRequestSequence;
  return activeProfileRequestId;
};

export const isCurrentProfileRequest = (requestId: number) =>
  requestId === activeProfileRequestId;

export const invalidateProfileRequests = () => {
  profileRequestSequence += 1;
  activeProfileRequestId = profileRequestSequence;
};

export const advanceAuthSessionGeneration = (reason: string) => {
  generation += 1;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[Auth]", {
      stage: "SESSION_GENERATION_CHANGED",
      generation,
      reason,
    });
  }
  return generation;
};

export class OAuthAttemptLifecycle {
  private sequence = 0;
  private activeAttemptId: string | null = null;
  private readonly invalidatedAttemptIds = new Set<string>();

  start() {
    this.sequence += 1;
    this.activeAttemptId = `oauth-${Date.now()}-${this.sequence}`;
    return this.activeAttemptId;
  }

  adopt(attemptId: string) {
    if (this.invalidatedAttemptIds.has(attemptId)) return false;
    if (!this.activeAttemptId) this.activeAttemptId = attemptId;
    return this.activeAttemptId === attemptId;
  }

  isCurrent(attemptId: string) {
    return this.activeAttemptId === attemptId;
  }

  invalidate() {
    const invalidatedAttemptId = this.activeAttemptId;
    if (invalidatedAttemptId) {
      this.invalidatedAttemptIds.add(invalidatedAttemptId);
    }
    this.activeAttemptId = null;
    return invalidatedAttemptId;
  }
}

type OAuthCallbackEntry<T> = {
  state: string;
  attemptId: string;
  promise: Promise<T>;
};

export class OAuthCallbackDeduplicator<T> {
  private readonly callbacks = new Map<string, OAuthCallbackEntry<T>>();

  find(
    code: string,
    state: string,
    isCurrentAttempt: (attemptId: string) => boolean,
  ) {
    const entry = this.callbacks.get(code);
    if (!entry) return undefined;
    if (entry.state !== state) {
      throw new Error(
        "This Google sign-in callback does not match its attempt.",
      );
    }
    if (!isCurrentAttempt(entry.attemptId)) {
      throw new Error("This Google sign-in attempt was superseded.");
    }
    return entry.promise;
  }

  run(
    code: string,
    state: string,
    attemptId: string,
    isCurrentAttempt: (attemptId: string) => boolean,
    exchange: () => Promise<T>,
  ) {
    const existing = this.find(code, state, isCurrentAttempt);
    if (existing) return existing;

    const promise = Promise.resolve().then(exchange);
    this.callbacks.set(code, { state, attemptId, promise });
    return promise;
  }

  clear() {
    this.callbacks.clear();
  }
}

export const withAuthCredentialWrite = async <T>(
  write: () => Promise<T>,
): Promise<T> => {
  const pendingWrite = credentialWrites.then(write, write);
  credentialWrites = pendingWrite.then(
    () => undefined,
    () => undefined,
  );
  return pendingWrite;
};

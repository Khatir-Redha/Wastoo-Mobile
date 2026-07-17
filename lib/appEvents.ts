// Lightweight cross-module event bus. Works on React Native (no `window`)
// and web. Used to signal app-wide events like session expiry.
// Avoids importing Node's "events" module, which is unavailable in the
// native React runtime.

type Handler = (...args: any[]) => void;

class AppEventEmitter {
  private handlers: Map<string, Set<Handler>> = new Map();

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

export const appEvents = new AppEventEmitter();

export const APP_EVENTS = {
  SESSION_EXPIRED: "auth:session-expired",
} as const;

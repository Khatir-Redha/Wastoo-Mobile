/**
 * OSRM Routing Service
 *
 * Uses the OSRM public demo server for development.
 * For production, replace OSRM_BASE_URL with a self-hosted
 * or paid OSRM-compatible routing endpoint.
 *
 * Coordinate order: OSRM uses longitude,latitude.
 */

// ⚠️ The public OSRM demo server is rate-limited and NOT suitable for production.
// Configure your own OSRM instance or a compatible provider for production use.
const OSRM_BASE_URL =
  process.env.EXPO_PUBLIC_OSRM_URL || "https://router.project-osrm.org";

export interface RouteCoordinate {
  longitude: number;
  latitude: number;
}

export interface RouteResult {
  /** GeoJSON LineString coordinates: [lng, lat][] */
  geometry: [number, number][];
  /** Distance in meters */
  distanceMeters: number;
  /** Duration in seconds */
  durationSeconds: number;
}

export interface RouteError {
  type: "NO_ROUTE" | "NETWORK" | "INVALID_RESPONSE" | "RATE_LIMITED";
  message: string;
}

class RoutingService {
  private static abortController: AbortController | null = null;

  /**
   * Cancel any pending route request.
   */
  static cancelPendingRequest(): void {
    if (RoutingService.abortController) {
      RoutingService.abortController.abort();
      RoutingService.abortController = null;
    }
  }

  /**
   * Request a driving route between two points.
   * Uses OSRM Route service v1 with GeoJSON geometry.
   *
   * @see https://project-osrm.org/docs/v5.24.0/api/#route-service
   */
  static async getRoute(
    origin: RouteCoordinate,
    destination: RouteCoordinate
  ): Promise<{ ok: true; data: RouteResult } | { ok: false; error: RouteError }> {
    // Cancel any previous pending request
    RoutingService.cancelPendingRequest();

    // Validate coordinates
    if (
      !isFinite(origin.longitude) ||
      !isFinite(origin.latitude) ||
      !isFinite(destination.longitude) ||
      !isFinite(destination.latitude)
    ) {
      return {
        ok: false,
        error: {
          type: "INVALID_RESPONSE",
          message: "Invalid coordinates provided.",
        },
      };
    }

    const controller = new AbortController();
    RoutingService.abortController = controller;

    // OSRM coordinate order: longitude,latitude
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      // Check for rate limiting
      if (response.status === 429) {
        return {
          ok: false,
          error: {
            type: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          error: {
            type: "NETWORK",
            message: `Routing server returned ${response.status}.`,
          },
        };
      }

      const json = await response.json();

      // OSRM returns code: "Ok" on success
      if (json.code !== "Ok") {
        return {
          ok: false,
          error: {
            type: "NO_ROUTE",
            message:
              json.message || "No route could be found between these locations.",
          },
        };
      }

      const route = json.routes?.[0];
      if (!route || !route.geometry?.coordinates?.length) {
        return {
          ok: false,
          error: {
            type: "INVALID_RESPONSE",
            message: "Route response did not contain valid geometry.",
          },
        };
      }

      return {
        ok: true,
        data: {
          geometry: route.geometry.coordinates as [number, number][],
          distanceMeters: route.distance ?? 0,
          durationSeconds: route.duration ?? 0,
        },
      };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return {
          ok: false,
          error: {
            type: "NETWORK",
            message: "Route request was cancelled.",
          },
        };
      }

      return {
        ok: false,
        error: {
          type: "NETWORK",
          message: "Unable to reach the routing server. Check your connection.",
        },
      };
    } finally {
      // Clean up if this is still the active controller
      if (RoutingService.abortController === controller) {
        RoutingService.abortController = null;
      }
    }
  }
}

// ── Formatting helpers ──────────────────────────────────────────

/** Format meters into a human-readable distance string */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

/** Format seconds into a human-readable duration string */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "< 1 min";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

export default RoutingService;

/**
 * Map Configuration
 *
 * Map style uses OpenFreeMap Positron — a clean, light vector map
 * derived from OpenStreetMap data, free and open-source.
 * - No API key required
 * - No rate limits for reasonable usage
 * - Attribution: © OpenMapTiles © OpenStreetMap contributors
 *
 * @see https://openfreemap.org
 *
 * For production with heavy traffic, consider self-hosting the tile stack
 * or switching to a paid provider like MapTiler or Stadia Maps.
 */

// ── Map Style ──────────────────────────────────────────────────
// OpenFreeMap Positron: a clean, light, Google-Maps-like vector style
// with street names, building footprints, parks, POI labels, and clear road hierarchy.
export const MAPLIBRE_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

// Keep the old raster style as a fallback if the vector style fails
export const MAPLIBRE_STYLE_FALLBACK = {
  version: 8 as const,
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm-tiles",
    },
  ],
};

// Legacy export for backwards compatibility (old raster style object)
export const MAPLIBRE_STYLE = MAPLIBRE_STYLE_FALLBACK;

// ── Default Camera ──────────────────────────────────────────────

export const DEFAULT_CAMERA = {
  center: {
    latitude: 24.4539,
    longitude: 54.3773,
  },
  zoom: 14.5,
};

// ── Map Attribution ──────────────────────────────────────────────

export const MAP_ATTRIBUTION =
  "© OpenMapTiles © OpenStreetMap contributors";

// ── Helpers ──────────────────────────────────────────────────────

export function regionToCamera(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): { center: { latitude: number; longitude: number }; zoom: number } {
  const avgDelta = (region.latitudeDelta + region.longitudeDelta) / 2;
  const zoom = Math.max(2, Math.min(22, 14 - Math.log2(avgDelta)));
  return {
    center: {
      latitude: region.latitude,
      longitude: region.longitude,
    },
    zoom,
  };
}

export function deltaToZoom(delta: number): number {
  return Math.max(2, Math.min(22, 14 - Math.log2(delta)));
}

import { useEffect, useState } from "react";
import { type StyleSpecification } from "@maplibre/maplibre-react-native";
import { MAPLIBRE_STYLE_URL } from "../components/map/mapConfig";

type MapStyleState = {
  style: StyleSpecification | null;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStyleSpecification(value: unknown): value is StyleSpecification {
  if (!isRecord(value) || value.version !== 8 || !isRecord(value.sources)) {
    return false;
  }

  return Array.isArray(value.layers);
}

function normalizeMapTilerStyle(style: StyleSpecification): StyleSpecification {
  const sources = { ...style.sources } as Record<string, unknown>;
  const attributionSource = sources.maptiler_attribution;

  if (isRecord(attributionSource)) {
    const hasTiles =
      Array.isArray(attributionSource.tiles) &&
      attributionSource.tiles.some(
        (tile) => typeof tile === "string" && tile.length > 0
      );
    const hasTileJson =
      typeof attributionSource.url === "string" &&
      attributionSource.url.length > 0;

    if (!hasTiles && !hasTileJson) {
      const planetSource = sources.maptiler_planet;
      const planetTileJson =
        isRecord(planetSource) && typeof planetSource.url === "string"
          ? planetSource.url
          : null;

      if (
        attributionSource.type !== "vector" ||
        typeof attributionSource.attribution !== "string" ||
        !planetTileJson
      ) {
        throw new Error(
          "MapTiler returned an attribution source without a valid vector TileJSON source."
        );
      }

      sources.maptiler_attribution = {
        ...attributionSource,
        url: planetTileJson,
      };
    }
  }

  for (const [sourceId, source] of Object.entries(sources)) {
    if (!isRecord(source)) {
      throw new Error(`Map style source "${sourceId}" is not an object.`);
    }
    const hasTiles =
      Array.isArray(source.tiles) &&
      source.tiles.some((tile) => typeof tile === "string" && tile.length > 0);
    const hasTileJson = typeof source.url === "string" && source.url.length > 0;
    if (!hasTiles && !hasTileJson) {
      throw new Error(
        `Map style source "${sourceId}" has neither tiles nor a TileJSON URL.`
      );
    }
  }

  return { ...style, sources } as StyleSpecification;
}

async function fetchMapTilerStyle(): Promise<StyleSpecification> {
  if (!MAPLIBRE_STYLE_URL) {
    throw new Error(
      "Configure EXPO_PUBLIC_MAPTILER_API_KEY to load the map."
    );
  }

  const response = await fetch(MAPLIBRE_STYLE_URL);
  if (!response.ok) {
    throw new Error(`MapTiler style request failed (HTTP ${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("MapTiler returned a response that is not valid JSON.");
  }

  if (!isStyleSpecification(payload)) {
    throw new Error("MapTiler did not return a valid MapLibre style document.");
  }

  return normalizeMapTilerStyle(payload);
}

export function useMapTilerStyle(enabled = true) {
  const [state, setState] = useState<MapStyleState>({
    style: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    fetchMapTilerStyle()
      .then((style) => {
        if (active) setState({ style, error: null });
      })
      .catch((error: unknown) => {
        console.warn("Could not load a valid MapTiler style.", error);
        if (active) {
          setState({
            style: null,
            error:
              error instanceof Error
                ? error.message
                : "Could not load the map style.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}

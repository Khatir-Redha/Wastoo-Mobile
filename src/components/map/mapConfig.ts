const mapTilerApiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();

export const MAPLIBRE_STYLE_URL = mapTilerApiKey
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerApiKey)}`
  : null;

export const ALGERIA_OVERVIEW = {
  center: {
    latitude: 28,
    longitude: 3,
  },
  zoom: 4.3,
};

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

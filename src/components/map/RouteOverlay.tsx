import React from "react";
import { View, StyleSheet } from "react-native";
import { GeoJSONSource, Layer, Marker } from "@maplibre/maplibre-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteResult } from "../../../services/routing.service";

interface RouteOverlayProps {
  route: RouteResult;
  originCoordinate: { longitude: number; latitude: number };
  destinationCoordinate: { longitude: number; latitude: number };
}

/**
 * Renders a road-following route on the map using GeoJSONSource + Layer.
 * Shows a Wastoo emerald route line with a darker casing underneath for contrast,
 * plus distinct origin (pulsing blue dot) and destination (emerald pin) markers.
 */
export default function RouteOverlay({
  route,
  originCoordinate,
  destinationCoordinate,
}: RouteOverlayProps) {
  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route.geometry,
        },
      },
    ],
  };

  return (
    <>
      {/* Route line source */}
      <GeoJSONSource id="wastoo-route-source" data={routeGeoJSON}>
        {/* Casing layer — dark border beneath the route for crisp contrast */}
        <Layer
          id="wastoo-route-casing"
          type="line"
          paint={{
            "line-width": 8,
            "line-color": "#045439",
            "line-opacity": 0.45,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
        {/* Main route line — Wastoo emerald */}
        <Layer
          id="wastoo-route-line"
          type="line"
          paint={{
            "line-width": 5,
            "line-color": "#087F5B",
            "line-opacity": 0.95,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </GeoJSONSource>

      {/* Origin marker — "You are here" blue dot */}
      <Marker
        id="wastoo-route-origin"
        lngLat={[originCoordinate.longitude, originCoordinate.latitude]}
      >
        <View style={styles.originMarkerOuter}>
          <View style={styles.originMarkerInner} />
        </View>
      </Marker>

      {/* Destination marker — emerald pin with shadow */}
      <Marker
        id="wastoo-route-destination"
        lngLat={[
          destinationCoordinate.longitude,
          destinationCoordinate.latitude,
        ]}
      >
        <View style={styles.destinationContainer}>
          <View style={styles.destinationPin}>
            <MaterialCommunityIcons
              name="flag-checkered"
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.destinationPointer} />
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  originMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  originMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  destinationContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  destinationPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#087F5B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  destinationPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#087F5B",
    marginTop: -2,
  },
});

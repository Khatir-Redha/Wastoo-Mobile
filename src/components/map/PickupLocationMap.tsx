import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Map,
  UserLocation,
  Marker,
  Camera,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ALGERIA_OVERVIEW,
} from "./mapConfig";
import {
  getLocationIssueMessage,
  useDeviceLocation,
} from "../../hooks/useDeviceLocation";
import { useMapTilerStyle } from "../../hooks/useMapTilerStyle";
import { theme } from "../../theme/tokens";

export type PickupLocation = {
  latitude: number;
  longitude: number;
  address?: string | null;
};

type Props = {
  backendLocation?: PickupLocation | null;
  onLocationSelect?: (location: PickupLocation) => void;
};

export default function PickupLocationMap({
  backendLocation,
  onLocationSelect,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);

  const {
    location: deviceLocation,
    issue: locationIssue,
    isLoading: isLocating,
    requestLocation,
  } = useDeviceLocation();
  const { style: mapStyle, error: mapStyleError } = useMapTilerStyle();
  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(
    backendLocation ?? null
  );
  const [locationNote, setLocationNote] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const updateLocation = useCallback(
    (location: PickupLocation) => {
      setSelectedLocation(location);
      onLocationSelect?.(location);
    },
    [onLocationSelect]
  );

  useEffect(() => {
    if (backendLocation) {
      updateLocation(backendLocation);
      setLocationNote("");
    } else if (deviceLocation) {
      updateLocation({
        latitude: deviceLocation.coords.latitude,
        longitude: deviceLocation.coords.longitude,
      });
      setLocationNote("");
    } else if (locationIssue) {
      setLocationNote(getLocationIssueMessage(locationIssue, false));
    }
  }, [backendLocation, deviceLocation, locationIssue, updateLocation]);

  useEffect(() => {
    if (!mapReady) return;

    const center: [number, number] | null = backendLocation
      ? [backendLocation.longitude, backendLocation.latitude]
      : deviceLocation
        ? [deviceLocation.coords.longitude, deviceLocation.coords.latitude]
        : null;
    if (!center) return;

    cameraRef.current?.flyTo({
      center,
      zoom: 14.5,
      duration: 600,
    });
  }, [backendLocation, deviceLocation, mapReady]);

  const useCurrentLocation = async () => {
    const position = await requestLocation();

    if (position) {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      updateLocation(coords);
      setLocationNote("");
    }
  };

  const useSavedLocation = () => {
    if (!backendLocation) {
      Alert.alert("No Saved Location", "No prior location was saved.");
      return;
    }
    updateLocation(backendLocation);
    if (mapReady) {
      cameraRef.current?.flyTo({
        center: [backendLocation.longitude, backendLocation.latitude],
        zoom: 15,
        duration: 500,
      });
    }
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn("Could not open Wastoo app settings.", error);
      Alert.alert("Settings unavailable", "Open Wastoo's settings from Android Settings.");
    }
  };

  const handleMapPress = (event: {
    nativeEvent?: {
      lngLat?: number[];
      geometry?: { coordinates?: number[] };
    };
    lngLat?: number[];
  }) => {
    const coords =
      event.nativeEvent?.lngLat ||
      event.lngLat ||
      event.nativeEvent?.geometry?.coordinates;

    if (coords && Array.isArray(coords) && coords.length >= 2) {
      const [longitude, latitude] = coords;
      if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        return;
      }
      updateLocation({ latitude, longitude });
      setLocationNote("");
      cameraRef.current?.easeTo({
        center: [longitude, latitude],
        duration: 300,
      });
    }
  };

  const currentCenter: [number, number] = selectedLocation
    ? [selectedLocation.longitude, selectedLocation.latitude]
    : deviceLocation
      ? [deviceLocation.coords.longitude, deviceLocation.coords.latitude]
      : [ALGERIA_OVERVIEW.center.longitude, ALGERIA_OVERVIEW.center.latitude];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={20}
            color={theme.colors.emerald[600]}
          />
          <Text style={styles.title}>Pickup Location</Text>
        </View>

        <View style={styles.actions}>
          {locationIssue === "permission-blocked" ? (
            <TouchableOpacity
              onPress={() => void openAppSettings()}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          ) : null}

          {backendLocation ? (
            <TouchableOpacity
              onPress={useSavedLocation}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>Use saved</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={useCurrentLocation}
            style={styles.actionBtn}
            activeOpacity={0.7}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={theme.colors.emerald[600]} />
            ) : (
              <Text style={styles.actionText}>Use GPS</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {mapStyle ? (
          <View style={styles.map}>
            <Map
              style={styles.mapElement}
              mapStyle={mapStyle}
              attribution
              logo={false}
              compass={false}
              onDidFinishLoadingMap={() => setMapReady(true)}
              onDidFailLoadingMap={() => {
                console.warn("MapTiler map style failed to load.");
                setMapLoadError(true);
              }}
              onPress={handleMapPress}
            >
              <Camera
                ref={cameraRef}
                initialViewState={{
                  center: currentCenter,
                  zoom:
                    selectedLocation || deviceLocation
                      ? 14.5
                      : ALGERIA_OVERVIEW.zoom,
                }}
                maxZoom={19}
              />

              {deviceLocation && <UserLocation animated accuracy />}

              {selectedLocation ? (
                <Marker
                  id="selected-pickup-pin"
                  lngLat={[
                    selectedLocation.longitude,
                    selectedLocation.latitude,
                  ]}
                >
                  <View style={styles.pinContainer}>
                    <View style={styles.pinBubble}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.pinPointer} />
                  </View>
                </Marker>
              ) : null}
            </Map>
          </View>
        ) : (
          <View style={[styles.map, styles.mapUnavailable]}>
            <Text style={styles.mapUnavailableText}>
              {mapStyleError ?? "Loading MapTiler map style…"}
            </Text>
          </View>
        )}

        {mapLoadError ? (
          <Text style={styles.noteText}>
            Map tiles could not load. Check your internet connection and MapTiler API key.
          </Text>
        ) : null}

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={14}
              color={theme.colors.emerald[600]}
            />
            <Text style={styles.coordsText}>
              {selectedLocation
                ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`
                : "Tap the map to set pickup location"}
            </Text>
          </View>

          {locationNote ? (
            <Text style={styles.noteText}>{locationNote}</Text>
          ) : (
            <Text style={styles.subtext}>
              Tap anywhere on the map to change the pickup spot.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    overflow: "hidden",
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    backgroundColor: theme.colors.emerald[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.emerald[100],
  },
  actionText: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.emerald[700],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  mapWrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  map: {
    height: 220,
  },
  mapUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: theme.colors.canvas.secondary,
  },
  mapUnavailableText: {
    color: theme.colors.text.secondary,
    textAlign: "center",
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  mapElement: {
    flex: 1,
  },
  pinContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pinBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.emerald[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: theme.colors.emerald[500],
    marginTop: -2,
  },
  infoBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.canvas.primary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordsText: {
    fontSize: theme.typography.fontSize.sm.size,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  noteText: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.medium,
  },
  subtext: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.fontFamily.regular,
  },
});

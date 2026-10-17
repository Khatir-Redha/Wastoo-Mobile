import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  Map,
  UserLocation,
  Marker,
  Camera,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  MAPLIBRE_STYLE_URL,
  MAPLIBRE_STYLE_FALLBACK,
} from "./mapConfig";
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

const DEFAULT_COORDS = {
  latitude: 24.4539,
  longitude: 54.3773,
};

export default function PickupLocationMap({
  backendLocation,
  onLocationSelect,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);

  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(
    backendLocation ?? null
  );
  const [locationStatus, setLocationStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [locationNote, setLocationNote] = useState("");
  const [mapStyleUrl, setMapStyleUrl] = useState<any>(MAPLIBRE_STYLE_URL);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  const updateLocation = useCallback(
    (location: PickupLocation) => {
      setSelectedLocation(location);
      onLocationSelect?.(location);
    },
    [onLocationSelect]
  );

  // Helper to get GPS location with fallback chain
  const fetchDevicePosition = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return null;
      }

      // Try current position first (balanced accuracy for fast response)
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (current?.coords) {
          return {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
        }
      } catch (err) {
        console.log("getCurrentPositionAsync failed, falling back to last known:", err);
      }

      // Fallback to last known position (fast, works on emulators)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown?.coords) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }

      return null;
    } catch (err) {
      console.log("fetchDevicePosition error:", err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const getInitialLocation = async () => {
      if (backendLocation) {
        updateLocation(backendLocation);
        if (isMounted) setLocationStatus("ready");
        return;
      }

      const coords = await fetchDevicePosition();

      if (!isMounted) return;

      if (coords) {
        updateLocation(coords);
        setLocationNote("");
        setLocationStatus("ready");
      } else {
        // When device/emulator location services are unavailable,
        // fall back to default coordinates so post creation is NOT blocked.
        updateLocation(DEFAULT_COORDS);
        setLocationNote("Could not detect GPS. Tap the map to choose your pickup spot.");
        setLocationStatus("ready");
      }
    };

    getInitialLocation();

    return () => {
      isMounted = false;
    };
  }, [backendLocation, updateLocation]);

  const useCurrentLocation = async () => {
    setLocationStatus("loading");
    const coords = await fetchDevicePosition();

    if (coords) {
      updateLocation(coords);
      setLocationNote("");
      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 15,
        duration: 500,
      });
      setLocationStatus("ready");
    } else {
      setLocationStatus("ready");
      Alert.alert(
        "Location Unavailable",
        "Could not detect your GPS position. You can tap anywhere on the map to set your location."
      );
    }
  };

  const useSavedLocation = () => {
    if (!backendLocation) {
      Alert.alert("No Saved Location", "No prior location was saved.");
      return;
    }
    updateLocation(backendLocation);
    cameraRef.current?.flyTo({
      center: [backendLocation.longitude, backendLocation.latitude],
      zoom: 15,
      duration: 500,
    });
  };

  const handleMapPress = (event: any) => {
    const coords =
      event.nativeEvent?.lngLat ||
      event.lngLat ||
      event.nativeEvent?.geometry?.coordinates;

    if (coords && Array.isArray(coords) && coords.length >= 2) {
      const [longitude, latitude] = coords;
      updateLocation({ latitude, longitude });
      setLocationNote("");
      cameraRef.current?.easeTo({
        center: [longitude, latitude],
        duration: 300,
      });
    }
  };

  const currentCenter = selectedLocation
    ? [selectedLocation.longitude, selectedLocation.latitude]
    : [DEFAULT_COORDS.longitude, DEFAULT_COORDS.latitude];

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
          >
            <Text style={styles.actionText}>Use GPS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {locationStatus === "loading" ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.emerald[500]} />
            <Text style={styles.loadingText}>Detecting location…</Text>
          </View>
        ) : (
          <>
            <View style={styles.map}>
              <Map
                style={styles.mapElement}
                mapStyle={mapStyleUrl}
                attribution={false}
                logo={false}
                compass={false}
                onDidFailLoadingMap={() => {
                  if (!hasFallenBack) {
                    setHasFallenBack(true);
                    setMapStyleUrl(MAPLIBRE_STYLE_FALLBACK);
                  }
                }}
                onPress={handleMapPress}
              >
                <Camera
                  ref={cameraRef}
                  initialViewState={{
                    center: currentCenter as [number, number],
                    zoom: 14.5,
                  }}
                  maxZoom={19}
                />

                <UserLocation animated accuracy />

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

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={14}
                  color={theme.colors.emerald[600]}
                />
                <Text style={styles.coordsText}>
                  {selectedLocation
                    ? `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
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
          </>
        )}
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
  loadingBox: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvas.secondary,
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  map: {
    height: 220,
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

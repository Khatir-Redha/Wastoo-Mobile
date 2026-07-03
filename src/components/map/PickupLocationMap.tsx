import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

export type PickupLocation = {
  latitude: number;
  longitude: number;
  address?: string | null;
};

type Props = {
  backendLocation?: PickupLocation | null;
  onLocationSelect?: (location: PickupLocation) => void;
};

const DEFAULT_REGION = {
  latitude: 24.4539,
  longitude: 54.3773,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PickupLocationMap({
  backendLocation,
  onLocationSelect,
}: Props) {
  const [selectedLocation, setSelectedLocation] = useState<PickupLocation | null>(
    backendLocation ?? null,
  );
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [locationError, setLocationError] = useState("");

  const updateLocation = (location: PickupLocation) => {
    setSelectedLocation(location);
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    setLocationError("");
    onLocationSelect?.(location);
  };

  useEffect(() => {
    const getInitialLocation = async () => {
      if (backendLocation) {
        updateLocation(backendLocation);
        setLocationStatus("ready");
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError(
            "Location permission denied. You can still tap the map to choose a pickup spot.",
          );
          setLocationStatus("error");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        updateLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        setLocationStatus("ready");
      } catch (err) {
        console.log("Unable to fetch current location:", err);
        setLocationError(
          "Unable to detect your current location. You can tap the map to pick a spot.",
        );
        setLocationStatus("error");
      }
    };

    getInitialLocation();
  }, [backendLocation]);

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow location access to use your current position.",
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      updateLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setLocationStatus("ready");
    } catch (err) {
      console.log("Failed to get current location:", err);
      Alert.alert("Location unavailable", "Could not update your current location.");
    }
  };

  const useSavedLocation = () => {
    if (!backendLocation) {
      Alert.alert("No saved location", "No backend location is available yet.");
      return;
    }

    updateLocation(backendLocation);
    setLocationStatus("ready");
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pickup Location</Text>

        <View style={styles.actions}>
          {backendLocation ? (
            <TouchableOpacity onPress={useSavedLocation} style={styles.actionBtn}>
              <Text style={styles.actionText}>Use saved</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={useCurrentLocation} style={styles.actionBtn}>
            <Text style={styles.actionText}>Use current</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {locationStatus === "loading" ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#27ae60" />
            <Text style={styles.loadingText}>Fetching your location...</Text>
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              region={region}
              showsUserLocation
              onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
              onPress={(event) => {
                const coordinate = event.nativeEvent.coordinate;
                updateLocation({
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                });
              }}
            >
              {selectedLocation ? (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  pinColor="#006d37"
                />
              ) : null}
            </MapView>

            <View style={styles.infoBox}>
              <Text style={styles.coordsText}>
                {selectedLocation
                  ? `Lat ${selectedLocation.latitude.toFixed(4)}, Lon ${selectedLocation.longitude.toFixed(4)}`
                  : "Tap the map to choose a pickup location"}
              </Text>

              {locationError ? (
                <Text style={styles.errorText}>{locationError}</Text>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECECEC",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1b1c1c",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 11,
    color: "#006d37",
    fontWeight: "600",
  },
  mapWrapper: {
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
  },
  loadingBox: {
    height: 224,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FAFC",
  },
  loadingText: {
    marginTop: 8,
    color: "#8A8F87",
    fontSize: 13,
  },
  map: {
    height: 224,
  },
  infoBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  coordsText: {
    fontSize: 14,
    color: "#1b1c1c",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: "#d14343",
  },
});
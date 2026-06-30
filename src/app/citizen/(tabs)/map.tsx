import MapView, { Marker } from "react-native-maps";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import MapService, { MapPostsResponse, WasteCategory } from "../../../../services/map.service";

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | null>(null)

  // 1. Get Device Location ONCE on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        // Balanced accuracy is faster and more reliable than Highest accuracy
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation(currentLocation);
      } catch (err) {
        console.log("location fetch failed, trying last known location:", err);
        // Fallback: Try getting the last known location if current fails
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) setLocation(lastKnown);
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchPosts = async () => {
      setLoadingPosts(true);
      const { latitude, longitude } = location.coords;
      try {
        const nearByPosts = await MapService.getMapPosts({
          latitude,
          longitude,
          radius,
        });
        setMapPosts(nearByPosts);
      } catch (err) {
        console.log("getMapPosts failed:", err);
        setMapPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [location, radius]);

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          pinColor="blue" // Distinct color for user location
        />

        {mapPosts.map((e, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: e.latitude,
              longitude: e.longitude,
            }}
          />
        ))}
      </MapView>

      <View style={styles.sliderContainer}>
        <Text style={styles.radiusText}>
          Radius: {radius} km {loadingPosts && "(Updating...)"}
        </Text>

        <Slider
          minimumValue={10}
          maximumValue={100}
          step={10}
          value={radius}
          onValueChange={setRadius}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center"
  },
  sliderContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  radiusText: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
});
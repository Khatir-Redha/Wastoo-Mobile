import MapView, { Marker } from "react-native-maps";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import MapService, {
  MapPostsResponse,
  WasteCategory,
} from "../../../../services/map.service";

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const radiusOptions = [10, 20, 30, 40, 50, 75, 100];

  const categories: (string | WasteCategory)[] = [
    ...Object.values(WasteCategory),
  ];
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation(currentLocation);
      } catch (err) {
        console.log("location fetch failed, trying last known location:", err);
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
          ...(category !== "ALL" && { category }),
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
  }, [location, radius, category]);

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
          pinColor="blue"
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
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {categories.map((item) => (
            <Pressable
              key={String(item)}
              onPress={() => setCategory(item)}
              style={[styles.chip, category === item && styles.selectedChip]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === item && styles.selectedChipText,
                ]}
              >
                {String(item)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        style={styles.radiusButton}
        onPress={() => setShowRadiusPicker(true)}
      >
        <Text style={styles.radiusButtonText}>{radius} km</Text>
      </Pressable>
      {showRadiusPicker && (
  <View style={styles.radiusPicker}>
    {radiusOptions.map((value) => (
      <Pressable
        key={value}
        style={[
          styles.radiusOption,
          radius === value && styles.selectedRadiusOption,
        ]}
        onPress={() => {
          setRadius(value);
          setShowRadiusPicker(false);
        }}
      >
        <Text
          style={[
            styles.radiusOptionText,
            radius === value && styles.selectedRadiusOptionText,
          ]}
        >
          {value} km
        </Text>
      </Pressable>
    ))}
  </View>
)}
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
    alignItems: "center",
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
  chipsWrapper: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
  },

  chipsContainer: {
    paddingHorizontal: 10,
    gap: 8,
  },

  chip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  selectedChip: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },

  chipText: {
    color: "#000",
    fontWeight: "600",
  },

  selectedChipText: {
    color: "#fff",
  },
  radiusButton: {
  position: "absolute",
  bottom: 40,
  right: 20,
  backgroundColor: "#16a34a",
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderRadius: 25,
  elevation: 5,
},

radiusButtonText: {
  color: "#fff",
  fontWeight: "700",
},

radiusPicker: {
  position: "absolute",
  bottom: 100,
  right: 20,
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingVertical: 8,
  elevation: 8,
},

radiusOption: {
  paddingHorizontal: 20,
  paddingVertical: 12,
},

selectedRadiusOption: {
  backgroundColor: "#16a34a",
},

radiusOptionText: {
  fontWeight: "600",
},

selectedRadiusOptionText: {
  color: "#fff",
},
});

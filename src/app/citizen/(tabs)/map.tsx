import MapView, { Marker } from "react-native-maps";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import MapService, {
  MapPostsResponse,
  WasteCategory,
  PostStatus,
  MapCenterResponse,
} from "../../../../services/map.service";
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PostPreviewCard from "../../../components/map/PostPreviewCard";

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPost, setSelectedPost] = useState<MapPostsResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  const categories: Array<WasteCategory> = [
    ...Object.values(WasteCategory).filter(
      (value): value is WasteCategory => typeof value != "number",
    ),
  ];

  const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const getDistanceText = (item: MapPostsResponse) => {
    if (!location) return "Distance unavailable";

    const distanceKm = calculateDistanceKm(
      location.coords.latitude,
      location.coords.longitude,
      item.latitude,
      item.longitude,
    );

    return `${distanceKm.toFixed(1)} km away`;
  };

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

        const nearByCenters = await MapService.getMapCenters({
          latitude,
          longitude,
          radius,
        });
        setMapCenters(nearByCenters);
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
        <Text style={styles.loadingText}>Loading location...</Text>
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
        onPress={() => setSelectedPost(null)} 
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          pinColor="purple"
        />

        {mapPosts.map((post) => (
          <Marker
            key={String(post.id)}
            coordinate={{
              latitude: post.latitude,
              longitude: post.longitude,
            }}
            pinColor={
              post.status === PostStatus.OPEN
                ? "blue"
                : post.status === PostStatus.CLAIMED
                  ? "orange"
                  : "gray"
            }
            onPress={() => setSelectedPost(post)}
          />
        ))}

        {mapCenters.map((center) => (
          <Marker
            key={String(center.id)}
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            pinColor="green"
            onPress={() => setSelectedCenter(center)}
          />
        ))}
      </MapView>

      <MapFilterBar
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
      />

      {selectedPost ? (
        <PostPreviewCard
          post={selectedPost}
          distanceText={getDistanceText(selectedPost)}
          onViewDetails={(postId) => console.log("View details", postId)}
        />
      ) : null}

      <MapRadiusSlider
        radius={radius}
        loadingPosts={loadingPosts}
        onRadiusChange={setRadius}
      />
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
  loadingText: {
    marginTop: 10,
  },
});

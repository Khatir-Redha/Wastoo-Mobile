import MapView, { Marker } from "react-native-maps";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import MapService, {
  MapPostsResponse,
  WasteCategory,
  PostStatus,
  MapCenterResponse,
} from "../../../../services/map.service";
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PostPreviewCard from "../../../components/map/PostPreviewCard";
import CenterPreviewCard from "../../../components/map/CenterPreviewCard";
import CircularPin from "../../../components/map/CircularPin";
import { calculateDistance } from "haversine-toolkit"

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPost, setSelectedPost] = useState<MapPostsResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  const router = useRouter();
  const categories: Array<WasteCategory> = [
    ...Object.values(WasteCategory).filter(
      (value): value is WasteCategory => typeof value != "number",
    ),
  ];

const getDistanceText = (item: { latitude: number; longitude: number }) => {
  if (!location) return "Distance unavailable";

  const distanceKm = calculateDistance(
    {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    {
      latitude: item.latitude,
      longitude: item.longitude,
    }
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
        console.log(nearByPosts);

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
        <ActivityIndicator size="large" color="#006d37" />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  console.log(mapCenters);
  
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
        onPress={() => {
          setSelectedPost(null);
          setSelectedCenter(null);
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          pinColor="purple"
        />

        {mapPosts.map((post) => (
          <CircularPin
            key={String(post.id)}
            coordinate={{ latitude: post.latitude, longitude: post.longitude }}
            image={post.image}
            ringColor={
              post.status === PostStatus.OPEN
                ? "#3B82F6"
                : post.status === PostStatus.CLAIMED
                  ? "#F59E0B"
                  : "#9CA3AF"
            }
            onPress={() => {
              setSelectedPost(post);
              setSelectedCenter(null);
            }}
          />
        ))}

        {mapCenters.map((center) => (
          <CircularPin
            key={String(center.id)}
            coordinate={{ latitude: center.latitude, longitude: center.longitude }}
            ringColor="#16a34a"
            iconName="recycle"
            onPress={() => {
              setSelectedCenter(center);
              setSelectedPost(null);
            }}
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
          onViewDetails={(postId) => router.push(`/citizen/${postId}`)}
        />
      ) : null}

      {selectedCenter ? (
        <CenterPreviewCard
          center={selectedCenter}
          distanceText={getDistanceText(selectedCenter)}
          onViewDetails={(centerId) => console.log("View center", centerId)}
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

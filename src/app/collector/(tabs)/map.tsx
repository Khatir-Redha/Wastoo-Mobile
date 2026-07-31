import MapView, { Marker } from "react-native-maps";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import MapService, {
  MapCenterResponse,
  MapPickupResponse,
  WasteCategory,
} from "../../../../services/map.service";
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PickupPreviewCard from "../../../components/map/PickupPreviewCard";
import CenterPreviewCard from "../../../components/map/CenterPreviewCard";
import CircularPin from "../../../components/map/CircularPin";
import { useRouter } from "expo-router";
import { calculateDistance } from "haversine-toolkit";

const pickupRingColor = (status: string): string => {
  switch (status) {
    case "PENDING":
      return "#3B82F6";
    case "ASSIGNED":
      return "#F59E0B";
    case "IN_TRANSIT":
      return "#8B5CF6";
    default:
      return "#9CA3AF";
  }
};

export default function CollectorMapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPickups, setMapPickups] = useState<MapPickupResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPickup, setSelectedPickup] = useState<MapPickupResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  const categories: Array<WasteCategory> = Object.values(WasteCategory).filter(
    (value): value is WasteCategory => typeof value !== "number",
  );

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
        console.log("location fetch failed:", err);
      }
    };
    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchData = async () => {
      setLoading(true);
      const { latitude, longitude } = location.coords;
      try {
        const [pickups, centers] = await Promise.all([
          MapService.getMapPickups({
            latitude,
            longitude,
            radius,
            ...(category !== "ALL" && { category }),
          }),
          MapService.getMapCenters({
            latitude,
            longitude,
            radius,
            ...(category !== "ALL" && { category }),
          }),
        ]);
        setMapPickups(pickups);
        setMapCenters(centers);
      } catch (err) {
        console.log("collector map fetch failed:", err);
        setMapPickups([]);
        setMapCenters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location, radius, category]);

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5631" />
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
        onPress={() => {
          setSelectedPickup(null);
          setSelectedCenter(null);
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          pinColor="green"
        />

        {mapPickups.map((pickup) =>
          pickup.post?.latitude != null && pickup.post?.longitude != null ? (
            <CircularPin
              key={`pickup-${pickup.id}`}
              coordinate={{
                latitude: pickup.post.latitude,
                longitude: pickup.post.longitude,
              }}
              image={pickup.post.image}
              ringColor={pickupRingColor(pickup.status)}
              onPress={() => {
                setSelectedPickup(pickup);
                setSelectedCenter(null);
              }}
            />
          ) : null,
        )}

        {mapCenters.map((center) => (
          <CircularPin
            key={`center-${center.id}`}
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            ringColor="#16a34a"
            iconName="recycle"
            onPress={() => {
              setSelectedCenter(center);
              setSelectedPickup(null);
            }}
          />
        ))}
      </MapView>

      <MapFilterBar
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
      />

      {selectedPickup ? (
        <PickupPreviewCard
          pickup={selectedPickup}
          distanceText={getDistanceText({
            latitude: selectedPickup.post?.latitude ?? 0,
            longitude: selectedPickup.post?.longitude ?? 0,
          })}
          onViewDetails={(pickupId) =>
            router.push(`/collector/pickup/${pickupId}`)
          }
        />
      ) : null}

      {selectedCenter ? (
        <CenterPreviewCard
          center={selectedCenter}
          distanceText={getDistanceText(selectedCenter)}
        />
      ) : null}

      <MapRadiusSlider
        radius={radius}
        loadingPosts={loading}
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

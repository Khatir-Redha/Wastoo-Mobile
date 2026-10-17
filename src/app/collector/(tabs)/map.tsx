import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { calculateDistance } from "haversine-toolkit";
import MapService, {
  MapCenterResponse,
  MapPickupResponse,
  WasteCategory,
} from "../../../../services/map.service";
import RoutingService, {
  RouteResult,
} from "../../../../services/routing.service";
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PickupPreviewCard from "../../../components/map/PickupPreviewCard";
import CenterPreviewCard from "../../../components/map/CenterPreviewCard";
import CircularPin from "../../../components/map/CircularPin";
import RouteOverlay from "../../../components/map/RouteOverlay";
import RouteSummary from "../../../components/map/RouteSummary";
import {
  MAPLIBRE_STYLE_URL,
  MAPLIBRE_STYLE_FALLBACK,
} from "../../../components/map/mapConfig";
import { theme } from "../../../theme/tokens";

interface ActiveRoute {
  route: RouteResult;
  destinationName: string;
  destinationCoordinate: { latitude: number; longitude: number };
}

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

function getRouteBounds(
  coordinates: [number, number][]
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  if (!isFinite(minLng)) return [0, 0, 0, 0];
  return [minLng, minLat, maxLng, maxLat];
}

export default function CollectorMapScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const markerPressedRef = useRef(false);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPickups, setMapPickups] = useState<MapPickupResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPickup, setSelectedPickup] = useState<MapPickupResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  // Routing state
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState<any>(MAPLIBRE_STYLE_URL);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  const categories: (WasteCategory | "ALL")[] = [
    "ALL",
    ...Object.values(WasteCategory).filter(
      (value): value is WasteCategory =>
        typeof value !== "number" && value !== "ALL"
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
    let isMounted = true;
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
        if (isMounted) setLocation(currentLocation);
      } catch (err) {
        console.log("location fetch failed:", err);
      }
    };
    getLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location) return;

    let isMounted = true;
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
        if (isMounted) {
          setMapPickups(pickups || []);
          setMapCenters(centers || []);
        }
      } catch (err) {
        console.log("collector map fetch failed:", err);
        if (isMounted) {
          setMapPickups([]);
          setMapCenters([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [location, radius, category]);

  const handleGetDirections = async (
    target: { latitude: number; longitude: number; name?: string; title?: string }
  ) => {
    if (!location) {
      Alert.alert("Location", "Please enable location to calculate directions.");
      return;
    }

    const origin = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    const destination = {
      latitude: target.latitude,
      longitude: target.longitude,
    };

    const targetName = target.name || target.title || "Selected Destination";
    setCalculatingRoute(true);

    try {
      const result = await RoutingService.getRoute(origin, destination);
      if (!result.ok) {
        Alert.alert(
          "Route Unavailable",
          result.error.message || "No road route found to this destination."
        );
        return;
      }

      setActiveRoute({
        route: result.data,
        destinationName: targetName,
        destinationCoordinate: destination,
      });

      setSelectedPickup(null);
      setSelectedCenter(null);

      const bounds = getRouteBounds(result.data.geometry);
      cameraRef.current?.fitBounds(bounds, {
        padding: { top: 120, bottom: 250, left: 45, right: 45 },
        duration: 900,
      });
    } catch (err) {
      Alert.alert(
        "Routing Error",
        "Could not calculate route. Please try again."
      );
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleClearRoute = () => {
    RoutingService.cancelPendingRequest();
    setActiveRoute(null);
    if (location) {
      cameraRef.current?.flyTo({
        center: [location.coords.longitude, location.coords.latitude],
        zoom: 14.5,
        duration: 600,
      });
    }
  };

  const handleRecenter = () => {
    if (!location) return;
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 15,
      duration: 500,
    });
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
        <Text style={styles.loadingText}>Fetching location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={mapStyleUrl}
        attribution={false}
        logo={false}
        compass={true}
        compassPosition={{ top: 110, right: 16 }}
        onDidFailLoadingMap={() => {
          if (!hasFallenBack) {
            setHasFallenBack(true);
            setMapStyleUrl(MAPLIBRE_STYLE_FALLBACK);
          }
        }}
        onPress={() => {
          if (!markerPressedRef.current) {
            setSelectedPickup(null);
            setSelectedCenter(null);
          }
          markerPressedRef.current = false;
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [location.coords.longitude, location.coords.latitude],
            zoom: 14.5,
          }}
          maxZoom={19}
        />

        <UserLocation animated accuracy heading />

        {activeRoute && (
          <RouteOverlay
            route={activeRoute.route}
            originCoordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            destinationCoordinate={activeRoute.destinationCoordinate}
          />
        )}

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
              isSelected={selectedPickup?.id === pickup.id}
              onPress={() => {
                markerPressedRef.current = true;
                setSelectedPickup(pickup);
                setSelectedCenter(null);
                cameraRef.current?.easeTo({
                  center: [pickup.post!.longitude!, pickup.post!.latitude!],
                  duration: 400,
                });
              }}
            />
          ) : null
        )}

        {mapCenters.map((center) => (
          <CircularPin
            key={`center-${center.id}`}
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            ringColor="#087F5B"
            iconName="recycle"
            isSelected={selectedCenter?.id === center.id}
            onPress={() => {
              markerPressedRef.current = true;
              setSelectedCenter(center);
              setSelectedPickup(null);
              cameraRef.current?.easeTo({
                center: [center.longitude, center.latitude],
                duration: 400,
              });
            }}
          />
        ))}
      </Map>

      {/* Floating Category Filter Chips */}
      <MapFilterBar
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
        topOffset={50}
      />

      {/* Floating Recenter GPS Button */}
      <View style={styles.floatingControlsRight}>
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={22}
            color={theme.colors.emerald[600]}
          />
        </TouchableOpacity>
      </View>

      {/* Selected Pickup Preview Card */}
      {selectedPickup && !activeRoute && (
        <PickupPreviewCard
          pickup={selectedPickup}
          distanceText={getDistanceText({
            latitude: selectedPickup.post?.latitude ?? 0,
            longitude: selectedPickup.post?.longitude ?? 0,
          })}
          onViewDetails={(pickupId) =>
            router.push(`/collector/pickup/${pickupId}`)
          }
          onGetDirections={() =>
            handleGetDirections({
              latitude: selectedPickup.post?.latitude ?? 0,
              longitude: selectedPickup.post?.longitude ?? 0,
              title: selectedPickup.post?.title || `Pickup #${selectedPickup.id}`,
            })
          }
          isLoadingRoute={calculatingRoute}
        />
      )}

      {/* Selected Center Preview Card */}
      {selectedCenter && !activeRoute && (
        <CenterPreviewCard
          center={selectedCenter}
          distanceText={getDistanceText(selectedCenter)}
          onGetDirections={() => handleGetDirections(selectedCenter)}
          isLoadingRoute={calculatingRoute}
        />
      )}

      {/* Active Route Summary */}
      {activeRoute && (
        <RouteSummary
          destinationName={activeRoute.destinationName}
          distanceMeters={activeRoute.route.distanceMeters}
          durationSeconds={activeRoute.route.durationSeconds}
          destinationCoordinate={activeRoute.destinationCoordinate}
          onClose={handleClearRoute}
          loading={calculatingRoute}
        />
      )}

      {/* Expandable Radius Slider */}
      <MapRadiusSlider
        radius={radius}
        loadingPosts={loading}
        onRadiusChange={setRadius}
        style={{ bottom: activeRoute || selectedPickup || selectedCenter ? 260 : 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  floatingControlsRight: {
    position: "absolute",
    right: 16,
    top: 120,
    zIndex: 10,
  },
  recenterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.canvas.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.md,
    elevation: 5,
  },
});

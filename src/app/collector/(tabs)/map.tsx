import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
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
  ALGERIA_OVERVIEW,
} from "../../../components/map/mapConfig";
import {
  getLocationIssueMessage,
  useDeviceLocation,
} from "../../../hooks/useDeviceLocation";
import { useMapTilerStyle } from "../../../hooks/useMapTilerStyle";
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const markerPressedRef = useRef(false);

  const { location, issue: locationIssue, isLoading: isLocating, requestLocation } =
    useDeviceLocation();
  const { style: mapStyle, error: mapStyleError } = useMapTilerStyle();
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
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

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
    if (!mapReady || !location) return;
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 14.5,
      duration: 700,
    });
  }, [location, mapReady]);

  useEffect(() => {
    if (!location) {
      setMapPickups([]);
      setMapCenters([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      try {
        const [pickups, centers] = await Promise.all([
          MapService.getMapPickups({
            latitude: coords.latitude,
            longitude: coords.longitude,
            radius,
            ...(category !== "ALL" && { category }),
          }),
          MapService.getMapCenters({
            latitude: coords.latitude,
            longitude: coords.longitude,
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

  const handleRecenter = async () => {
    const currentLocation = await requestLocation();
    if (!currentLocation || !mapReady) return;
    cameraRef.current?.flyTo({
      center: [
        currentLocation.coords.longitude,
        currentLocation.coords.latitude,
      ],
      zoom: 15,
      duration: 500,
    });
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn("Could not open Wastoo app settings.", error);
      Alert.alert("Settings unavailable", "Open Wastoo's settings from Android Settings.");
    }
  };

  return (
    <View style={styles.container}>
      {mapStyle ? (
        <Map
          style={styles.map}
          mapStyle={mapStyle}
          attribution
          logo={false}
          compass
          compassPosition={{ top: 110, right: 16 }}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onDidFailLoadingMap={() => {
            console.warn("MapTiler map style failed to load.");
            setMapLoadError(true);
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
              center: [
                ALGERIA_OVERVIEW.center.longitude,
                ALGERIA_OVERVIEW.center.latitude,
              ],
              zoom: ALGERIA_OVERVIEW.zoom,
            }}
            maxZoom={19}
          />

          {location && <UserLocation animated accuracy heading />}

          {activeRoute && location && (
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
      ) : (
        <View style={[styles.map, styles.mapUnavailable]}>
          <Text style={styles.mapUnavailableText}>
            {mapStyleError ?? "Loading MapTiler map style…"}
          </Text>
        </View>
      )}

      {mapLoadError && (
        <View style={styles.mapErrorBanner}>
          <Text style={styles.errorText}>
            Map tiles could not load. Check your internet connection and MapTiler API key.
          </Text>
        </View>
      )}

      {(location || isLocating) && (
        <View
          style={[
            styles.locationBadge,
            locationIssue && styles.locationBadgeAfterError,
          ]}
        >
          {location ? (
            <Text style={styles.locationBadgeText}>
              {isLocating || locationIssue === "unavailable"
                ? "Last known"
                : "GPS"}{" "}
              {location.coords.latitude.toFixed(5)},{" "}
              {location.coords.longitude.toFixed(5)}
              {location.coords.accuracy != null
                ? ` · ±${Math.round(location.coords.accuracy)} m`
                : ""}
            </Text>
          ) : (
            <>
              <ActivityIndicator size="small" color={theme.colors.emerald[600]} />
              <Text style={styles.locationBadgeText}>Locating device…</Text>
            </>
          )}
        </View>
      )}

      {locationIssue && (
        <View style={styles.errorBanner}>
          <View style={styles.locationMessageActions}>
            <Text style={styles.errorText}>
              {getLocationIssueMessage(locationIssue, Boolean(location))}
            </Text>
            {locationIssue === "permission-blocked" && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void openAppSettings()}
              >
                <Text style={styles.retryText}>Settings</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void requestLocation()}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.retryText}>Retry</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

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
          onPress={() => void handleRecenter()}
          activeOpacity={0.8}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={theme.colors.emerald[600]} />
          ) : (
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={22}
              color={theme.colors.emerald[600]}
            />
          )}
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
  errorBanner: {
    position: "absolute",
    top: 96,
    left: 20,
    right: 72,
    backgroundColor: theme.colors.canvas.primary,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
    ...theme.shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error[500],
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
    flex: 1,
    marginRight: 12,
  },
  locationMessageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButton: {
    backgroundColor: theme.colors.emerald[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: "white",
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
  },
  locationBadge: {
    position: "absolute",
    left: 16,
    top: 104,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.canvas.primary,
    ...theme.shadows.sm,
  },
  locationBadgeAfterError: {
    top: 170,
  },
  locationBadgeText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  mapUnavailable: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  mapUnavailableText: {
    color: theme.colors.text.secondary,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.medium,
  },
  mapErrorBanner: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.canvas.primary,
    ...theme.shadows.md,
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

import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
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
import NotificationBell from "../../../components/NotificationBell";

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
  const [searchText, setSearchText] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [draftCategory, setDraftCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPickup, setSelectedPickup] = useState<MapPickupResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  // Routing state
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const hasSelectedPlace = Boolean(selectedPickup || selectedCenter) && !activeRoute;

  const categories: (WasteCategory | "ALL")[] = [
    "ALL",
    ...Object.values(WasteCategory).filter(
      (value): value is WasteCategory =>
        typeof value !== "number" && value !== "ALL"
    ),
  ];

  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const visiblePickups = useMemo(
    () =>
      normalizedSearch
        ? mapPickups.filter((pickup) =>
            `${pickup.post?.title ?? ""} ${pickup.post?.id ?? pickup.id}`
              .toLocaleLowerCase()
              .includes(normalizedSearch)
          )
        : mapPickups,
    [mapPickups, normalizedSearch]
  );
  const visibleCenters = useMemo(
    () =>
      normalizedSearch
        ? mapCenters.filter((center) =>
            `${center.name} ${center.address ?? ""}`
              .toLocaleLowerCase()
              .includes(normalizedSearch)
          )
        : mapCenters,
    [mapCenters, normalizedSearch]
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
          compassPosition={{ top: insets.top + 158, right: 16 }}
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

          {visiblePickups.map((pickup) =>
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

          {visibleCenters.map((center) => (
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

      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { top: insets.top + 6 }]}
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.headingTitle}>Explore nearby</Text>
            <Text style={styles.headingSubtitle} numberOfLines={1}>
              {isLocating
                ? "Finding your location…"
                : locationIssue
                  ? "Location needs attention"
                : location
                  ? `${visiblePickups.length + visibleCenters.length} places around you`
                  : "Discover pickups and recycling centers"}
            </Text>
          </View>
          <View style={styles.headerAction}>
            <NotificationBell />
          </View>
        </View>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={21}
            color={theme.colors.text.tertiary}
          />
          <TextInput
            accessibilityLabel="Search pickups and recycling centers"
            placeholder="Search pickups or centers"
            placeholderTextColor="#84928A"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchText("")}
              hitSlop={8}
              style={styles.clearSearchButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color="#8A9890"
              />
            </Pressable>
          )}
          <View style={styles.searchDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open map filters"
            onPress={() => {
              setDraftCategory(category);
              setFiltersVisible(true);
            }}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.controlPressed,
            ]}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={theme.colors.emerald[600]}
            />
          </Pressable>
        </View>
      </View>

      {mapLoadError && (
        <View style={styles.mapErrorBanner}>
          <Text style={styles.errorText}>
            Map tiles could not load. Check your internet connection and MapTiler API key.
          </Text>
        </View>
      )}

      {__DEV__ && location && !locationIssue && (
        <View style={[styles.debugLocation, { top: insets.top + 152 }]}>
          <Text style={styles.debugLocationText}>
            GPS {location.coords.latitude.toFixed(5)},{" "}
            {location.coords.longitude.toFixed(5)}
            {location.coords.accuracy != null
              ? ` · ±${Math.round(location.coords.accuracy)} m`
              : ""}
          </Text>
        </View>
      )}

      {locationIssue && (
        <View style={[styles.locationIssueBanner, { top: insets.top + 154 }]}>
          <MaterialCommunityIcons
            name="map-marker-alert-outline"
            size={20}
            color="#9B5B12"
          />
          <View style={styles.locationIssueCopy}>
            <Text style={styles.errorText}>
              {getLocationIssueMessage(locationIssue, Boolean(location))}
            </Text>
            <View style={styles.locationMessageActions}>
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
        </View>
      )}

      <MapFilterBar
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
        topOffset={insets.top + 106}
      />

      {!hasSelectedPlace && (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingControlsRight,
            { top: insets.top + (locationIssue ? 260 : 205) },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Recenter map on my location"
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
      )}

      {searchText.trim().length > 0 &&
        visiblePickups.length + visibleCenters.length === 0 && (
          <View
            style={[
              styles.noResults,
              { top: insets.top + 153 },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.noResultsText}>
              No pickups or centers match “{searchText.trim()}”.
            </Text>
          </View>
        )}

      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            style={styles.modalScrim}
            onPress={() => setFiltersVisible(false)}
          />
          <View
            style={[
              styles.filterSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <View>
                <Text style={styles.filterSheetTitle}>Filters</Text>
                <Text style={styles.filterSheetSubtitle}>
                  Choose one material category
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraftCategory("ALL")}
                hitSlop={8}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.filterOptions}
              contentContainerStyle={styles.filterOptionsContent}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((item) => {
                const selected = draftCategory === item;
                const label =
                  String(item).toLowerCase() === "all"
                    ? "All materials"
                    : `${String(item).charAt(0)}${String(item)
                        .slice(1)
                        .toLowerCase()}`;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={String(item)}
                    onPress={() => setDraftCategory(item)}
                    style={[
                      styles.filterOption,
                      selected && styles.filterOptionSelected,
                    ]}
                  >
                    <View style={styles.filterOptionLeft}>
                      <MaterialCommunityIcons
                        name={selected ? "check-circle" : "circle-outline"}
                        size={20}
                        color={
                          selected
                            ? theme.colors.emerald[600]
                            : theme.colors.text.tertiary
                        }
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          selected && styles.filterOptionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                    {selected && (
                      <Text style={styles.selectedLabel}>Selected</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.filterActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersVisible(false)}
                style={styles.filterCancelButton}
              >
                <Text style={styles.filterCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCategory(draftCategory);
                  setFiltersVisible(false);
                }}
                style={styles.filterApplyButton}
              >
                <Text style={styles.filterApplyText}>Show results</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selected pickup */}
      {selectedPickup && !activeRoute && (
        <PickupPreviewCard
          pickup={selectedPickup}
          distanceText={getDistanceText({
            latitude: selectedPickup.post?.latitude ?? 0,
            longitude: selectedPickup.post?.longitude ?? 0,
          })}
          onDismiss={() => setSelectedPickup(null)}
          bottomOffset={12}
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

      {selectedCenter && !activeRoute && (
        <CenterPreviewCard
          center={selectedCenter}
          distanceText={getDistanceText(selectedCenter)}
          onDismiss={() => setSelectedCenter(null)}
          bottomOffset={12}
          onGetDirections={() => handleGetDirections(selectedCenter)}
          isLoadingRoute={calculatingRoute}
        />
      )}

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

      <MapRadiusSlider
        radius={radius}
        loadingPosts={loading}
        onRadiusChange={setRadius}
        style={
          hasSelectedPlace
            ? {
                top:
                  insets.top +
                  (locationIssue ? 290 : __DEV__ && location ? 184 : 150),
                bottom: undefined,
              }
            : activeRoute
              ? { bottom: 184 }
              : { bottom: 12 }
        }
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
  topOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 12,
    elevation: 6,
  },
  headingRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingCopy: {
    flex: 1,
  },
  headingTitle: {
    color: theme.colors.forest[500],
    fontSize: 19,
    lineHeight: 24,
    fontFamily: theme.typography.fontFamily.bold,
  },
  headingSubtitle: {
    marginTop: 1,
    color: "#62746A",
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
  },
  headerAction: {
    width: 42,
    height: 42,
    marginLeft: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5ECE8",
    ...theme.shadows.sm,
  },
  searchBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5ECE8",
    shadowColor: "#172B2A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 9,
    paddingVertical: 0,
    color: theme.colors.forest[500],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  clearSearchButton: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 3,
    backgroundColor: "#E8EEEB",
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F0F7F3",
  },
  controlPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.forest[500],
    fontFamily: theme.typography.fontFamily.medium,
  },
  locationMessageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  retryButton: {
    backgroundColor: theme.colors.emerald[500],
    paddingHorizontal: 12,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  retryText: {
    color: "white",
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  locationIssueBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF9EC",
    borderWidth: 1,
    borderColor: "#F2E3C4",
    zIndex: 20,
    ...theme.shadows.md,
  },
  locationIssueCopy: {
    flex: 1,
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
    top: 12,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    zIndex: 16,
    ...theme.shadows.md,
  },
  floatingControlsRight: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    elevation: 4,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5ECE8",
    ...theme.shadows.md,
    elevation: 4,
  },
  debugLocation: {
    position: "absolute",
    left: 16,
    zIndex: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  debugLocationText: {
    color: theme.colors.forest[500],
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.medium,
  },
  noResults: {
    position: "absolute",
    left: 16,
    right: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    zIndex: 9,
    ...theme.shadows.sm,
  },
  noResultsText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 34, 29, 0.38)",
  },
  filterSheet: {
    maxHeight: "76%",
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...theme.shadows.xl,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8E2DD",
    marginBottom: 20,
  },
  filterSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterSheetTitle: {
    color: theme.colors.forest[500],
    fontSize: theme.typography.fontSize.xl.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
  filterSheetSubtitle: {
    marginTop: 3,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
  },
  clearFiltersText: {
    color: theme.colors.emerald[600],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  filterOptions: {
    flexShrink: 1,
  },
  filterOptionsContent: {
    gap: 8,
    paddingBottom: 12,
  },
  filterOption: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8EEEB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  filterOptionSelected: {
    borderColor: "#A8D9C4",
    backgroundColor: "#F1F8F4",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterOptionText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  filterOptionTextSelected: {
    color: theme.colors.forest[500],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  selectedLabel: {
    color: theme.colors.emerald[700],
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2EF",
  },
  filterCancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E3EAE6",
    borderRadius: 12,
  },
  filterCancelText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  filterApplyButton: {
    flex: 1.4,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.emerald[500],
  },
  filterApplyText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
});

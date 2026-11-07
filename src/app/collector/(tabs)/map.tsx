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
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { calculateDistance } from "haversine-toolkit";
import MapService, {
  MapPostResponse,
  MapCenterResponse,
  WasteCategory,
  PostStatus,
} from "../../../../services/map.service";
import RoutingService, {
  RouteResult,
} from "../../../../services/routing.service";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PostPreviewCard from "../../../components/map/PostPreviewCard";
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
import { getCategoryColor, getCategoryIcon, getCategoryName } from "../../../utils/category-utils";
import { getPostQuantities } from "../../../utils/post-quantities";
import NotificationBell from "../../../components/NotificationBell";
import { LoadingScreen } from "../../../components/ui/LoadingScreen";

interface ActiveRoute {
  route: RouteResult;
  destinationName: string;
  destinationCoordinate: { latitude: number; longitude: number };
}

const getRouteBounds = (
  coordinates: [number, number][]
): [number, number, number, number] => {
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
};

export default function CollectorMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const markerPressedRef = useRef(false);

  const { location, issue: locationIssue, isLoading: isLocating, requestLocation } =
    useDeviceLocation();
  const { style: mapStyle, error: mapStyleError } = useMapTilerStyle();
  const [mapPosts, setMapPosts] = useState<MapPostResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [searchText, setSearchText] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [draftCategory, setDraftCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPost, setSelectedPost] = useState<MapPostResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  // Routing state
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const hasSelectedPlace = Boolean(selectedPost || selectedCenter) && !activeRoute;

  const categories: (WasteCategory | "ALL")[] = [
    "ALL",
    ...Object.values(WasteCategory).filter(
      (value): value is WasteCategory =>
        typeof value !== "number" && value !== "ALL"
    ),
  ];

  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const visiblePosts = useMemo(
    () =>
      normalizedSearch
        ? mapPosts.filter((post) =>
            `${post.title ?? ""}`.toLocaleLowerCase().includes(normalizedSearch)
          )
        : mapPosts,
    [mapPosts, normalizedSearch]
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
      setMapPosts([]);
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
        const [posts, centers] = await Promise.all([
          MapService.getMapPosts({
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

        // Filter posts: only OPEN status with available quantity > 0
        const availablePosts = (posts || []).filter((p) => {
          const quantities = getPostQuantities(p);
          const available = quantities.available ?? 0;
          return p.status === PostStatus.OPEN && available > 0;
        });

        if (isMounted) {
          setMapPosts(availablePosts);
          setMapCenters(centers || []);
        }
      } catch (err) {
        console.log("collector map fetch failed:", err);
        if (isMounted) {
          setMapPosts([]);
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

      setSelectedPost(null);
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
      const { Linking } = await import('react-native');
      await Linking.openSettings();
    } catch (error) {
      console.warn("Could not open Wastoo app settings.", error);
      Alert.alert("Settings unavailable", "Open Wastoo's settings from Android Settings.");
    }
  };

  // Calculate availability status
  const getAvailabilityChip = (post: MapPostResponse) => {
    const quantities = getPostQuantities(post);
    const available = quantities.available ?? 0;
    const totalQty = quantities.total ?? 1;
    if (available <= 0) return { text: "Fully Reserved", color: theme.colors.text.tertiary };
    const percentage = (available / (totalQty)) * 100;
    if (percentage < 20) return { text: "Limited", color: theme.colors.mint[500] };
    return { text: "Available", color: theme.colors.emerald[600] };
  };

  return (
    <View style={styles.container}>
      {locationIssue && (
        <View style={[styles.permissionBanner, { top: insets.top }]}>
          <MaterialCommunityIcons
            name="map-marker-alert-outline"
            size={20}
            color="#9B5B12"
          />
          <View style={styles.permissionContent}>
            <Text style={styles.permissionText}>
              {getLocationIssueMessage(locationIssue, Boolean(location))}
            </Text>
            {locationIssue === "permission-blocked" && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => void openAppSettings()}
              >
                <Text style={styles.settingsText}>Settings</Text>
              </TouchableOpacity>
            )}
            {!locationIssue && (
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
            )}
          </View>
        </View>
      )}

      {!locationIssue && !isLocating && location && (
        <>
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
                  setSelectedPost(null);
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

              {visiblePosts.map((post) =>
                post.latitude != null && post.longitude != null ? (
                  <CircularPin
                    key={`post-${post.id}`}
                    coordinate={{
                      latitude: post.latitude,
                      longitude: post.longitude,
                    }}
                    image={post.image}
                    ringColor={getCategoryColor(post.category)}
                    isSelected={selectedPost?.id === post.id}
                    onPress={() => {
                      markerPressedRef.current = true;
                      setSelectedPost(post);
                      setSelectedCenter(null);
                      cameraRef.current?.easeTo({
                        center: [post.longitude!, post.latitude!],
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
                    setSelectedPost(null);
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

          {/* Top overlay - Header */}
          <View
            pointerEvents="box-none"
            style={[styles.topOverlay, { top: insets.top + 6 }]}
          >
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.headingTitle}>Find nearby posts</Text>
                <Text style={styles.headingSubtitle} numberOfLines={1}>
                  {isLocating
                    ? "Finding your location…"
                    : locationIssue
                      ? "Location needs attention"
                      : location
                        ? `${visiblePosts.length + visibleCenters.length} places around you`
                        : "Discover waste to collect nearby"}
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
                accessibilityLabel="Search for materials or locations"
                placeholder="Search materials or locations"
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

          {/* Category chips */}
          <View
            pointerEvents="box-none"
            style={[styles.chipsWrapper, { top: insets.top + 106 }]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {categories.map((item) => {
                const selected = category === item;
                const label = item === "ALL" ? "All" :
                  String(item).charAt(0) + String(item).slice(1).toLowerCase();
                const color = getCategoryColor(item as WasteCategory);

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={String(item)}
                    onPress={() => setCategory(item)}
                    style={[
                      styles.chip,
                      selected && { backgroundColor: color },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(item as WasteCategory) as any}
                      size={16}
                      color={selected ? "#FFFFFF" : color}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.selectedChipText,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      {/* Permission denied state */}
      {locationIssue === "permission-blocked" && !location && (
        <View style={styles.permissionDenied}>
          <MaterialCommunityIcons
            name="map-marker-question-outline"
            size={64}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.permissionDeniedTitle}>Location Permission Needed</Text>
          <Text style={styles.permissionDeniedDesc}>
            Enable location access to see posts near you.
          </Text>
          <TouchableOpacity
            onPress={() => openAppSettings()}
            style={styles.settingsPrimaryButton}
          >
            <Text style={styles.settingsPrimaryText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state while location loads */}
      {!location && !locationIssue && (
        <LoadingScreen message="Finding your location…" />
      )}

      {/* No results */}
      {!loading && !locationIssue && location &&
       visiblePosts.length + visibleCenters.length === 0 && (
        <View style={styles.noResults}>
          <MaterialCommunityIcons
            name="map-marker-radius-outline"
            size={56}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.noResultsTitle}>No posts within {radius} km</Text>
          <Text style={styles.noResultsDesc}>
            Try a wider radius or different category.
          </Text>
          <Pressable
            onPress={() => setFiltersVisible(true)}
            style={styles.changeRadiusButton}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={18}
              color={theme.colors.emerald[500]}
            />
            <Text style={styles.changeRadiusText}>Change Radius</Text>
          </Pressable>
        </View>
      )}

      {/* Map error banner */}
      {mapLoadError && (
        <View style={styles.mapErrorBanner}>
          <Text style={styles.errorText}>
            Map tiles could not load. Check your internet connection and MapTiler API key.
          </Text>
        </View>
      )}

      {/* Radius chip */}
      <MapRadiusSlider
        radius={radius}
        loadingPosts={loading}
        onRadiusChange={setRadius}
        style={hasSelectedPlace ? {
          top: insets.top + (locationIssue ? 290 : 205),
        } : {
          bottom: activeRoute ? 184 : 12,
        }}
      />

      {/* Recenter button */}
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

      {/* Search results */}
      {searchText.trim().length > 0 &&
        visiblePosts.length + visibleCenters.length === 0 && (
          <View
            style={[
              styles.noResults,
              { top: insets.top + 153 },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.noResultsText}>
              No posts or centers match "{searchText.trim()}".
            </Text>
          </View>
        )}

      {/* Filters modal */}
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
                <Text style={styles.filterSheetTitle}>Filter by Category</Text>
                <Text style={styles.filterSheetSubtitle}>
                  Choose one material category
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategory("ALL")}
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
                const selected = category === item;
                const label =
                  String(item).toLowerCase() === "all"
                    ? "All materials"
                    : `${String(item).charAt(0)}${String(item)
                        .slice(1)
                        .toLowerCase()}`;
                const color = getCategoryColor(item as WasteCategory);
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={String(item)}
                    onPress={() => setCategory(item)}
                    style={[
                      styles.filterOption,
                      selected && { backgroundColor: color },
                    ]}
                  >
                    <View style={styles.filterOptionLeft}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(item as WasteCategory) as any}
                        size={20}
                        color={selected ? "#FFFFFF" : color}
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
                  setFiltersVisible(false);
                }}
                style={styles.filterApplyButton}
              >
                <Text style={styles.filterApplyText}>Apply filter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selected post preview */}
      {selectedPost && !activeRoute && (
        <PostPreviewCard
          post={selectedPost}
          distanceText={getDistanceText({
            latitude: selectedPost.latitude,
            longitude: selectedPost.longitude,
          })}
          onDismiss={() => setSelectedPost(null)}
          bottomOffset={12}
          onViewDetails={(postId) =>
            router.push(`/collector/post/${postId}`)
          }
          onGetDirections={() =>
            handleGetDirections({
              latitude: selectedPost.latitude,
              longitude: selectedPost.longitude,
              title: selectedPost.title,
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
  errorText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: "center",
  },
  permissionBanner: {
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
  permissionContent: {
    flex: 1,
  },
  permissionText: {
    color: "#9B5B12",
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: 8,
  },
  settingsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  permissionDenied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 32,
  },
  permissionDeniedTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  permissionDeniedDesc: {
    fontSize: theme.typography.fontSize.base.size,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  settingsPrimaryButton: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl * 2,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  settingsPrimaryText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  noResults: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingHorizontal: theme.spacing.xl,
    alignItems: "center",
    zIndex: 9,
  },
  noResultsTitle: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  noResultsDesc: {
    fontSize: theme.typography.fontSize.base.size,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  changeRadiusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.emerald[50],
    borderRadius: theme.radius.md,
  },
  changeRadiusText: {
    color: theme.colors.emerald[600],
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  noResultsText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  chipsWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 8,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 7,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  chipText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  selectedChipText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.semiBold,
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
    color: "#FFFFFF",
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
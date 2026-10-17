import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { Image } from "expo-image";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { calculateDistance } from "haversine-toolkit";
import MapService, {
  MapCenterResponse,
  MapPostsResponse,
  PostStatus,
  WasteCategory,
} from "../../../../services/map.service";
import PostService, { Post } from "../../../../services/post.service";
import RoutingService, {
  RouteResult,
} from "../../../../services/routing.service";
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PostPreviewCard from "../../../components/map/PostPreviewCard";
import CenterPreviewCard from "../../../components/map/CenterPreviewCard";
import CircularPin from "../../../components/map/CircularPin";
import RouteOverlay from "../../../components/map/RouteOverlay";
import RouteSummary from "../../../components/map/RouteSummary";
import {
  MAPLIBRE_STYLE_URL,
  MAPLIBRE_STYLE_FALLBACK,
} from "../../../components/map/mapConfig";
import NotificationBell from "../../../components/NotificationBell";
import BadgesButton from "../../../components/BadgesButton";
import { theme } from "../../../theme/tokens";

type ViewMode = "posts" | "map";

interface ActiveRoute {
  route: RouteResult;
  destinationName: string;
  destinationCoordinate: { latitude: number; longitude: number };
  targetType: "post" | "center";
  targetId: number;
}

const POST_CATEGORIES = [
  { id: "ALL", name: "All", icon: "view-grid" },
  { id: "PLASTIC", name: "Plastic", icon: "recycle" },
  { id: "ORGANIC", name: "Organic", icon: "leaf" },
  { id: "GLASS", name: "Glass", icon: "bottle-wine-outline" },
  { id: "METAL", name: "Metal", icon: "cube-scan" },
];

const getCategoryIcon = (category?: string) => {
  const cat = POST_CATEGORIES.find(
    (c) => c.id.toLowerCase() === category?.toLowerCase()
  );
  return cat ? cat.icon : "package-variant-closed";
};

/** Compute geographic bounding box [west, south, east, north] for a route */
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

  if (!isFinite(minLng)) {
    return [0, 0, 0, 0];
  }

  return [minLng, minLat, maxLng, maxLat];
}

export default function PostsAndMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; routePostId?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>(
    params.view === "map" ? "map" : "posts"
  );

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [mapSearchText, setMapSearchText] = useState("");

  const [selectedPost, setSelectedPost] = useState<MapPostsResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  // Routing State
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // MapLibre Camera Ref & Style
  const cameraRef = useRef<CameraRef>(null);
  const [mapStyleUrl, setMapStyleUrl] = useState<any>(MAPLIBRE_STYLE_URL);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  // Posts tab state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [postSearchTerm, setPostSearchTerm] = useState("");

  const markerPressedRef = useRef(false);

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

  // ── Location Fetching ──────────────────────────────────────────
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
        console.log("location fetch failed, trying last known location:", err);
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (isMounted && lastKnown) setLocation(lastKnown);
      }
    };

    getLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Fetch Map Markers (Posts & Centers) ────────────────────────
  useEffect(() => {
    if (!location) return;

    let isMounted = true;
    const fetchMarkers = async () => {
      setLoadingPosts(true);
      const { latitude, longitude } = location.coords;
      try {
        const [nearByPosts, nearByCenters] = await Promise.all([
          MapService.getMapPosts({
            latitude,
            longitude,
            radius,
            ...(category !== "ALL" && { category }),
          }),
          MapService.getMapCenters({
            latitude,
            longitude,
            radius,
          }),
        ]);

        if (!isMounted) return;
        setMapPosts(nearByPosts || []);
        setMapCenters(nearByCenters || []);

        // Check if there's a routePostId requested via navigation params
        if (params.routePostId) {
          const targetId = Number(params.routePostId);
          const matched = nearByPosts?.find((p) => p.id === targetId);
          if (matched) {
            setSelectedPost(matched);
            handleGetDirections(matched, "post");
          }
        }
      } catch (err) {
        console.log("getMapPosts/Centers failed:", err);
        if (isMounted) {
          setMapPosts([]);
          setMapCenters([]);
        }
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    };

    fetchMarkers();
    return () => {
      isMounted = false;
    };
  }, [location, radius, category, params.routePostId]);

  // ── Fetch Posts for List View ──────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchAllPosts = async () => {
      setPostsLoading(true);
      try {
        const query: any = {};
        if (activeCategory !== "ALL")
          query.category = activeCategory.toLowerCase();
        if (postSearchTerm.trim()) query.search = postSearchTerm.trim();
        const response = await PostService.getAllPosts(query);
        const postsArray = Array.isArray(response)
          ? response
          : response?.data || [];
        if (isMounted) setPosts(postsArray);
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (isMounted) setPosts([]);
      } finally {
        if (isMounted) setPostsLoading(false);
      }
    };

    fetchAllPosts();
    return () => {
      isMounted = false;
    };
  }, [activeCategory, postSearchTerm]);

  // ── Real Road Routing Handler ──────────────────────────────────
  const handleGetDirections = async (
    target: MapPostsResponse | MapCenterResponse,
    targetType: "post" | "center"
  ) => {
    if (!location) {
      Alert.alert(
        "Location Required",
        "Please enable location services to calculate driving directions."
      );
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

    const targetName =
      (target as MapCenterResponse).name ||
      (target as MapPostsResponse).title ||
      "Selected Location";

    setCalculatingRoute(true);

    try {
      const result = await RoutingService.getRoute(origin, destination);

      if (!result.ok) {
        Alert.alert(
          "Route Unavailable",
          result.error.message ||
            "Unable to calculate a driving route between your location and this destination."
        );
        return;
      }

      setActiveRoute({
        route: result.data,
        destinationName: targetName,
        destinationCoordinate: destination,
        targetType,
        targetId: target.id,
      });

      // Hide marker previews once route is active
      setSelectedPost(null);
      setSelectedCenter(null);

      // Fit camera bounds to show entire route with comfortable padding
      const bounds = getRouteBounds(result.data.geometry);
      cameraRef.current?.fitBounds(bounds, {
        padding: { top: 120, bottom: 250, left: 45, right: 45 },
        duration: 900,
      });
    } catch (err: any) {
      Alert.alert(
        "Routing Error",
        "A network error occurred while reaching the routing server. Please try again."
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
    if (!location) {
      Alert.alert("Location", "Waiting for current GPS location...");
      return;
    }
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 15,
      duration: 600,
    });
  };

  // ── Filter markers based on map search input ────────────────────
  const filteredPosts = useMemo(() => {
    const q = mapSearchText.trim().toLowerCase();
    if (!q) return mapPosts;
    return mapPosts.filter((p) => p.title?.toLowerCase().includes(q));
  }, [mapPosts, mapSearchText]);

  const filteredCenters = useMemo(() => {
    const q = mapSearchText.trim().toLowerCase();
    if (!q) return mapCenters;
    return mapCenters.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [mapCenters, mapSearchText]);

  // ── Header Segment Control ──────────────────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Posts & Map</Text>
        <View style={styles.headerActions}>
          <BadgesButton />
          <NotificationBell />
        </View>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("posts")}
          style={[
            styles.segmentItem,
            viewMode === "posts" && styles.segmentItemActive,
          ]}
        >
          <Feather
            name="list"
            size={16}
            color={
              viewMode === "posts"
                ? theme.colors.text.inverse
                : theme.colors.text.tertiary
            }
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "posts" && styles.segmentTextActive,
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("map")}
          style={[
            styles.segmentItem,
            viewMode === "map" && styles.segmentItemActive,
          ]}
        >
          <Feather
            name="map"
            size={16}
            color={
              viewMode === "map"
                ? theme.colors.text.inverse
                : theme.colors.text.tertiary
            }
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "map" && styles.segmentTextActive,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Posts List View ─────────────────────────────────────────────
  const renderPosts = () => (
    <View style={styles.flex}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={theme.colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search materials, locations..."
            placeholderTextColor={theme.colors.text.quaternary}
            value={postSearchTerm}
            onChangeText={setPostSearchTerm}
          />
          {postSearchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setPostSearchTerm("")}>
              <Feather name="x" size={16} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {POST_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={18}
                  color={
                    isActive
                      ? theme.colors.text.inverse
                      : theme.colors.emerald[500]
                  }
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {postsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={48}
            color={theme.colors.border.default}
          />
          <Text style={styles.emptyText}>No materials found</Text>
          <Text style={styles.emptySubtext}>Try a different category</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.postsList}
          showsVerticalScrollIndicator={false}
        >
          {posts.map(renderPostRow)}
        </ScrollView>
      )}
    </View>
  );

  const renderPostRow = (post: Post) => {
    let rawUrl = post.images?.[0]?.url?.trim();
    if (!rawUrl) {
      rawUrl =
        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
    } else if (
      rawUrl.includes("cloudinary.com") &&
      rawUrl.startsWith("http://")
    ) {
      rawUrl = rawUrl.replace("http://", "https://");
    }
    const isFree = (post as any).price === 0 || !(post as any).price;
    const badgeText = isFree ? "FREE" : `$${(post as any).price}`;
    const formattedDate = post.createdAt
      ? new Date(post.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Recent";

    return (
      <TouchableOpacity
        key={post.id}
        activeOpacity={0.8}
        onPress={() => router.push(`/citizen/${post.id}`)}
        style={styles.postCard}
      >
        <Image
          source={{ uri: rawUrl }}
          style={styles.postImage}
          contentFit="cover"
        />
        <View style={styles.postBody}>
          <View style={styles.postTitleRow}>
            <Text numberOfLines={1} style={styles.postTitle}>
              {(post as any).title || "Untitled Material"}
            </Text>
            <View
              style={[
                styles.priceBadge,
                {
                  backgroundColor: isFree
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            >
              <Text style={styles.priceBadgeText}>{badgeText}</Text>
            </View>
          </View>

          <View style={styles.postMetaRow}>
            <MaterialCommunityIcons
              name={getCategoryIcon(post.category) as any}
              size={14}
              color={theme.colors.emerald[500]}
            />
            <Text style={styles.postMetaText}>
              {post.category
                ? post.category.charAt(0).toUpperCase() +
                  post.category.slice(1).toLowerCase()
                : "General"}
            </Text>
          </View>

          <View style={styles.postMetaRow}>
            <Feather
              name="map-pin"
              size={12}
              color={theme.colors.text.quaternary}
            />
            <Text numberOfLines={1} style={[styles.postMetaText, styles.flex]}>
              {(post as any).location || "Unknown"}
            </Text>
            <Text style={styles.postDate}>{formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Redesigned Map View ─────────────────────────────────────────
  const renderMap = () => (
    <View style={styles.flex}>
      {location ? (
        <>
          {/* Main MapLibre Map */}
          <Map
            style={styles.map}
            mapStyle={mapStyleUrl}
            attribution={false}
            logo={false}
            compass={true}
            compassPosition={{ top: 120, right: 16 }}
            onDidFailLoadingMap={() => {
              if (!hasFallenBack) {
                setHasFallenBack(true);
                console.log("Vector tile load failed, falling back to OSM raster");
                setMapStyleUrl(MAPLIBRE_STYLE_FALLBACK);
              }
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
                center: [location.coords.longitude, location.coords.latitude],
                zoom: 14.5,
              }}
              maxZoom={19}
            />

            {/* Native User Location Puck with Accuracy Circle & Heading */}
            <UserLocation animated accuracy heading />

            {/* Active Route Overlay */}
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

            {/* Post Markers */}
            {filteredPosts.map((post) => {
              const isSelected = selectedPost?.id === post.id;
              return (
                <CircularPin
                  key={`post-${post.id}`}
                  coordinate={{
                    latitude: post.latitude,
                    longitude: post.longitude,
                  }}
                  image={post.image}
                  isSelected={isSelected}
                  ringColor={
                    post.status === PostStatus.OPEN
                      ? "#3B82F6"
                      : post.status === PostStatus.CLAIMED
                      ? "#F59E0B"
                      : "#9CA3AF"
                  }
                  onPress={() => {
                    markerPressedRef.current = true;
                    setSelectedPost(post);
                    setSelectedCenter(null);
                    // Smoothly center on marker
                    cameraRef.current?.easeTo({
                      center: [post.longitude, post.latitude],
                      duration: 400,
                    });
                  }}
                />
              );
            })}

            {/* Waste Center Markers */}
            {filteredCenters.map((center) => {
              const isSelected = selectedCenter?.id === center.id;
              return (
                <CircularPin
                  key={`center-${center.id}`}
                  coordinate={{
                    latitude: center.latitude,
                    longitude: center.longitude,
                  }}
                  ringColor="#087F5B"
                  iconName="recycle"
                  isSelected={isSelected}
                  onPress={() => {
                    markerPressedRef.current = true;
                    setSelectedCenter(center);
                    setSelectedPost(null);
                    // Smoothly center on marker
                    cameraRef.current?.easeTo({
                      center: [center.longitude, center.latitude],
                      duration: 400,
                    });
                  }}
                />
              );
            })}
          </Map>

          {/* Floating Top Search Bar (Google Maps style) */}
          <View style={styles.floatingTopContainer}>
            <View style={styles.floatingSearchBar}>
              <Feather
                name="search"
                size={18}
                color={theme.colors.emerald[600]}
              />
              <TextInput
                style={styles.floatingSearchInput}
                placeholder="Search posts, centers, materials..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={mapSearchText}
                onChangeText={setMapSearchText}
              />
              {mapSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setMapSearchText("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name="x-circle"
                    size={16}
                    color={theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Horizontal Filter Chips */}
            <MapFilterBar
              categories={categories}
              selectedCategory={category}
              onSelectCategory={setCategory}
              topOffset={54}
            />
          </View>

          {/* Floating Right Controls: Recenter Location (GPS) */}
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

          {/* Floating Bottom Left: Expandable Radius Filter */}
          <MapRadiusSlider
            radius={radius}
            loadingPosts={loadingPosts}
            onRadiusChange={setRadius}
            style={{ bottom: activeRoute || selectedPost || selectedCenter ? 260 : 32 }}
          />

          {/* Bottom Sheet Card: Post Preview */}
          {selectedPost && !activeRoute && (
            <PostPreviewCard
              post={selectedPost}
              distanceText={getDistanceText(selectedPost)}
              onViewDetails={(postId) => router.push(`/citizen/${postId}`)}
              onGetDirections={() => handleGetDirections(selectedPost, "post")}
              isLoadingRoute={calculatingRoute}
            />
          )}

          {/* Bottom Sheet Card: Waste Center Preview */}
          {selectedCenter && !activeRoute && (
            <CenterPreviewCard
              center={selectedCenter}
              distanceText={getDistanceText(selectedCenter)}
              onViewDetails={(centerId) => console.log("View center", centerId)}
              onGetDirections={() =>
                handleGetDirections(selectedCenter, "center")
              }
              isLoadingRoute={calculatingRoute}
            />
          )}

          {/* Bottom Sheet Card: Active Road Route Summary */}
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
        </>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text style={styles.loadingText}>Fetching your location…</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {viewMode === "posts" ? renderPosts() : renderMap()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  flex: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.canvas.secondary,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize["3xl"].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: theme.radius.full,
  },
  segmentItemActive: {
    backgroundColor: theme.colors.emerald[500],
  },
  segmentText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.tertiary,
  },
  segmentTextActive: {
    color: theme.colors.text.inverse,
  },
  searchBarContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.md,
    height: theme.componentSizes.input.md.height,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
  },
  categoryRow: {
    paddingVertical: theme.spacing.sm,
  },
  categoryContent: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.emerald[500],
    borderColor: theme.colors.emerald[500],
  },
  categoryChipText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  categoryChipTextActive: {
    color: theme.colors.text.inverse,
  },
  postsList: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
    paddingBottom: 140,
    gap: theme.spacing.md,
  },
  postCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  postImage: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.secondary,
  },
  postBody: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  postTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  postTitle: {
    flex: 1,
    marginRight: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  priceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  priceBadgeText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  postMetaText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  postDate: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.quaternary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing["4xl"],
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  emptySubtext: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },

  // ── Floating Map UI Styles ──────────────────────────────────────
  floatingTopContainer: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingSearchBar: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.lg,
    elevation: 6,
    gap: 10,
  },
  floatingSearchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  floatingControlsRight: {
    position: "absolute",
    right: 16,
    top: 130,
    zIndex: 10,
    gap: 10,
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

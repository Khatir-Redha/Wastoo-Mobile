import { Camera, Map } from "@maplibre/maplibre-react-native";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import MapFilterBar from "../../../components/map/MapFilterBar";
import MapRadiusSlider from "../../../components/map/MapRadiusSlider";
import PostPreviewCard from "../../../components/map/PostPreviewCard";
import CenterPreviewCard from "../../../components/map/CenterPreviewCard";
import CircularPin from "../../../components/map/CircularPin";
import { MAPLIBRE_STYLE } from "../../../components/map/mapConfig";
import NotificationBell from "../../../components/NotificationBell";
import BadgesButton from "../../../components/BadgesButton";
import { theme } from "../../../theme/tokens";

type ViewMode = "posts" | "map";

const POST_CATEGORIES = [
  { id: "ALL", name: "All", icon: "view-grid" },
  { id: "PLASTIC", name: "Plastic", icon: "recycle" },
  { id: "ORGANIC", name: "Organic", icon: "leaf" },
  { id: "GLASS", name: "Glass", icon: "bottle-wine-outline" },
  { id: "METAL", name: "Metal", icon: "cube-scan" },
];

const getCategoryIcon = (category?: string) => {
  const cat = POST_CATEGORIES.find((c) => c.id.toLowerCase() === category?.toLowerCase());
  return cat ? cat.icon : "package-variant-closed";
};

export default function PostsAndMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("posts");

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapPosts, setMapPosts] = useState<MapPostsResponse[]>([]);
  const [mapCenters, setMapCenters] = useState<MapCenterResponse[]>([]);
  const [radius, setRadius] = useState(10);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [category, setCategory] = useState<WasteCategory | "ALL">("ALL");
  const [selectedPost, setSelectedPost] = useState<MapPostsResponse | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MapCenterResponse | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");

  const markerPressedRef = useRef(false);
  const categories: WasteCategory[] = [
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

  useEffect(() => {
    const fetchAllPosts = async () => {
      setPostsLoading(true);
      try {
        const query: any = {};
        if (activeCategory !== "ALL") query.category = activeCategory.toLowerCase();
        const response = await PostService.getAllPosts(query);
        const postsArray = Array.isArray(response) ? response : (response?.data || []);
        setPosts(postsArray);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchAllPosts();
  }, [activeCategory]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Posts</Text>
        <View style={styles.headerActions}>
          <BadgesButton />
          <NotificationBell />
        </View>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("posts")}
          style={[styles.segmentItem, viewMode === "posts" && styles.segmentItemActive]}
        >
          <Feather
            name="list"
            size={16}
            color={viewMode === "posts" ? theme.colors.text.inverse : theme.colors.text.tertiary}
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
          style={[styles.segmentItem, viewMode === "map" && styles.segmentItemActive]}
        >
          <Feather
            name="map"
            size={16}
            color={viewMode === "map" ? theme.colors.text.inverse : theme.colors.text.tertiary}
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

  const renderPosts = () => (
    <View style={styles.flex}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={theme.colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search materials, locations..."
            placeholderTextColor={theme.colors.text.quaternary}
            onChangeText={(text) => {}}
          />
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
                  color={isActive ? theme.colors.text.inverse : theme.colors.emerald[500]}
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
      rawUrl = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
    } else if (rawUrl.includes("cloudinary.com") && rawUrl.startsWith("http://")) {
      rawUrl = rawUrl.replace("http://", "https://");
    }
    const isFree = (post as any).price === 0 || !(post as any).price;
    const badgeText = isFree ? "FREE" : `$${(post as any).price}`;
    const formattedDate = post.createdAt
      ? new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recent";

    return (
      <TouchableOpacity
        key={post.id}
        activeOpacity={0.8}
        onPress={() => router.push(`/citizen/${post.id}`)}
        style={styles.postCard}
      >
        <Image source={{ uri: rawUrl }} style={styles.postImage} contentFit="cover" />
        <View style={styles.postBody}>
          <View style={styles.postTitleRow}>
            <Text numberOfLines={1} style={styles.postTitle}>
              {(post as any).title || "Untitled Material"}
            </Text>
            <View
              style={[
                styles.priceBadge,
                { backgroundColor: isFree ? theme.colors.success : theme.colors.warning },
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
                ? post.category.charAt(0).toUpperCase() + post.category.slice(1).toLowerCase()
                : "General"}
            </Text>
          </View>

          <View style={styles.postMetaRow}>
            <Feather name="map-pin" size={12} color={theme.colors.text.quaternary} />
            <Text numberOfLines={1} style={[styles.postMetaText, styles.flex]}>
              {(post as any).location || "Unknown"}
            </Text>
            <Text style={styles.postDate}>{formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMap = () => (
    <View style={styles.flex}>
      {location ? (
        <>
          <Map
            mapStyle={MAPLIBRE_STYLE as any}
            onRegionDidChange={(e: any) => {}}
            onPress={() => {
              if (!markerPressedRef.current) {
                setSelectedPost(null);
                setSelectedCenter(null);
              }
              markerPressedRef.current = false;
            }}
          >
            <Camera
              initialViewState={{
                center: [location.coords.longitude, location.coords.latitude],
                zoom: 14,
              }}
              maxZoom={19}
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
                  markerPressedRef.current = true;
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
                  markerPressedRef.current = true;
                  setSelectedCenter(center);
                  setSelectedPost(null);
                }}
              />
            ))}
          </Map>

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
        </>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text style={styles.loadingText}>Loading location...</Text>
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
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.canvas.secondary,
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
});

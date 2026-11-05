import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import PostService, { Post } from "../../../services/post.service";
import { useAuth } from "../../../context/AuthProvider";
import { theme } from "../../theme/tokens";
import PostCard from "./PostCard";

type FeedRole = "citizen" | "collector";

type PostFeedProps = {
  role: FeedRole;
};

const PAGE_SIZE = 20;
const COLLECTOR_STATUSES = ["OPEN", "CLAIMED", "COMPLETED"];
type CategoryFilter =
  | "ALL"
  | "PLASTIC"
  | "PAPER"
  | "METAL"
  | "GLASS"
  | "ORGANIC"
  | "TEXTILE"
  | "HAZARDOUS"
  | "MIXED";
const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PLASTIC", label: "Plastic" },
  { value: "PAPER", label: "Paper" },
  { value: "METAL", label: "Metal" },
  { value: "GLASS", label: "Glass" },
  { value: "ORGANIC", label: "Organic" },
  { value: "TEXTILE", label: "Textile" },
  { value: "HAZARDOUS", label: "Hazardous" },
  { value: "MIXED", label: "Mixed" },
];

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

const uniquePosts = (posts: Post[]) =>
  Array.from(new Map(posts.map((post) => [post.id, post])).values());

function FeedSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonAuthor}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonShortLine]} />
        </View>
      </View>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonShortLine]} />
      </View>
    </View>
  );
}

export default function PostFeed({ role }: PostFeedProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const statusPagesRef = useRef(
    new Map<string, { page: number; totalPages: number }>(),
  );
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      const requestId = ++requestIdRef.current;
      statusPagesRef.current.clear();
      loadingMoreRef.current = false;
      setLoadingMore(false);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setPageError(null);

      try {
        const statuses =
          role === "collector" ? COLLECTOR_STATUSES : ["OPEN"];
        const [responses, myPosts] = await Promise.all([
          Promise.all(
            statuses.map((status) =>
              PostService.getAllPosts({
                ...(category !== "ALL" && { category }),
                status,
                page: 1,
                limit: PAGE_SIZE,
              }),
            ),
          ),
          role === "citizen"
            ? PostService.getMyPosts().catch((myPostsError: unknown) => {
                console.error(
                  "Failed to load the citizen's own posts; continuing with marketplace listings:",
                  myPostsError,
                );
                return [];
              })
            : Promise.resolve([]),
        ]);
        if (requestId !== requestIdRef.current) return;

        const ownPosts =
          role === "citizen"
            ? myPosts.filter(
                (post) =>
                  category === "ALL" ||
                  post.category?.toUpperCase() === category,
              )
            : [];
        statusPagesRef.current = new Map(
          statuses.map((status, index) => [
            status,
            { page: 1, totalPages: responses[index].meta.totalPages },
          ]),
        );
        setPosts(
          uniquePosts([
            ...responses.flatMap((response) => response.data),
            ...ownPosts,
          ]),
        );
      } catch (loadError) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load marketplace posts:", loadError);
        setError(errorMessage(loadError));
        setPosts([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [category, role],
  );

  useEffect(() => {
    void loadFirstPage();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;

    const pendingStatuses = [...statusPagesRef.current.entries()].filter(
      ([, state]) => state.page < state.totalPages,
    );
    if (pendingStatuses.length === 0) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPageError(null);
    const requestId = requestIdRef.current;
    try {
      const responses = await Promise.all(
        pendingStatuses.map(async ([status, state]) => ({
          status,
          response: await PostService.getAllPosts({
            ...(category !== "ALL" && { category }),
            status,
            page: state.page + 1,
            limit: PAGE_SIZE,
          }),
        })),
      );
      if (requestId !== requestIdRef.current) return;

      const nextStatusPages = new Map(statusPagesRef.current);
      for (const { status, response } of responses) {
        nextStatusPages.set(status, {
          page: response.meta.page,
          totalPages: response.meta.totalPages,
        });
      }
      statusPagesRef.current = nextStatusPages;
      setPosts((current) =>
        uniquePosts([
          ...current,
          ...responses.flatMap(({ response }) => response.data),
        ]),
      );
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load more marketplace posts:", loadError);
      setPageError(errorMessage(loadError));
    } finally {
      loadingMoreRef.current = false;
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }, [category]);

  const visiblePosts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return posts;
    return posts.filter((post) =>
      [post.title, post.description, post.address, post.location]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(term)),
    );
  }, [posts, search]);

  const handleDelete = async (postId: number) => {
    try {
      await PostService.deletePost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (deleteError) {
      console.error("Failed to delete marketplace post:", deleteError);
      Alert.alert("Could not delete listing", errorMessage(deleteError));
    }
  };

  const openCreatePost = () => {
    const targetRoute = "/citizen/create-post";
    console.info("[CreatePost] PLUS_BUTTON_PRESSED");
    console.info("[CreatePost] NAVIGATION_STARTED");
    console.info("[CreatePost] TARGET_ROUTE", targetRoute);
    router.push(targetRoute);
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isOwner = item.author_id === user?.id;
    return (
      <PostCard
        post={item}
        isOwner={isOwner}
        ownerName={user?.name}
        onViewDetails={() => router.push(`/citizen/${item.id}`)}
        onEdit={
          isOwner && item.status?.toUpperCase() === "OPEN"
            ? () => router.push(`/citizen/${item.id}/update-post`)
            : undefined
        }
        onDelete={
          isOwner && item.status?.toUpperCase() === "OPEN"
            ? () => void handleDelete(item.id)
            : undefined
        }
        onRequestPickup={
          role === "collector" && !isOwner
            ? () => router.push(`/pickups/create?post_id=${item.id}`)
            : undefined
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={theme.colors.text.tertiary} />
        <TextInput
          accessibilityLabel="Search listings"
          placeholder="Search materials or locations"
          placeholderTextColor={theme.colors.text.quaternary}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setSearch("")}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={theme.colors.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryList}
      >
        {CATEGORIES.map((item) => {
          const selected = category === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCategory(item.value)}
              style={[
                styles.categoryChip,
                selected && styles.categoryChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  selected && styles.categoryLabelSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ScrollView
          style={styles.loadingList}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          <FeedSkeleton />
          <FeedSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          contentContainerStyle={[
            styles.feedContent,
            role === "citizen" && styles.feedContentWithFab,
            visiblePosts.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadFirstPage(true)}
              tintColor={theme.colors.emerald[500]}
              colors={[theme.colors.emerald[500]]}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.45}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {error ? (
                <>
                  <MaterialCommunityIcons
                    name="cloud-alert-outline"
                    size={48}
                    color={theme.colors.text.tertiary}
                  />
                  <Text style={styles.emptyTitle}>Could not load listings</Text>
                  <Text style={styles.emptyDescription}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadFirstPage()}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="recycle"
                    size={48}
                    color={theme.colors.mint[500]}
                  />
                  <Text style={styles.emptyTitle}>
                    {search ? "No matching listings" : "No listings yet"}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {search
                      ? "Try another search or choose a different category."
                      : "New recyclable materials will show up here."}
                  </Text>
                </>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore || pageError ? (
              <View style={styles.footer}>
                {loadingMore ? (
                  <Text style={styles.footerText}>Loading more listings…</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadMore()}
                  >
                    <Text style={styles.retryText}>
                      Could not load more · Tap to retry
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      )}

      {role === "citizen" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a listing"
          onPress={openCreatePost}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
          <Text style={styles.fabLabel}>List material</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: theme.colors.forest[500],
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
  },
  categoryScroll: {
    flexGrow: 0,
    maxHeight: 46,
    marginBottom: 8,
  },
  categoryList: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  categoryChip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  categoryChipSelected: {
    borderColor: theme.colors.emerald[500],
    backgroundColor: theme.colors.emerald[500],
  },
  categoryLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  categoryLabelSelected: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  loadingList: {
    flex: 1,
  },
  feedContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 24,
  },
  feedContentWithFab: {
    paddingBottom: 92,
  },
  emptyListContent: {
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 12,
    color: theme.colors.forest[500],
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyDescription: {
    marginTop: 6,
    color: theme.colors.text.tertiary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.regular,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.emerald[500],
  },
  retryText: {
    color: theme.colors.emerald[700],
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 16,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: theme.colors.emerald[500],
    ...theme.shadows.lg,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  skeletonCard: {
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5EEE9",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  skeletonHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E5EEE9",
  },
  skeletonAuthor: {
    flex: 1,
    gap: 7,
  },
  skeletonLine: {
    width: "70%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E5EEE9",
  },
  skeletonShortLine: {
    width: "40%",
  },
  skeletonImage: {
    width: "100%",
    aspectRatio: 1.45,
    backgroundColor: "#EEF5F1",
  },
  skeletonContent: {
    gap: 9,
    padding: 16,
  },
});

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Post } from "../../../services/post.service";
import { theme } from "../../theme/tokens";

type PostCardProps = {
  post: Post;
  isOwner: boolean;
  ownerName?: string;
  onViewDetails: () => void;
  onRequestPickup?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

const imageUrls = (post: Post) =>
  (post.images ?? [])
    .map((image) => image.url)
    .filter((url): url is string => Boolean(url?.trim()))
    .map((url) =>
      url.startsWith("http://") && url.includes("cloudinary.com")
        ? url.replace("http://", "https://")
        : url,
    );

const relativeTime = (date?: string) => {
  if (!date) return "Recently posted";
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Recently posted";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(date).toLocaleDateString();
};

const statusLabel = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "Available";
    case "CLAIMED":
      return "Pickup requested";
    case "COMPLETED":
      return "Collected";
    case "DELETED":
      return "Unavailable";
    default:
      return status ?? "Status unavailable";
  }
};

function ImageFallback() {
  return (
    <View style={styles.imageFallback}>
      <MaterialCommunityIcons
        name="recycle"
        size={42}
        color={theme.colors.emerald[500]}
      />
      <Text style={styles.imageFallbackText}>No photo available</Text>
    </View>
  );
}

export default function PostCard({
  post,
  isOwner,
  ownerName,
  onViewDetails,
  onRequestPickup,
  onEdit,
  onDelete,
}: PostCardProps) {
  const images = imageUrls(post);
  const [mediaWidth, setMediaWidth] = useState(
    Math.max(1, Dimensions.get("window").width - 36),
  );
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const title = post.title?.trim() || "Recyclable material";
  const category = post.category
    ? post.category.charAt(0) + post.category.slice(1).toLowerCase()
    : "General";
  const location = post.address || post.location;
  const quantity = post.quantity ?? post.weight;
  const canManage = isOwner && post.status?.toUpperCase() === "OPEN";
  const isAvailable = post.status?.toUpperCase() === "OPEN";
  const displayName =
    post.author?.name ||
    post.User?.name ||
    (isOwner ? ownerName : undefined) ||
    "Wastoo member";
  const avatar = post.author?.photo || post.author?.avatar || post.User?.photo;

  const handleOptions = () => {
    const options: {
      text: string;
      style?: "cancel" | "destructive";
      onPress?: () => void;
    }[] = [{ text: "Cancel", style: "cancel" }];

    if (onEdit) options.unshift({ text: "Edit listing", onPress: onEdit });
    if (onDelete) {
      options.splice(options.length - 1, 0, {
        text: "Delete listing",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Delete this listing?",
            "This listing will no longer be visible to collectors.",
            [
              { text: "Keep listing", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ],
          ),
      });
    }

    Alert.alert("Listing options", undefined, options);
  };

  const handleMediaScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    setActiveImage(
      Math.round(
        event.nativeEvent.contentOffset.x /
          event.nativeEvent.layoutMeasurement.width,
      ),
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Feather name="user" size={18} color={theme.colors.emerald[700]} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text numberOfLines={1} style={styles.authorName}>
            {displayName}
            {isOwner ? " · You" : ""}
          </Text>
          <View style={styles.authorMeta}>
            <Text numberOfLines={1} style={styles.locationText}>
              {location || "Location not provided"}
            </Text>
            <Text style={styles.metaSeparator}>·</Text>
            <Text style={styles.timeText}>{relativeTime(post.createdAt)}</Text>
          </View>
        </View>
        {canManage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listing options"
            onPress={handleOptions}
            hitSlop={8}
            style={styles.optionsButton}
          >
            <Feather
              name="more-horizontal"
              size={22}
              color={theme.colors.text.secondary}
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={styles.media}
        onLayout={(event) => setMediaWidth(event.nativeEvent.layout.width)}
      >
        {images.length ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleMediaScroll}
              accessibilityLabel={`${images.length} listing photos`}
            >
              {images.map((url, index) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${title}, photo ${index + 1}`}
                  key={`${url}-${index}`}
                  onPress={onViewDetails}
                >
                  {failedImages.includes(url) ? (
                    <View style={[styles.mediaImage, { width: mediaWidth }]}>
                      <ImageFallback />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: url }}
                      style={[styles.mediaImage, { width: mediaWidth }]}
                      contentFit="cover"
                      onError={() =>
                        setFailedImages((current) =>
                          current.includes(url) ? current : [...current, url],
                        )
                      }
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            {images.length > 1 ? (
              <View style={styles.imagePagination}>
                {images.map((url, index) => (
                  <View
                    key={`${url}-dot-${index}`}
                    style={[
                      styles.imageDot,
                      index === activeImage && styles.imageDotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <ImageFallback />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onViewDetails}
            style={styles.titleButton}
          >
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
          </Pressable>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>
        {post.description ? (
          <Text numberOfLines={3} style={styles.description}>
            {post.description}
          </Text>
        ) : null}

        <View style={styles.infoRow}>
          {quantity != null ? (
            <View style={styles.infoItem}>
              <Feather
                name="package"
                size={15}
                color={theme.colors.emerald[600]}
              />
              <Text style={styles.infoText}>{quantity} kg</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.statusBadge,
              isAvailable ? styles.availableBadge : styles.unavailableBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isAvailable ? styles.availableDot : styles.unavailableDot,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isAvailable ? styles.availableText : styles.unavailableText,
              ]}
            >
              {statusLabel(post.status)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={onViewDetails}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>View details</Text>
          </Pressable>
          {onRequestPickup ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !isAvailable }}
              disabled={!isAvailable}
              onPress={onRequestPickup}
              style={({ pressed }) => [
                styles.primaryButton,
                !isAvailable && styles.disabledButton,
                pressed && isAvailable && styles.buttonPressed,
              ]}
            >
              <Feather
                name="truck"
                size={16}
                color={theme.colors.text.inverse}
              />
              <Text style={styles.primaryButtonText}>
                {isAvailable ? "Request pickup" : "Unavailable"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EEE9",
    backgroundColor: "#FFFFFF",
    ...theme.shadows.sm,
  },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.mint[50],
  },
  avatarFallback: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: theme.colors.mint[50],
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    color: theme.colors.forest[500],
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  authorMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  locationText: {
    flexShrink: 1,
    color: theme.colors.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.regular,
  },
  metaSeparator: {
    marginHorizontal: 5,
    color: theme.colors.text.tertiary,
    fontSize: 12,
  },
  timeText: {
    color: theme.colors.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.regular,
  },
  optionsButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  media: {
    width: "100%",
    aspectRatio: 1.45,
    overflow: "hidden",
    backgroundColor: "#EEF5F1",
  },
  mediaImage: {
    height: "100%",
    backgroundColor: "#EEF5F1",
  },
  imageFallback: {
    flex: 1,
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5F1",
  },
  imageFallbackText: {
    marginTop: 8,
    color: theme.colors.text.tertiary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
  },
  imagePagination: {
    position: "absolute",
    right: 0,
    bottom: 10,
    left: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  imageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  imageDotActive: {
    width: 16,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  titleButton: {
    flex: 1,
  },
  title: {
    color: theme.colors.forest[500],
    fontSize: 18,
    lineHeight: 24,
    fontFamily: theme.typography.fontFamily.bold,
  },
  categoryBadge: {
    marginTop: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.mint[50],
  },
  categoryText: {
    color: theme.colors.emerald[700],
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  description: {
    marginTop: 7,
    color: theme.colors.text.secondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: theme.typography.fontFamily.regular,
  },
  infoRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 9,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    color: theme.colors.forest[500],
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  availableBadge: {
    backgroundColor: "#EAF7F0",
  },
  unavailableBadge: {
    backgroundColor: "#F2F4F3",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  availableDot: {
    backgroundColor: theme.colors.emerald[500],
  },
  unavailableDot: {
    backgroundColor: theme.colors.text.tertiary,
  },
  statusText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  availableText: {
    color: theme.colors.emerald[700],
  },
  unavailableText: {
    color: theme.colors.text.tertiary,
  },
  footer: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 44,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: theme.colors.emerald[500],
  },
  secondaryButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.mint[50],
  },
  primaryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  secondaryButtonText: {
    color: theme.colors.emerald[700],
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  disabledButton: {
    backgroundColor: "#AEBBB5",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});

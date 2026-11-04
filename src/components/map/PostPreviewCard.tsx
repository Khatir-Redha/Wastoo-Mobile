import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { MapPostsResponse, PostStatus, WasteCategory } from "../../../services/map.service";
import { theme } from "../../theme/tokens";

interface PostPreviewCardProps {
  post: MapPostsResponse;
  distanceText: string;
  onViewDetails: (postId: number) => void;
  onGetDirections?: (post: MapPostsResponse) => void;
  isLoadingRoute?: boolean;
  onDismiss?: () => void;
  bottomOffset?: number;
}

export default function PostPreviewCard({
  post,
  distanceText,
  onViewDetails,
  onGetDirections,
  isLoadingRoute = false,
  onDismiss,
  bottomOffset = 16,
}: PostPreviewCardProps) {
  const getCategoryLabel = (value?: WasteCategory) => {
    if (value === undefined) return "Waste";
    return WasteCategory[value] ?? "Waste";
  };

  const statusColor =
    post.status === PostStatus.OPEN
      ? theme.colors.success
      : post.status === PostStatus.CLAIMED
        ? theme.colors.warning
        : "#9CA3AF";
  const imageUri = post.image;

  return (
    <View style={[styles.cardContainer, { bottom: bottomOffset }]}>
      <View style={styles.grabber} />
      <View style={styles.contentRow}>
        {/* Post thumbnail */}
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <MaterialCommunityIcons
              name="recycle"
              size={26}
              color={theme.colors.emerald[600]}
            />
          </View>
        )}

        {/* Post details */}
        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {post.title || "Recyclable Material"}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {getCategoryLabel(post.category)}
              </Text>
            </View>
          </View>

          {/* Status & distance */}
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>
              {post.status === PostStatus.OPEN ? "Available for pickup" : "Updated"}
            </Text>
          </View>

          <View style={styles.distanceRow}>
            <Feather name="navigation" size={13} color={theme.colors.emerald[500]} />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss selected post"
            onPress={onDismiss}
            hitSlop={8}
            style={styles.dismissButton}
          >
            <Feather name="x" size={18} color={theme.colors.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Action Buttons: Directions (primary) + View Details */}
      <View style={styles.actionsRow}>
        {onGetDirections && (
          <Pressable
            accessibilityRole="button"
            style={[styles.directionsButton, isLoadingRoute && styles.buttonDisabled]}
            onPress={() => onGetDirections(post)}
            disabled={isLoadingRoute}
          >
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="directions"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.directionsButtonText}>Directions</Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          style={styles.detailsButton}
          onPress={() => onViewDetails(post.id)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
          <Feather name="chevron-right" size={16} color={theme.colors.emerald[600]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#E6EEE9",
    shadowColor: "#172B2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  grabber: {
    alignSelf: "center",
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#DCE6E0",
    marginBottom: 12,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 13,
    backgroundColor: "#EEF5F1",
  },
  thumbnailFallback: {
    width: 76,
    height: 76,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.emerald[50],
  },
  detailsCol: {
    flex: 1,
    minHeight: 76,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  title: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.forest[500],
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  categoryBadge: {
    backgroundColor: "#EAF6F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  categoryBadgeText: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.emerald[600],
  },
  dismissButton: {
    width: 30,
    height: 30,
    marginLeft: 4,
    marginTop: -3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F5F8F6",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.emerald[500],
    borderRadius: 12,
    minHeight: 46,
    gap: 6,
    ...theme.shadows.sm,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  detailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvas.secondary,
    borderRadius: 12,
    minHeight: 46,
    gap: 4,
  },
  detailsButtonText: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});

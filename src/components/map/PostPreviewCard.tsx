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
}

export default function PostPreviewCard({
  post,
  distanceText,
  onViewDetails,
  onGetDirections,
  isLoadingRoute = false,
}: PostPreviewCardProps) {
  const getCategoryLabel = (value?: WasteCategory) => {
    if (value === undefined) return "Waste";
    return WasteCategory[value] ?? "Waste";
  };

  const isFree = true; // In civil post map, materials are typically free pickup
  const imageUri = post.image || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";

  return (
    <View style={styles.cardContainer}>
      <View style={styles.contentRow}>
        {/* Post thumbnail */}
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbnail}
          contentFit="cover"
        />

        {/* Post details */}
        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
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
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {post.status === PostStatus.OPEN ? "Available for pickup" : "Updated"}
            </Text>
          </View>

          <View style={styles.distanceRow}>
            <Feather name="navigation" size={13} color={theme.colors.emerald[500]} />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons: Directions (primary) + View Details */}
      <View style={styles.actionsRow}>
        {onGetDirections && (
          <Pressable
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
    bottom: 92,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.xl,
    elevation: 8,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
  },
  detailsCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 6,
  },
  categoryBadge: {
    backgroundColor: theme.colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    paddingVertical: 10,
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
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    gap: 4,
  },
  detailsButtonText: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});

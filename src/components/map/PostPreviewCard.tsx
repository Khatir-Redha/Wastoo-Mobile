import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { MapPostResponse, WasteCategory, PostStatus } from "../../../services/map.service";
import { theme } from "../../theme/tokens";
import { getCategoryColor, getCategoryIcon, getCategoryName } from "../../utils/category-utils";
import { getPostQuantities } from "../../utils/post-quantities";

interface PostPreviewCardProps {
  post: MapPostResponse;
  distanceText: string;
  onViewDetails: (postId: number) => void;
  onGetDirections?: (post: MapPostResponse) => void;
  isLoadingRoute?: boolean;
  onDismiss?: () => void;
  bottomOffset?: number;
}

const getStatusColor = (status: PostStatus) => {
  switch (status) {
    case PostStatus.OPEN: return theme.colors.emerald[500];
    case PostStatus.CLAIMED: return theme.colors.warning[500];
    case PostStatus.COMPLETED: return theme.colors.success;
    default: return theme.colors.text.tertiary;
  }
};

const getAvailabilityText = (post: MapPostResponse) => {
  const quantities = getPostQuantities(post);
  const available = quantities.available ?? 0;
  const total = quantities.total ?? 0;

  if (available <= 0) {
    return { text: "Fully Reserved", color: theme.colors.text.tertiary };
  }

  const unit = quantities.unit;

  return {
    text: `Available • ${available} / ${total} ${unit}`,
    color: theme.colors.emerald[600]
  };
};

export default function PostPreviewCard({
  post,
  distanceText,
  onViewDetails,
  onGetDirections,
  isLoadingRoute = false,
  onDismiss,
  bottomOffset = 16,
}: PostPreviewCardProps) {
  const imageUri = post.image;
  const availability = getAvailabilityText(post);

  return (
    <View style={[styles.cardContainer, { bottom: bottomOffset }]}>
      <View style={styles.grabber} />
      <View style={styles.contentRow}>
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
              color={getCategoryColor(post.category)}
            />
          </View>
        )}

        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {post.title}
            </Text>
            <View style={[styles.availabilityBadge, { backgroundColor: availability.color }]}>
              <Text style={styles.availabilityText}>{availability.text}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name={getCategoryIcon(post.category) as any}
                size={14}
                color={getCategoryColor(post.category)}
              />
              <Text style={styles.categoryText}>
                {getCategoryName(post.category)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={theme.colors.text.quaternary} />
              <Text style={styles.distanceText}>{distanceText}</Text>
            </View>
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
    left: 12,
    right: 12,
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
    zIndex: 40,
    elevation: 16,
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
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  availabilityText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  distanceText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.tertiary,
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
    backgroundColor: "#F2F7F4",
    borderRadius: 12,
    minHeight: 46,
    gap: 4,
  },
  detailsButtonText: {
    color: theme.colors.emerald[600],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
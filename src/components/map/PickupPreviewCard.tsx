import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MapPickupResponse } from "../../../services/map.service";
import { theme } from "../../theme/tokens";

interface PickupPreviewCardProps {
  pickup: MapPickupResponse;
  distanceText: string;
  onViewDetails: (pickupId: number) => void;
  onGetDirections?: (pickup: MapPickupResponse) => void;
  isLoadingRoute?: boolean;
  onDismiss?: () => void;
  bottomOffset?: number;
}

const formatStatus = (status?: string) =>
  (status || "")
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function PickupPreviewCard({
  pickup,
  distanceText,
  onViewDetails,
  onGetDirections,
  isLoadingRoute = false,
  onDismiss,
  bottomOffset = 16,
}: PickupPreviewCardProps) {
  const imageUri = pickup.post?.image;

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
              color={theme.colors.emerald[600]}
            />
          </View>
        )}

        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {pickup.post?.title || `Pickup #${pickup.id}`}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {formatStatus(pickup.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.metaText} numberOfLines={1}>
            {pickup.post?.title || 'Unknown Post'}
          </Text>
          <View style={styles.distanceBadge}>
            <Feather name="navigation" size={12} color={theme.colors.emerald[600]} />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss selected pickup"
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
            onPress={() => onGetDirections(pickup)}
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
          onPress={() => onViewDetails(pickup.id)}
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
  statusBadge: {
    backgroundColor: "#EAF6F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusBadgeText: {
    color: theme.colors.emerald[700],
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  metaText: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    marginBottom: 7,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.forest[500],
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
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});

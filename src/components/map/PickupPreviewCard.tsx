import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MapPickupResponse } from "../../../services/map.service";
import { theme } from "../../theme/tokens";

interface PickupPreviewCardProps {
  pickup: MapPickupResponse;
  distanceText: string;
  onViewDetails: (pickupId: number) => void;
  onGetDirections?: (pickup: MapPickupResponse) => void;
  isLoadingRoute?: boolean;
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
}: PickupPreviewCardProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.contentRow}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name="truck-delivery"
            size={26}
            color={theme.colors.emerald[600]}
          />
        </View>

        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {pickup.post?.title || `Pickup #${pickup.id}`}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {formatStatus(pickup.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.metaText}>📦 Post #{pickup.post?.id}</Text>
          <View style={styles.distanceBadge}>
            <Feather name="navigation" size={11} color={theme.colors.emerald[600]} />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onGetDirections && (
          <Pressable
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
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.emerald[100],
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
  statusBadge: {
    backgroundColor: theme.colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  statusBadgeText: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  metaText: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    marginBottom: 2,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
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

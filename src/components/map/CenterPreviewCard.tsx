import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MapCenterResponse } from "../../../services/map.service";
import { theme } from "../../theme/tokens";

interface CenterPreviewCardProps {
  center: MapCenterResponse;
  distanceText: string;
  onViewDetails?: (centerId: number) => void;
  onGetDirections?: (center: MapCenterResponse) => void;
  isLoadingRoute?: boolean;
  onDismiss?: () => void;
  bottomOffset?: number;
}

export default function CenterPreviewCard({
  center,
  distanceText,
  onViewDetails,
  onGetDirections,
  isLoadingRoute = false,
  onDismiss,
  bottomOffset = 16,
}: CenterPreviewCardProps) {
  return (
    <View style={[styles.cardContainer, { bottom: bottomOffset }]}>
      <View style={styles.grabber} />
      <View style={styles.contentRow}>
        {/* Center icon badge */}
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name="recycle"
            size={28}
            color={theme.colors.emerald[600]}
          />
        </View>

        {/* Center info */}
        <View style={styles.detailsCol}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {center.name}
            </Text>
            <View style={styles.centerBadge}>
              <Text style={styles.centerBadgeText}>Center</Text>
            </View>
            {onDismiss ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss selected center"
                onPress={onDismiss}
                hitSlop={8}
                style={styles.dismissButton}
              >
                <Feather name="x" size={18} color={theme.colors.text.tertiary} />
              </Pressable>
            ) : null}
          </View>

          {/* Address */}
          {center.address ? (
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={12} color={theme.colors.text.tertiary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {center.address}
              </Text>
            </View>
          ) : null}

          {/* Hours & Distance */}
          <View style={styles.metaRow}>
            {center.opening_hours ? (
              <View style={styles.hoursRow}>
                <Feather name="clock" size={12} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>{center.opening_hours}</Text>
              </View>
            ) : null}
            <View style={styles.distanceBadge}>
              <Feather name="navigation" size={11} color={theme.colors.emerald[600]} />
              <Text style={styles.distanceText}>{distanceText}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons: Directions (primary) + Details/Call */}
      <View style={styles.actionsRow}>
        {onGetDirections && (
          <Pressable
            style={[styles.directionsButton, isLoadingRoute && styles.buttonDisabled]}
            onPress={() => onGetDirections(center)}
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

        {onViewDetails && (
          <Pressable
            style={styles.detailsButton}
            onPress={() => onViewDetails(center.id)}
          >
            <Text style={styles.detailsButtonText}>Center Info</Text>
            <Feather name="chevron-right" size={16} color={theme.colors.emerald[600]} />
          </Pressable>
        )}
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
    alignItems: "center",
  },
  iconBadge: {
    width: 56,
    height: 56,
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
  centerBadge: {
    backgroundColor: theme.colors.emerald[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  centerBadgeText: {
    color: theme.colors.emerald[800],
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 8,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
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

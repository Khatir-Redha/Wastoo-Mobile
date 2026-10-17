import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme/tokens";
import {
  formatDistance,
  formatDuration,
} from "../../../services/routing.service";

interface RouteSummaryProps {
  destinationName: string;
  distanceMeters: number;
  durationSeconds: number;
  destinationCoordinate: { latitude: number; longitude: number };
  onClose: () => void;
  loading?: boolean;
}

/**
 * A polished bottom-sheet card that displays route information
 * after a route has been calculated.
 */
export default function RouteSummary({
  destinationName,
  distanceMeters,
  durationSeconds,
  destinationCoordinate,
  onClose,
  loading = false,
}: RouteSummaryProps) {
  const openExternalNavigation = () => {
    const { latitude, longitude } = destinationCoordinate;
    const label = encodeURIComponent(destinationName);

    // Try Google Maps on both platforms
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

    Linking.canOpenURL(googleUrl).then((supported) => {
      if (supported) {
        Linking.openURL(googleUrl);
      } else if (Platform.OS === "ios") {
        // Fallback to Apple Maps
        Linking.openURL(
          `maps://app?daddr=${latitude},${longitude}&q=${label}`
        );
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.emerald[500]} />
          <Text style={styles.loadingText}>Calculating route…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Handle bar */}
      <View style={styles.handleBar} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="navigation-variant"
              size={18}
              color={theme.colors.emerald[500]}
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.destinationName} numberOfLines={1}>
              {destinationName}
            </Text>
            <Text style={styles.routeLabel}>Driving route</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={20} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Feather
            name="clock"
            size={16}
            color={theme.colors.emerald[500]}
          />
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>
              {formatDuration(durationSeconds)}
            </Text>
            <Text style={styles.statLabel}>est. travel time</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="map-marker-distance"
            size={16}
            color={theme.colors.emerald[500]}
          />
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>
              {formatDistance(distanceMeters)}
            </Text>
            <Text style={styles.statLabel}>distance</Text>
          </View>
        </View>
      </View>

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={openExternalNavigation}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="navigation"
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.navigateText}>Open in Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Feather name="x-circle" size={16} color={theme.colors.text.tertiary} />
          <Text style={styles.clearText}>Clear route</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 12,
    right: 12,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    padding: 16,
    ...theme.shadows.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.default,
    alignSelf: "center",
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: theme.typography.fontSize.md.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  destinationName: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  routeLabel: {
    fontSize: theme.typography.fontSize.sm.size,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.fontFamily.regular,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.canvas.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.canvas.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  statTextContainer: {
    marginLeft: 8,
  },
  statValue: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs.size,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.fontFamily.regular,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
    marginHorizontal: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navigateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.emerald[500],
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 6,
  },
  navigateText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvas.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    gap: 4,
  },
  clearText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
});

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme/tokens";

interface MapRadiusSliderProps {
  radius: number;
  loadingPosts: boolean;
  onRadiusChange: (value: number) => void;
  style?: any;
}

const PRESET_DISTANCES = [5, 10, 25, 50];

export default function MapRadiusSlider({
  radius,
  loadingPosts,
  onRadiusChange,
  style,
}: MapRadiusSliderProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Pill Toggle Button */}
      <Pressable
        style={({ pressed }) => [
          styles.pillButton,
          expanded && styles.pillButtonActive,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => setExpanded(!expanded)}
      >
        <MaterialCommunityIcons
          name="radius-outline"
          size={16}
          color={expanded ? "#FFFFFF" : theme.colors.emerald[600]}
        />
        <Text
          style={[
            styles.pillText,
            expanded && styles.pillTextActive,
          ]}
        >
          {radius} km {loadingPosts ? "…" : ""}
        </Text>
        <Feather
          name={expanded ? "chevron-down" : "chevron-up"}
          size={14}
          color={expanded ? "#FFFFFF" : theme.colors.text.tertiary}
        />
      </Pressable>

      {/* Expanded Slider Panel */}
      {expanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Search Radius</Text>
            <Text style={styles.panelValue}>
              {radius} km {loadingPosts && "(loading...)"}
            </Text>
          </View>

          {/* Quick presets */}
          <View style={styles.presetsRow}>
            {PRESET_DISTANCES.map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.presetChip,
                  radius === d && styles.presetChipActive,
                ]}
                onPress={() => onRadiusChange(d)}
              >
                <Text
                  style={[
                    styles.presetText,
                    radius === d && styles.presetTextActive,
                  ]}
                >
                  {d} km
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Slider */}
          <Slider
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={radius}
            onValueChange={onRadiusChange}
            minimumTrackTintColor={theme.colors.emerald[500]}
            maximumTrackTintColor={theme.colors.border.default}
            thumbTintColor={theme.colors.emerald[600]}
            style={styles.slider}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 24,
    left: 16,
    zIndex: 10,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    gap: 6,
    ...theme.shadows.md,
    elevation: 4,
  },
  pillButtonActive: {
    backgroundColor: theme.colors.emerald[500],
    borderColor: theme.colors.emerald[600],
  },
  pillText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  expandedPanel: {
    marginTop: 8,
    width: 220,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.lg,
    elevation: 6,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  panelValue: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.emerald[600],
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.canvas.secondary,
  },
  presetChipActive: {
    backgroundColor: theme.colors.emerald[500],
  },
  presetText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  presetTextActive: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.bold,
  },
  slider: {
    width: "100%",
    height: 30,
  },
});

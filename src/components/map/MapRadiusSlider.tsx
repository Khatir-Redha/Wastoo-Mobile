import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/tokens";

interface MapRadiusSliderProps {
  radius: number;
  loadingPosts: boolean;
  onRadiusChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

const PRESET_DISTANCES = [5, 10, 25, 50];

export default function MapRadiusSlider({
  radius,
  loadingPosts,
  onRadiusChange,
  style,
}: MapRadiusSliderProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [draftRadius, setDraftRadius] = useState(radius);

  useEffect(() => {
    if (!visible) setDraftRadius(radius);
  }, [radius, visible]);

  const openSheet = () => {
    setDraftRadius(radius);
    setVisible(true);
  };

  const apply = () => {
    onRadiusChange(draftRadius);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Radius: ${radius} km. Open radius settings`}
        onPress={openSheet}
        style={({ pressed }) => [
          styles.radiusChip,
          style,
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons
          name="map-marker-radius-outline"
          size={18}
          color={theme.colors.emerald[600]}
        />
        <Text style={styles.radiusText}>Radius: {radius} km</Text>
        {loadingPosts ? (
          <View style={styles.loadingDot} />
        ) : (
          <Feather name="chevron-up" size={16} color={theme.colors.text.tertiary} />
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close radius settings"
            style={styles.scrim}
            onPress={() => setVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Search area</Text>
                <Text style={styles.sheetSubtitle}>
                  Find pickups near your current location
                </Text>
              </View>
              <View style={styles.valueBadge}>
                <Text style={styles.valueText}>{draftRadius} km</Text>
              </View>
            </View>

            <View style={styles.presetsRow}>
              {PRESET_DISTANCES.map((distance) => {
                const selected = draftRadius === distance;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={distance}
                    onPress={() => setDraftRadius(distance)}
                    style={[styles.preset, selected && styles.presetSelected]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        selected && styles.presetTextSelected,
                      ]}
                    >
                      {distance} km
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>5 km</Text>
              <Text style={styles.sliderLabel}>50 km</Text>
            </View>
            <Slider
              minimumValue={5}
              maximumValue={50}
              step={5}
              value={draftRadius}
              onValueChange={setDraftRadius}
              minimumTrackTintColor={theme.colors.emerald[500]}
              maximumTrackTintColor={theme.colors.border.default}
              thumbTintColor={theme.colors.emerald[600]}
              style={styles.slider}
              accessibilityLabel="Search radius"
              accessibilityValue={{
                min: 5,
                max: 50,
                now: draftRadius,
                text: `${draftRadius} kilometers`,
              }}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setVisible(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={apply}
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.applyText}>Apply area</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  radiusChip: {
    position: "absolute",
    left: 16,
    bottom: 86,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "#E3ECE7",
    backgroundColor: "#FFFFFF",
    ...theme.shadows.md,
    zIndex: 30,
    elevation: 12,
  },
  radiusText: {
    color: theme.colors.forest[500],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.mint[500],
  },
  pressed: {
    opacity: 0.88,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 34, 29, 0.36)",
  },
  sheet: {
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...theme.shadows.xl,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8E2DD",
    marginBottom: 22,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    color: theme.colors.forest[500],
    fontSize: theme.typography.fontSize.xl.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
  sheetSubtitle: {
    marginTop: 4,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.emerald[50],
  },
  valueText: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  preset: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.sm,
    backgroundColor: "#FAFCFB",
  },
  presetSelected: {
    borderColor: theme.colors.emerald[500],
    backgroundColor: theme.colors.emerald[50],
  },
  presetText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  presetTextSelected: {
    color: theme.colors.emerald[700],
    fontFamily: theme.typography.fontFamily.bold,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  sliderLabel: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  slider: {
    width: "100%",
    height: 52,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
  },
  cancelText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  applyButton: {
    flex: 1.4,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.emerald[500],
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
});

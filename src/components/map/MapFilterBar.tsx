import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WasteCategory } from "../../../services/map.service";
import { theme } from "../../theme/tokens";

interface MapFilterBarProps {
  categories: (WasteCategory | "ALL")[];
  selectedCategory: WasteCategory | "ALL";
  onSelectCategory: (category: WasteCategory | "ALL") => void;
  topOffset?: number;
}

const getCategoryMeta = (cat: WasteCategory | "ALL" | string) => {
  const str = String(cat).toUpperCase();
  switch (str) {
    case "ALL":
      return { label: "All Items", icon: "layers-outline" as const };
    case "PLASTIC":
      return { label: "Plastic", icon: "recycle" as const };
    case "GLASS":
      return { label: "Glass", icon: "bottle-wine-outline" as const };
    case "PAPER":
      return { label: "Paper", icon: "newspaper-variant-outline" as const };
    case "METAL":
      return { label: "Metal", icon: "cube-scan" as const };
    case "ORGANIC":
      return { label: "Organic", icon: "leaf" as const };
    case "TEXTILE":
      return { label: "Textile", icon: "tshirt-crew-outline" as const };
    case "HAZARDOUS":
      return { label: "Hazardous", icon: "alert-octagon-outline" as const };
    case "MIXED":
      return { label: "Mixed", icon: "package-variant-closed" as const };
    default:
      return { label: str, icon: "recycle" as const };
  }
};

export default function MapFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  topOffset = 16,
}: MapFilterBarProps) {
  return (
    <View style={[styles.chipsWrapper, { top: topOffset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {categories.map((item) => {
          const isSelected = selectedCategory === item;
          const meta = getCategoryMeta(item);

          return (
            <Pressable
              key={String(item)}
              onPress={() => onSelectCategory(item)}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.selectedChip : styles.unselectedChip,
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons
                name={meta.icon}
                size={16}
                color={isSelected ? "#FFFFFF" : theme.colors.emerald[600]}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.selectedChipText : styles.unselectedChipText,
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    gap: 6,
    ...theme.shadows.md,
    elevation: 4,
  },
  unselectedChip: {
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  selectedChip: {
    backgroundColor: theme.colors.emerald[500],
    borderWidth: 1,
    borderColor: theme.colors.emerald[600],
  },
  chipText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
  },
  unselectedChipText: {
    color: theme.colors.text.primary,
  },
  selectedChipText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});

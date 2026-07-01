import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WasteCategory } from "../../../services/map.service";

interface MapFilterBarProps {
  categories: Array<WasteCategory | "ALL">;
  selectedCategory: WasteCategory | "ALL";
  onSelectCategory: (category: WasteCategory | "ALL") => void;
}

export default function MapFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: MapFilterBarProps) {
  return (
    <View style={styles.chipsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {categories.map((item) => (
          <Pressable
            key={String(item)}
            onPress={() => onSelectCategory(item)}
            style={[styles.chip, selectedCategory === item && styles.selectedChip]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === item && styles.selectedChipText,
              ]}
            >
              {String(item)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsWrapper: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
  },
  chipsContainer: {
    paddingHorizontal: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedChip: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  chipText: {
    color: "#000",
    fontWeight: "600",
  },
  selectedChipText: {
    color: "#fff",
  },
});

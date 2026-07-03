import { Pressable, StyleSheet, Text, View } from "react-native";
import { MapCenterResponse } from "../../../services/map.service";

interface CenterPreviewCardProps {
  center: MapCenterResponse;
  distanceText: string;
  onViewDetails?: (centerId: number) => void;
}

export default function CenterPreviewCard({
  center,
  distanceText,
  onViewDetails,
}: CenterPreviewCardProps) {
  console.log(center)
  const phoneNumber = center.owner.phone ??  "Phone number coming soon";

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{center.name}</Text>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>Center</Text>
        </View>
      </View>

      <Text style={styles.previewMeta}>📍 {center.address}</Text>
      <Text style={styles.previewMeta}>🕒 {center.opening_hours}</Text>
      <Text style={styles.previewMeta}>📞 {phoneNumber}</Text>
      <Text style={styles.previewMeta}>📍 {distanceText}</Text>

      <Pressable
        style={styles.previewButton}
        onPress={() => onViewDetails?.(center.id)}
      >
        <Text style={styles.previewButtonText}>View Center</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  previewBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewBadgeText: {
    color: "#166534",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
  },
  previewMeta: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 6,
  },
  previewButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

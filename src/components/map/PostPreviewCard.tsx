import { Pressable, StyleSheet, Text, View } from "react-native";
import { MapPostsResponse, PostStatus, WasteCategory } from "../../../services/map.service";

interface PostPreviewCardProps {
  post: MapPostsResponse;
  distanceText: string;
  onViewDetails: (postId: number) => void;
}

export default function PostPreviewCard({
  post,
  distanceText,
  onViewDetails,
}: PostPreviewCardProps) {
  const getCategoryLabel = (value?: WasteCategory) => {
    if (value === undefined) return "Unknown";
    return WasteCategory[value] ?? "Unknown";
  };

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{post.title}</Text>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>{getCategoryLabel(post.category)}</Text>
        </View>
      </View>

      <Text style={styles.previewMeta}>♻️ {getCategoryLabel(post.category)}</Text>
      <Text style={styles.previewMeta}>
        💰 {post.status === PostStatus.OPEN ? "Reward available" : "Status updated"}
      </Text>
      <Text style={styles.previewMeta}>📍 {distanceText}</Text>

      <Pressable style={styles.previewButton} onPress={() => onViewDetails(post.id)}>
        <Text style={styles.previewButtonText}>View Details</Text>
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
    backgroundColor: "#ecfdf5",
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

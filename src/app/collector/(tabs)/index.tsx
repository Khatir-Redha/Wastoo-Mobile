import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import NotificationBell from "../../../components/NotificationBell";
import PostFeed from "../../../components/posts/PostFeed";
import { useAuth } from "../../../../context/AuthProvider";
import { theme } from "../../../theme/tokens";

export default function CollectorPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Collector";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Hello, {firstName}!</Text>
          <Text style={styles.subtitle}>Find materials to collect</Text>
        </View>
        <NotificationBell />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/collector/available-pickups")}
        style={({ pressed }) => [
          styles.pickupQueueButton,
          pressed && styles.pressed,
        ]}
      >
        <Feather name="truck" size={17} color={theme.colors.emerald[700]} />
        <Text style={styles.pickupQueueText}>Open pickup queue</Text>
        <Feather
          name="chevron-right"
          size={17}
          color={theme.colors.emerald[700]}
        />
      </Pressable>
      <PostFeed role="collector" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  heading: {
    flex: 1,
  },
  title: {
    color: theme.colors.forest[500],
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bold,
  },
  subtitle: {
    marginTop: 3,
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
  },
  pickupQueueButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.emerald[500],
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  pickupQueueText: {
    color: theme.colors.emerald[700],
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  pressed: {
    opacity: 0.8,
  },
});

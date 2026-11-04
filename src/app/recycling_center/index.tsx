import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthProvider";

export default function RecyclingCenterHome() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="recycle" size={25} color="#fff" />
        </View>
        <Text style={styles.eyebrow}>WASTOO • RECYCLING CENTER</Text>
        <Text style={styles.heading}>Welcome, {user?.name}</Text>
        <Text style={styles.subtitle}>
          Your account is ready. This is your Wastoo home for connecting with
          suppliers and acquiring recyclable materials.
        </Text>

        <View style={styles.profileCard}>
          <Text style={styles.cardHeading}>Your account</Text>
          <Text style={styles.label}>Display name</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <View style={styles.separator} />
          <Text style={styles.label}>Phone number</Text>
          <Text style={styles.value}>{user?.phone}</Text>
          <Text style={styles.unverified}>Not verified</Text>
        </View>

        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  brandMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#087F5B",
    marginBottom: 24,
  },
  eyebrow: {
    color: "#087F5B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heading: {
    color: "#172B2A",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    color: "#64746e",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 9,
  },
  profileCard: {
    padding: 18,
    backgroundColor: "#F5F8F6",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    borderRadius: 18,
    marginTop: 28,
  },
  cardHeading: {
    color: "#172B2A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 17,
  },
  label: {
    color: "#74817b",
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    color: "#172B2A",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#E0E8E3",
    marginVertical: 15,
  },
  unverified: {
    color: "#8A6A20",
    fontSize: 12,
    marginTop: 5,
  },
  logoutButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E1DC",
    borderRadius: 15,
    marginTop: 22,
  },
  logoutText: {
    color: "#087F5B",
    fontSize: 15,
    fontWeight: "700",
  },
});

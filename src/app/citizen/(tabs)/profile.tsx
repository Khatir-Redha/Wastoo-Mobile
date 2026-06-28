import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { useAuth } from "../../../../context/AuthProvider";

export default function ProfileScreen() {
   const { logout } = useAuth();  

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ paddingTop: Platform.OS === "android" ? 40 : 0 }}
    >
      <View className="flex-1 items-center justify-center">
        <Text className="text-[24px] font-bold text-[#1E5631]">Profile</Text>
        <Text className="text-[#6D7A6E] mt-2">Coming soon</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          className="w-full max-w-[280px] h-[54px] bg-white border border-[#ECECEC] rounded-full flex-row items-center justify-center gap-2 shadow-sm"
        >
          <MaterialIcons name="logout" size={20} color="#EA4335" />
          <Text className="text-[#EA4335] font-semibold text-[16px]">
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

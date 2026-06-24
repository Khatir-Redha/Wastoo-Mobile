import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useAuth } from "../../context/AuthProvider"; // Adjust path based on your folder structure
import { MaterialIcons } from "@expo/vector-icons";

export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-[#fcf9f8]">
      <View className="flex-1 items-center justify-center px-6">
        
        <Text className="text-[#1b1c1c] text-[24px] font-bold mb-2 tracking-tight">
          Welcome to Wasto
        </Text>
        <Text className="text-[#3d4a3f] text-[14px] text-center mb-8">
          You are successfully authenticated. More features coming soon!
        </Text>

        {/* Logout Button */}
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
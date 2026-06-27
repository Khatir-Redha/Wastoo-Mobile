import React, { useEffect } from "react"; // 1. Added useEffect import
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useAuth } from "../../context/AuthProvider"; 
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();

  // 2. Wrap the redirection inside a useEffect hook
  useEffect(() => {
    if (user?.role) {
      const userRoleRoute = `/${user.role.toLowerCase().replace(/\s+/g, '-')}`;
      router.replace(userRoleRoute);
    }
    console.log(user)
  }, [user, router]);

  return (
    <SafeAreaView className="flex-1 bg-[#fcf9f8]">
      <View className="flex-1 items-center justify-center px-6">
        
        <Text className="text-[#1b1c1c] text-[24px] font-bold mb-2 tracking-tight">
          Welcome to Wasto {user?.role}
        </Text>
        <Text className="text-[#3d4a3f] text-[14px] text-center mb-8">
          Redirecting to your dashboard...
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
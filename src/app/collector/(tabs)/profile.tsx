import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';

export default function CollectorProfileScreen() {
  const { logout, user } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-[#E8F8EE] rounded-full items-center justify-center mb-4">
          <Text className="text-[32px] font-bold text-[#1E5631]">
            {user?.name?.charAt(0).toUpperCase() || 'C'}
          </Text>
        </View>
        <Text className="text-[22px] font-bold text-[#1b1c1c] mb-1">{user?.name || 'Collector'}</Text>
        <Text className="text-[14px] text-[#6D7A6E] mb-1">{user?.email}</Text>
        <View className="bg-[#E8F8EE] px-4 py-1.5 rounded-full mb-8">
          <Text className="text-[#1E5631] font-bold text-[13px] uppercase tracking-wider">Collector</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          className="w-full max-w-[280px] h-[54px] bg-white border border-[#ECECEC] rounded-full flex-row items-center justify-center gap-2 shadow-sm"
        >
          <MaterialIcons name="logout" size={20} color="#EA4335" />
          <Text className="text-[#EA4335] font-semibold text-[16px]">Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

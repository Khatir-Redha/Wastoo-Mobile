import { MaterialIcons, Feather } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../../context/AuthProvider';

export default function CollectorProfileScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const kycStatus = (user as any)?.kyc_status;

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center justify-center px-6 pt-8 pb-4">
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
        </View>

        <View className="px-6 gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/collector/kyc/become-collector' as any)}
            className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-5 h-[60px]"
          >
            <View className="w-10 h-10 bg-[#E8F8EE] rounded-full items-center justify-center mr-4">
              <Feather name={"shield-check" as any} size={20} color="#1E5631" />
            </View>
            <View className="flex-1">
              <Text className="text-[#1b1c1c] font-bold text-[16px]">Get Verified</Text>
              <Text className="text-[#6D7A6E] text-[13px]">
                {kycStatus === 'VERIFIED'
                  ? 'Your identity is verified'
                  : 'Complete identity verification to accept pickups'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#8A8F87" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={logout}
            className="w-full h-[54px] bg-white border border-[#ECECEC] rounded-full flex-row items-center justify-center gap-2 shadow-sm"
          >
            <MaterialIcons name="logout" size={20} color="#EA4335" />
            <Text className="text-[#EA4335] font-semibold text-[16px]">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

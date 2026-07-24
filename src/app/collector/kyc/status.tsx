import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import KycService, { KycMeResponse } from '../../../services/kyc.service';

export default function KycStatusScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<KycMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data: KycMeResponse = await KycService.getMyKyc();
      setStatus(data);
    } catch {
      setStatus({ kyc_status: null });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    await fetchStatus();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View className="items-center mt-24">
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text className="text-[#6D7A6E] mt-3">Checking verification status...</Text>
        </View>
      );
    }

    const kycStatus = status?.kyc_status;

    if (kycStatus === 'PENDING') {
      return (
        <View className="items-center mt-24 px-8">
          <View className="w-20 h-20 bg-[#EFF6FF] rounded-full items-center justify-center mb-4">
            <Feather name="clock" size={40} color="#3B82F6" />
          </View>
          <Text className="text-[22px] font-bold text-[#1b1c1c] mb-2">Under Review</Text>
          <Text className="text-[14px] text-[#6D7A6E] text-center leading-5">
            Your KYC application is currently being reviewed by our team. This usually takes 1-2 business
            days. We&apos;ll notify you once it&apos;s processed.
          </Text>
          <TouchableOpacity onPress={handleRetry} className="mt-8 bg-[#2ECC71] px-8 py-3 rounded-full">
            <Text className="text-white font-bold">Refresh Status</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (kycStatus === 'VERIFIED') {
      return (
        <View className="items-center mt-24 px-8">
          <View className="w-20 h-20 bg-[#E8F8EE] rounded-full items-center justify-center mb-4">
            <Feather name="check-circle" size={40} color="#1E5631" />
          </View>
          <Text className="text-[22px] font-bold text-[#1b1c1c] mb-2">You&apos;re Verified</Text>
          <Text className="text-[14px] text-[#6D7A6E] text-center leading-5 mb-8">
            Congratulations! Your identity has been verified. You can now accept and manage pickups.
          </Text>
          <View className="bg-[#E8F8EE] border border-[#D1E7DD] rounded-2xl p-4 w-full">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="shield-check" size={20} color="#1E5631" />
              <Text className="text-[#1E5631] font-bold text-[15px] ml-2">Verified Collector</Text>
            </View>
          </View>
        </View>
      );
    }

    if (kycStatus === 'REJECTED') {
      return (
        <View className="items-center mt-24 px-8">
          <View className="w-20 h-20 bg-[#FEF2F2] rounded-full items-center justify-center mb-4">
            <Feather name="x-circle" size={40} color="#EF4444" />
          </View>
          <Text className="text-[22px] font-bold text-[#1b1c1c] mb-2">Verification Rejected</Text>
          <Text className="text-[14px] text-[#6D7A6E] text-center leading-5 mb-6">
            We could not verify your identity with the documents provided. Please submit a new application
            with clearer photos.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/collector/kyc/become-collector' as any)}
            className="w-full h-[56px] bg-[#2ECC71] rounded-full items-center justify-center"
            style={{
              shadowColor: '#2ECC71',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-[17px]">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="items-center mt-24 px-8">
        <View className="w-20 h-20 bg-[#F9F9F9] rounded-full items-center justify-center mb-4">
          <Feather name="help-circle" size={40} color="#8A8F87" />
        </View>
        <Text className="text-[22px] font-bold text-[#1b1c1c] mb-2">No Application Found</Text>
        <Text className="text-[14px] text-[#6D7A6E] text-center leading-5 mb-8">
          You have not started the verification process yet. Complete your identity verification to start
          accepting pickups.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/collector/kyc/become-collector' as any)}
          className="w-full h-[56px] bg-[#2ECC71] rounded-full items-center justify-center"
          style={{
            shadowColor: '#2ECC71',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-white font-bold text-[17px]">Start Verification</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">KYC Status</Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#F7F8F6]"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

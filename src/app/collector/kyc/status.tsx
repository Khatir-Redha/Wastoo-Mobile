import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  SafeAreaView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import KycService from '../../../../services/kyc.service';

export default function KycStatusScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchKycStatus();
    }, [])
  );

  const fetchKycStatus = async () => {
    try {
      const kycData = await KycService.getMyKyc();
      
      const currentKyc = Array.isArray(kycData) 
        ? kycData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : kycData;
        
      if (currentKyc) {
        if (currentKyc.status === 'REJECTED') {
          router.replace('/collector/kyc/rejected' as any);
          return;
        }
        
        setStatus(currentKyc.status);
        setSubmittedAt(currentKyc.created_at);
      } else {
        // No KYC found, possibly redirect back to index
        router.replace('/collector/kyc' as any);
      }
    } catch (err) {
      console.error('Failed to fetch KYC status', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  const isVerified = status === 'VERIFIED';

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
        <TouchableOpacity onPress={() => router.replace('/collector' as any)} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Verification Status</Text>
      </View>

      <View className="flex-1 px-6 pt-12 items-center">
        {/* Status Icon */}
        <View 
          className={`w-24 h-24 rounded-full items-center justify-center mb-6 ${
            isVerified ? 'bg-[#E8F8EE]' : 'bg-[#F3F4F6]'
          }`}
        >
          {isVerified ? (
            <Feather name="check-circle" size={48} color="#2ECC71" />
          ) : (
            <Feather name="clock" size={48} color="#6B7280" />
          )}
        </View>

        {/* Status Text */}
        <Text className="text-[24px] font-bold text-[#1b1c1c] text-center mb-3">
          {isVerified ? "You're a verified collector!" : "Application under review"}
        </Text>
        
        <Text className="text-[15px] text-[#6D7A6E] text-center leading-6 mb-8 px-4">
          {isVerified 
            ? "Your identity has been successfully verified. You can now access all collector features and start accepting pickups."
            : "Your documents have been submitted and are currently being reviewed by our team. This usually takes 1-2 business days."}
        </Text>

        {/* Info Card */}
        <View className="w-full bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl p-4 mb-8">
          <View className="flex-row justify-between mb-3">
            <Text className="text-[#6D7A6E] text-[14px]">Status</Text>
            <View className={`px-2 py-1 rounded ${isVerified ? 'bg-[#E8F8EE]' : 'bg-[#F3F4F6]'}`}>
              <Text className={`text-[12px] font-bold ${isVerified ? 'text-[#1E5631]' : 'text-[#4B5563]'}`}>
                {isVerified ? 'VERIFIED' : 'PENDING'}
              </Text>
            </View>
          </View>
          {submittedAt && (
            <View className="flex-row justify-between pt-3 border-t border-[#ECECEC]">
              <Text className="text-[#6D7A6E] text-[14px]">Submitted on</Text>
              <Text className="text-[#1b1c1c] font-medium text-[14px]">
                {new Date(submittedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
        {isVerified ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/collector' as any)}
            className="w-full h-[58px] bg-[#2ECC71] rounded-full flex-row items-center justify-center"
            style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Feather name="map" size={20} color="white" />
            <Text className="text-white font-bold text-[17px] ml-2">View Available Pickups</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/collector' as any)}
            className="w-full h-[58px] bg-[#F3F4F6] rounded-full flex-row items-center justify-center"
          >
            <Text className="text-[#4B5563] font-bold text-[17px]">Return to Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  SafeAreaView, Platform, ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import KycService from '../../../../services/kyc.service';

export default function RejectedApplicationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string>('');

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
        if (currentKyc.status === 'PENDING' || currentKyc.status === 'VERIFIED') {
          // If status has changed since last visit, redirect to prevent stale view
          router.replace('/collector/kyc/status' as any);
          return;
        } else if (currentKyc.status === 'REJECTED') {
          setReason(currentKyc.review_comment || 'No specific reason provided. Please ensure all documents are clear and valid.');
        }
      } else {
        router.replace('/collector/kyc' as any);
      }
    } catch (err) {
      console.error('Failed to fetch KYC status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = () => {
    // Route back to the entry point. The index screen will detect the REJECTED
    // status, pre-fill data, and enable the 'resubmit' mode flow.
    router.push('/collector/kyc' as any);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
        <TouchableOpacity onPress={() => router.replace('/collector' as any)} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Application Update</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-10" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-[#FEF2F2] rounded-full items-center justify-center mb-6">
            <Feather name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text className="text-[24px] font-bold text-[#1b1c1c] text-center mb-3">
            Application Needs Changes
          </Text>
          <Text className="text-[15px] text-[#6D7A6E] text-center leading-6 px-2">
            Unfortunately, we couldn't verify your identity with the information provided. Please review the feedback below and try again.
          </Text>
        </View>

        {/* Rejection Reason Card */}
        <View className="w-full bg-[#F9F9F9] border border-[#FCA5A5] rounded-2xl p-5 mb-8">
          <View className="flex-row items-center mb-3">
            <Feather name="info" size={18} color="#B91C1C" />
            <Text className="text-[15px] font-bold text-[#B91C1C] ml-2">Reviewer Feedback</Text>
          </View>
          <Text className="text-[15px] text-[#1b1c1c] leading-6">
            {reason}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleResubmit}
          className="w-full h-[58px] bg-[#EF4444] rounded-full flex-row items-center justify-center"
          style={{ shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Feather name="refresh-cw" size={20} color="white" />
          <Text className="text-white font-bold text-[17px] ml-2">Resubmit Application</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

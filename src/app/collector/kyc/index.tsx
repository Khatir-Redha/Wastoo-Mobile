import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import KycService from '../../../../services/kyc.service';
import { useAuth } from '../../../../context/AuthProvider';

export default function BecomeCollectorScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isResubmit, setIsResubmit] = useState(false);

  useEffect(() => {
    checkKycStatus();
  }, []);

  const checkKycStatus = async () => {
    try {
      const kycData = await KycService.getMyKyc();
      
      const currentKyc = Array.isArray(kycData) 
        ? kycData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : kycData;
        
      if (currentKyc) {
        if (currentKyc.status === 'PENDING' || currentKyc.status === 'VERIFIED') {
          router.replace('/collector/kyc/status' as any);
          return;
        } else if (currentKyc.status === 'REJECTED') {
          setIsResubmit(true);
          if (currentKyc.data?.name) setName(currentKyc.data.name);
          if (currentKyc.data?.phone) setPhone(currentKyc.data.phone);
        }
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Failed to fetch KYC status. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-\(\)]{8,15}$/;
    if (!phone.trim() || !phoneRegex.test(phone)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return;
    }

    router.push({
      pathname: '/collector/kyc/upload',
      params: { name: name.trim(), phone: phone.trim(), mode: isResubmit ? 'resubmit' : 'new' }
    } as any);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text className="mt-4 text-[#6D7A6E] font-medium">Checking verification status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Feather name="arrow-left" size={24} color="#1b1c1c" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Become a Collector</Text>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Icon + Intro */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-[#F0FDF4] rounded-full items-center justify-center mb-4">
              <Feather name="shield" size={36} color="#2ECC71" />
            </View>
            <Text className="text-[22px] font-bold text-[#1b1c1c] text-center">Identity Verification</Text>
            <Text className="text-[14px] text-[#6D7A6E] text-center mt-2 leading-5 px-2">
              To accept pickups, we need to verify your identity. Please provide your personal information exactly as it appears on your ID.
            </Text>
          </View>

          {/* Form Fields */}
          <View className="mb-6">
            <Text className="text-[16px] font-bold text-[#1b1c1c] mb-2">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[60px]">
              <Feather name="user" size={20} color="#8A8F87" />
              <TextInput
                className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
                placeholder="Enter your full name"
                placeholderTextColor="#D0D0D0"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-[16px] font-bold text-[#1b1c1c] mb-2">
              Phone Number <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[60px]">
              <Feather name="phone" size={20} color="#8A8F87" />
              <TextInput
                className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
                placeholder="e.g. +1 234 567 8900"
                placeholderTextColor="#D0D0D0"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Security note */}
          <View className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl p-4 flex-row items-start mb-6">
            <Feather name="lock" size={18} color="#6C757D" className="mt-0.5" />
            <Text className="text-[#495057] text-[13px] ml-3 flex-1 leading-5">
              Your information is securely encrypted and only used for verification purposes.
            </Text>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={submitting}
            className="w-full h-[58px] bg-[#2ECC71] rounded-full flex-row items-center justify-center"
            style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Text className="text-white font-bold text-[17px] mr-2">Continue</Text>
            <Feather name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

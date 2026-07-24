import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthProvider';
import KycService, { KycMeResponse } from '../../../services/kyc.service';

export default function BecomeCollectorScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const checkKycStatus = useCallback(async () => {
    try {
      const data: KycMeResponse = await KycService.getMyKyc();
      const status = data.kyc_status;

      if (status === 'PENDING') {
        router.replace('/collector/kyc/status' as any);
      } else if (status === 'VERIFIED') {
        router.replace('/collector/kyc/status' as any);
      } else if (status === 'REJECTED') {
        const rejectedName = data.last_application?.full_name || user?.name || '';
        const rejectedPhone = data.last_application?.phone || user?.phone || '';
        setFullName(rejectedName);
        setPhone(rejectedPhone);
      } else {
        const profileName = user?.name || '';
        const profilePhone = user?.phone || '';
        setFullName(profileName);
        setPhone(profilePhone);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        const profileName = user?.name || '';
        const profilePhone = user?.phone || '';
        setFullName(profileName);
        setPhone(profilePhone);
      } else {
        Alert.alert('Error', error?.response?.data?.message || 'Failed to load KYC status. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [router, user]);

  useEffect(() => {
    checkKycStatus();
  }, [checkKycStatus]);

  const validatePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 8) {
      setPhoneError('Please enter a valid phone number (at least 8 digits).');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleContinue = () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setNameError('Full name is required.');
      return;
    }
    setNameError('');

    if (!trimmedPhone) {
      setPhoneError('Phone number is required.');
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      return;
    }

    setNameError('');
    setPhoneError('');

    router.push({
      pathname: '/collector/kyc/upload-documents' as any,
      params: {
        full_name: trimmedName,
        phone: trimmedPhone,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
        <View className="flex-1 items-center justify-center">
          <View className="w-10 h-10 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin" />
        </View>
      </SafeAreaView>
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
          <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Become a Verified Collector</Text>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Icon + intro */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-[#E8F8EE] rounded-full items-center justify-center mb-4">
              <Feather name={"shield-check" as any} size={36} color="#1E5631" />
            </View>
            <Text className="text-[22px] font-bold text-[#1b1c1c] text-center">
              Identity Verification
            </Text>
            <Text className="text-[14px] text-[#6D7A6E] text-center mt-2 leading-5 px-4">
              To start accepting pickups, we need to verify your identity. Please provide your full name and
              contact number, then upload a valid ID and a selfie holding it.
            </Text>
          </View>

          {/* Full Name */}
          <View className="mb-6">
            <Text className="text-[#1b1c1c] font-bold text-[16px] mb-2 ml-1">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px]">
              <Feather name="user" size={20} color="#8A8F87" />
              <TextInput
                className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
                placeholder="Enter your full legal name"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="words"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (text.trim()) setNameError('');
                }}
              />
            </View>
            {nameError ? <Text className="text-red-500 text-[13px] mt-1 ml-1">{nameError}</Text> : null}
          </View>

          {/* Phone Number */}
          <View className="mb-8">
            <Text className="text-[#1b1c1c] font-bold text-[16px] mb-2 ml-1">
              Phone Number <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px]">
              <Feather name="phone" size={20} color="#8A8F87" />
              <TextInput
                className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
                placeholder="+213 555 000 000"
                placeholderTextColor="#B0B0B0"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (text.trim()) setPhoneError('');
                }}
              />
            </View>
            {phoneError ? <Text className="text-red-500 text-[13px] mt-1 ml-1">{phoneError}</Text> : null}
          </View>

          {/* Info Box */}
          <View className="bg-[#E8F8EE] border border-[#D1E7DD] rounded-2xl p-4 flex-row items-start mb-4">
            <Feather name="info" size={18} color="#1E5631" className="mt-0.5" />
            <Text className="text-[#1E5631] text-[13px] ml-3 flex-1 leading-5">
              Your information is only used for identity verification and is handled securely in compliance
              with our Privacy Policy.
            </Text>
          </View>
        </ScrollView>

        {/* Footer button */}
        <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            className="w-full h-[58px] rounded-full flex-row items-center justify-center bg-[#2ECC71]"
            style={{
              shadowColor: '#2ECC71',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <>
              <Text className="text-white font-bold text-[17px] mr-2">Continue</Text>
              <Feather name="arrow-right" size={20} color="white" />
            </>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

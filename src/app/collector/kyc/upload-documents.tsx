import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function UploadDocumentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    full_name: string;
    phone: string;
  }>();

  const fullName = params.full_name || '';
  const phone = params.phone || '';

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Feather name="arrow-left" size={24} color="#1b1c1c" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Upload Documents</Text>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Collected Info */}
          <View className="bg-[#F9F9F9] border border-[#ECECEC] rounded-[16px] p-4 flex-row items-center mb-8">
            <View className="w-12 h-12 bg-[#E8F8EE] rounded-full items-center justify-center mr-4">
              <Feather name="user" size={22} color="#1E5631" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] text-[#6D7A6E]">Applicant</Text>
              <Text className="text-[16px] font-bold text-[#1b1c1c]">{fullName}</Text>
              <Text className="text-[13px] text-[#6D7A6E]">{phone}</Text>
            </View>
          </View>

          {/* Document Upload Area Placeholder */}
          <Text className="text-[18px] font-bold text-[#1b1c1c] mb-4">Required Documents</Text>

          <View className="bg-white border-2 border-dashed border-[#ECECEC] rounded-[20px] p-6 items-center justify-center mb-4">
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#B0B0B0" />
            <Text className="text-[#6D7A6E] text-[15px] mt-3 font-medium">National ID</Text>
            <Text className="text-[#8A8F87] text-[13px] mt-1 text-center">
              Upload a clear photo of your government-issued ID (JPG, PNG, PDF up to 10MB)
            </Text>
          </View>

          <View className="bg-white border-2 border-dashed border-[#ECECEC] rounded-[20px] p-6 items-center justify-center mb-8">
            <MaterialCommunityIcons name="camera-outline" size={48} color="#B0B0B0" />
            <Text className="text-[#6D7A6E] text-[15px] mt-3 font-medium">Selfie (Holding ID)</Text>
            <Text className="text-[#8A8F87] text-[13px] mt-1 text-center">
              Take a selfie holding your ID next to your face (JPG, PNG, PDF up to 10MB)
            </Text>
          </View>

          {/* Info Box */}
          <View className="bg-[#FFF8E1] border border-[#FDE68A] rounded-2xl p-4 flex-row items-start">
            <Feather name="alert-triangle" size={18} color="#F59E0B" className="mt-0.5" />
            <Text className="text-[#92400E] text-[13px] ml-3 flex-1 leading-5">
              Make sure the documents are clear and all text is readable. Your data is encrypted and only
              used for verification purposes.
            </Text>
          </View>
        </ScrollView>

        {/* Footer button */}
        <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Alert.alert('Coming Soon', 'Document upload will be available in the next update.');
            }}
            className="w-full h-[58px] rounded-full flex-row items-center justify-center bg-[#A0A0A0]"
          >
            <Text className="text-white font-bold text-[17px] mr-2">Upload Documents</Text>
            <Feather name="arrow-up-circle" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

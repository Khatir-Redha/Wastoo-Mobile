import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, SafeAreaView, ScrollView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import KycService from '../../../../services/kyc.service';
import api from '../../../../lib/api';

type DocState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  fileName?: string;
  documentUrl?: string;
  fileUri?: string;
  mimeType?: string;
};

export default function UploadDocumentsScreen() {
  const router = useRouter();

  // According to backend, we only upload ONE document: ID or PASSPORT.
  const [document, setDocument] = useState<DocState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Backend /cloudinary/upload only accepts JPG/PNG, no PDF
        type: ['image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB

      if (file.size && file.size > maxSizeBytes) {
        Alert.alert('File Too Large', `The selected file exceeds the 10MB limit.`);
        return;
      }

      const mimeType = file.mimeType || 'image/jpeg';
      await uploadDocument(file.uri, file.name, mimeType);
    } catch (err) {
      console.error('Error picking document', err);
      Alert.alert('Error', 'Failed to select document.');
    }
  };

  const uploadDocument = async (
    uri: string,
    fileName: string,
    mimeType: string
  ) => {
    setDocument({ status: 'uploading', fileName, fileUri: uri, mimeType });

    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);

      const uploadRes = await api.post('/cloudinary/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const documentUrl = uploadRes.data.url;

      setDocument(prev => ({ ...prev, status: 'success', documentUrl }));
    } catch (err) {
      console.error('Upload failed', err);
      setDocument(prev => ({ ...prev, status: 'error' }));
      Alert.alert('Upload Failed', `Failed to upload ${fileName}. Please try again.`);
    }
  };

  const handleRetryUpload = () => {
    if (document.fileUri && document.fileName && document.mimeType) {
      uploadDocument(document.fileUri, document.fileName, document.mimeType);
    }
  };

  const handleSubmit = async () => {
    if (document.status !== 'success' || !document.documentUrl) {
      Alert.alert('Missing Document', 'Please upload your National ID or Passport.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        document_type: 'ID',
        document_url: document.documentUrl,
      };

      await KycService.submitApplication(payload);

      // Navigate to status screen on success
      router.replace('/collector/kyc/status' as any);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 404) {
        // Handle findFirstOrThrow bug or genuine conflict
        Alert.alert('Request Error', 'There was an issue submitting your request. You may already have an active application.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to submit application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocSlot = (
    title: string,
    description: string
  ) => {
    return (
      <View className="mb-6 bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-[16px] font-bold text-[#1b1c1c]">
              {title} <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-[13px] text-[#6D7A6E] mt-1">{description}</Text>
          </View>
          
          {/* Status Icon */}
          <View className="w-10 h-10 items-center justify-center">
            {document.status === 'success' && <Feather name="check-circle" size={24} color="#2ECC71" />}
            {document.status === 'error' && <Feather name="alert-circle" size={24} color="#EF4444" />}
            {document.status === 'idle' && <Feather name="upload-cloud" size={24} color="#8A8F87" />}
          </View>
        </View>

        {document.status === 'uploading' ? (
          <View className="flex-row items-center bg-white p-3 rounded-xl border border-[#ECECEC]">
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text className="ml-3 text-[14px] text-[#6D7A6E] flex-1" numberOfLines={1}>
              Uploading {document.fileName}...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => document.status === 'error' ? handleRetryUpload() : handlePickDocument()}
            className={`flex-row items-center justify-center p-3 rounded-xl border border-dashed ${
              document.status === 'error' ? 'border-red-400 bg-red-50' 
              : document.status === 'success' ? 'border-[#2ECC71] bg-[#E8F8EE]'
              : 'border-[#B0B0B0] bg-white'
            }`}
          >
            {document.status === 'success' ? (
              <>
                <Feather name="refresh-cw" size={16} color="#1E5631" />
                <Text className="text-[#1E5631] font-semibold text-[14px] ml-2">Replace File</Text>
              </>
            ) : document.status === 'error' ? (
              <>
                <Feather name="refresh-ccw" size={16} color="#EF4444" />
                <Text className="text-[#EF4444] font-semibold text-[14px] ml-2">Retry Upload</Text>
              </>
            ) : (
              <>
                <Feather name="plus" size={16} color="#2ECC71" />
                <Text className="text-[#2ECC71] font-semibold text-[14px] ml-2">Select File</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const isSubmitDisabled = submitting || document.status !== 'success';

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Upload Documents</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mb-6">
          <Text className="text-[14px] text-[#6D7A6E] leading-5">
            Please upload a clear, legible copy of your document. Accepted formats: JPG, PNG. Max 10MB.
          </Text>
        </View>

        {renderDocSlot(
          'National ID or Passport',
          'Front of your valid government-issued ID card or Passport.'
        )}

        {/* Security Note */}
        <View className="bg-[#E8F8EE] border border-[#A7F3D0] rounded-2xl p-4 flex-row items-start mt-2 mb-8">
          <Feather name="shield" size={18} color="#059669" className="mt-0.5" />
          <Text className="text-[#065F46] text-[13px] ml-3 flex-1 leading-5">
            Your documents are securely encrypted, stored safely, and used exclusively to verify your identity.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          className={`w-full h-[58px] rounded-full flex-row items-center justify-center ${
            isSubmitDisabled ? 'bg-[#A7F3D0]' : 'bg-[#2ECC71]'
          }`}
          style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-[17px]">Submit Application</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, SafeAreaView, ScrollView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import KycService from '../../../../services/kyc.service';

type DocState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  fileName?: string;
  documentUrl?: string;
  fileUri?: string;
  mimeType?: string;
};

export default function UploadDocumentsScreen() {
  const router = useRouter();
  const { name, phone, mode } = useLocalSearchParams<{ name: string; phone: string; mode?: string }>();

  const [nationalId, setNationalId] = useState<DocState>({ status: 'idle' });
  const [selfie, setSelfie] = useState<DocState>({ status: 'idle' });
  const [supporting, setSupporting] = useState<DocState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);

  const handlePickDocument = async (
    docType: 'NATIONAL_ID' | 'SELFIE' | 'SUPPORTING',
    setState: React.Dispatch<React.SetStateAction<DocState>>
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
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

      const mimeType = file.mimeType || 'application/octet-stream';
      await uploadDocument(file.uri, file.name, mimeType, setState);
    } catch (err) {
      console.error('Error picking document', err);
      Alert.alert('Error', 'Failed to select document.');
    }
  };

  const uploadDocument = async (
    uri: string,
    fileName: string,
    mimeType: string,
    setState: React.Dispatch<React.SetStateAction<DocState>>
  ) => {
    setState({ status: 'uploading', fileName, fileUri: uri, mimeType });

    try {
      // 1. Get signed URL
      const { signedUrl, documentUrl } = await KycService.getSignedUrl(fileName, mimeType);

      // 2. Fetch file as blob and upload to signed URL
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to storage failed');
      }

      setState(prev => ({ ...prev, status: 'success', documentUrl }));
    } catch (err) {
      console.error('Upload failed', err);
      setState(prev => ({ ...prev, status: 'error' }));
      Alert.alert('Upload Failed', `Failed to upload ${fileName}. Please try again.`);
    }
  };

  const handleRetryUpload = (state: DocState, setState: React.Dispatch<React.SetStateAction<DocState>>) => {
    if (state.fileUri && state.fileName && state.mimeType) {
      uploadDocument(state.fileUri, state.fileName, state.mimeType, setState);
    }
  };

  const handleSubmit = async () => {
    if (nationalId.status !== 'success' || selfie.status !== 'success') {
      Alert.alert('Missing Documents', 'Please upload both your National ID and a Selfie with ID.');
      return;
    }

    setSubmitting(true);
    try {
      const documents = [
        { document_type: 'NATIONAL_ID', document_url: nationalId.documentUrl! },
        { document_type: 'SELFIE', document_url: selfie.documentUrl! },
      ];

      if (supporting.status === 'success' && supporting.documentUrl) {
        documents.push({ document_type: 'SUPPORTING', document_url: supporting.documentUrl });
      }

      const payload = { name, phone, documents };

      if (mode === 'resubmit') {
        await KycService.resubmitKyc(payload);
      } else {
        await KycService.submitKyc(payload);
      }

      // Navigate to status screen on success
      router.replace('/collector/kyc/status' as any);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Duplicate Request', 'You already have a pending KYC application.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to submit application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocSlot = (
    title: string,
    description: string,
    required: boolean,
    docType: 'NATIONAL_ID' | 'SELFIE' | 'SUPPORTING',
    state: DocState,
    setState: React.Dispatch<React.SetStateAction<DocState>>
  ) => {
    return (
      <View className="mb-6 bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-[16px] font-bold text-[#1b1c1c]">
              {title} {required && <Text className="text-red-500">*</Text>}
            </Text>
            <Text className="text-[13px] text-[#6D7A6E] mt-1">{description}</Text>
          </View>
          
          {/* Status Icon */}
          <View className="w-10 h-10 items-center justify-center">
            {state.status === 'success' && <Feather name="check-circle" size={24} color="#2ECC71" />}
            {state.status === 'error' && <Feather name="alert-circle" size={24} color="#EF4444" />}
            {state.status === 'idle' && <Feather name="upload-cloud" size={24} color="#8A8F87" />}
          </View>
        </View>

        {state.status === 'uploading' ? (
          <View className="flex-row items-center bg-white p-3 rounded-xl border border-[#ECECEC]">
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text className="ml-3 text-[14px] text-[#6D7A6E] flex-1" numberOfLines={1}>
              Uploading {state.fileName}...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => state.status === 'error' ? handleRetryUpload(state, setState) : handlePickDocument(docType, setState)}
            className={`flex-row items-center justify-center p-3 rounded-xl border border-dashed ${
              state.status === 'error' ? 'border-red-400 bg-red-50' 
              : state.status === 'success' ? 'border-[#2ECC71] bg-[#E8F8EE]'
              : 'border-[#B0B0B0] bg-white'
            }`}
          >
            {state.status === 'success' ? (
              <>
                <Feather name="refresh-cw" size={16} color="#1E5631" />
                <Text className="text-[#1E5631] font-semibold text-[14px] ml-2">Replace File</Text>
              </>
            ) : state.status === 'error' ? (
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

  const isSubmitDisabled = submitting || nationalId.status !== 'success' || selfie.status !== 'success';

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
            Please upload clear, legible copies of your documents. Accepted formats: JPG, PNG, PDF. Max 10MB per file.
          </Text>
        </View>

        {renderDocSlot(
          'National ID',
          'Front of your valid government-issued ID card or Passport.',
          true,
          'NATIONAL_ID',
          nationalId,
          setNationalId
        )}

        {renderDocSlot(
          'Selfie with ID',
          'A clear photo of your face holding your National ID next to it.',
          true,
          'SELFIE',
          selfie,
          setSelfie
        )}

        {renderDocSlot(
          'Supporting Document',
          'Utility bill, bank statement, or other proof of address (Optional).',
          false,
          'SUPPORTING',
          supporting,
          setSupporting
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

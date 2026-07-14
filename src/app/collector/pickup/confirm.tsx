import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PickupService from '../../../../services/pickup.service';

export default function PickupConfirmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [weight, setWeight] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    const weightNum = parseFloat(weight);

    if (!weight.trim() || isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid collected weight greater than 0 kg.');
      return;
    }
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please check the confirmation box to proceed.');
      return;
    }

    setLoading(true);
    try {
      // PATCH /pickup/:id with COMPLETED status + collected_weight (stripped on service level for now)
      await PickupService.updatePickup(Number(id), {
        status: 'COMPLETED' as any,
        collected_weight: weightNum,
      });

      Alert.alert(
        '✅ Pickup Completed Successfully',
        `You have collected ${weightNum} kg of waste. Great work!`,
        [
          {
            text: 'Return to Dashboard',
            onPress: () => router.replace('/collector' as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to complete pickup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-[#ECECEC]">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Feather name="x" size={24} color="#1b1c1c" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Complete Pickup</Text>
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
              <Feather name="check-circle" size={36} color="#1E5631" />
            </View>
            <Text className="text-[22px] font-bold text-[#1b1c1c] text-center">Confirm Collection</Text>
            <Text className="text-[14px] text-[#6D7A6E] text-center mt-2 leading-5 px-4">
              Enter the actual weight of waste collected and confirm the collection below.
            </Text>
          </View>

          {/* Weight input */}
          <Text className="text-[16px] font-bold text-[#1b1c1c] mb-2">
            Collected Weight (kg) <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[60px] mb-8">
            <Feather name="layers" size={20} color="#2ECC71" />
            <TextInput
              className="flex-1 text-[#1b1c1c] text-[22px] font-bold ml-3"
              placeholder="0.0"
              placeholderTextColor="#D0D0D0"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Text className="text-[#6D7A6E] font-bold text-[18px]">kg</Text>
          </View>

          {/* Confirmation checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setConfirmed(v => !v)}
            className={`flex-row items-start p-4 rounded-2xl border mb-8 ${confirmed ? 'border-[#2ECC71] bg-[#E8F8EE]' : 'border-[#ECECEC] bg-[#F9F9F9]'}`}
          >
            <View className={`w-6 h-6 rounded border-2 items-center justify-center mt-0.5 mr-3 flex-shrink-0 ${confirmed ? 'bg-[#2ECC71] border-[#2ECC71]' : 'border-[#B0B0B0] bg-white'}`}>
              {confirmed && <Feather name="check" size={14} color="white" />}
            </View>
            <Text className={`text-[14px] flex-1 leading-5 ${confirmed ? 'text-[#1E5631] font-semibold' : 'text-[#6D7A6E]'}`}>
              I confirm the waste has been collected and the weight entered is accurate.
            </Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View className="bg-[#FFF8E1] border border-[#FDE68A] rounded-2xl p-4 flex-row items-start">
            <Feather name="alert-triangle" size={18} color="#F59E0B" className="mt-0.5" />
            <Text className="text-[#92400E] text-[13px] ml-3 flex-1 leading-5">
              This action is final and cannot be undone. Make sure the weight is correct before submitting.
            </Text>
          </View>
        </ScrollView>

        {/* Footer button */}
        <View className="px-6 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleComplete}
            disabled={loading}
            className={`w-full h-[58px] rounded-full flex-row items-center justify-center ${loading ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'}`}
            style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <>
                  <Feather name="check-circle" size={20} color="white" />
                  <Text className="text-white font-bold text-[17px] ml-2">Complete Pickup</Text>
                </>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

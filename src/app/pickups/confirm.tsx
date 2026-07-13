import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usePickups } from '../../../hooks/usePickups';
import { PickupStatus } from '../../../services/pickup.service';

export default function ConfirmPickupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { updatePickup, loading } = usePickups();

  const [weight, setWeight] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleComplete = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid collected weight.');
      return;
    }
    if (!confirmed) {
      Alert.alert('Error', 'Please check the confirmation box.');
      return;
    }

    try {
      await updatePickup(Number(id), {
        status: PickupStatus.COMPLETED,
        collected_weight: weightNum
      });
      
      Alert.alert('Success', 'Pickup Completed Successfully', [
        { text: 'Return to Dashboard', onPress: () => router.push('/pickups') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete pickup');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="x" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Complete Pickup</Text>
      </View>

      <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
        <Text className="text-[16px] text-[#6D7A6E] mb-8 leading-6">
          You're about to mark this pickup as completed. Please enter the final collected weight for our records.
        </Text>

        <Text className="text-[18px] font-bold text-[#1b1c1c] mb-4">Collected Weight (kg) <Text className="text-red-500">*</Text></Text>
        <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px] mb-8">
          <Feather name="layers" size={20} color="#2ECC71" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[18px] font-bold ml-3"
            placeholder="0.0"
            placeholderTextColor="#B0B0B0"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
          <Text className="text-[#6D7A6E] font-bold text-[16px]">kg</Text>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setConfirmed(!confirmed)}
          className="flex-row items-center bg-[#F9F9F9] p-4 rounded-2xl border border-[#ECECEC]"
        >
          <View className={`w-6 h-6 rounded border items-center justify-center mr-3 ${confirmed ? 'bg-[#2ECC71] border-[#2ECC71]' : 'border-[#B0B0B0]'}`}>
            {confirmed && <Feather name="check" size={16} color="white" />}
          </View>
          <Text className="text-[#1b1c1c] text-[15px] flex-1 font-medium">
            I confirm the waste has been collected and the weight entered is accurate.
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-[#F0F0F0] bg-white">
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={loading}
          className={`w-full ${loading ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'} h-[56px] rounded-full flex-row items-center justify-center shadow-sm`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-[17px] font-bold">Complete Pickup</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CancelPickupModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}

const REASONS = [
  'Not Available',
  'Wrong Schedule',
  'Created by Mistake',
  'Other'
];

export default function CancelPickupModal({ visible, onClose, onConfirm }: CancelPickupModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }
    setError('');
    onConfirm(selectedReason, notes);
    // Reset state
    setSelectedReason('');
    setNotes('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] p-6 max-h-[85%]">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[20px] font-bold text-[#1b1c1c]">Cancel Pickup</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center bg-[#F9F9F9] rounded-full">
              <Feather name="x" size={20} color="#1b1c1c" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[#6D7A6E] mb-6 text-[15px] leading-6">
              We're sorry to see you cancel. Please let us know why so we can improve our service.
            </Text>

            <Text className="text-[#1b1c1c] font-bold text-[16px] mb-3">Reason <Text className="text-red-500">*</Text></Text>
            {REASONS.map(reason => (
              <TouchableOpacity 
                key={reason}
                onPress={() => {
                  setSelectedReason(reason);
                  setError('');
                }}
                className={`flex-row items-center p-4 border rounded-2xl mb-3 ${selectedReason === reason ? 'border-[#2ECC71] bg-[#E8F8EE]' : 'border-[#ECECEC] bg-[#F9F9F9]'}`}
              >
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${selectedReason === reason ? 'border-[#2ECC71]' : 'border-[#B0B0B0]'}`}>
                  {selectedReason === reason && <View className="w-2.5 h-2.5 bg-[#2ECC71] rounded-full" />}
                </View>
                <Text className={`text-[16px] ${selectedReason === reason ? 'text-[#1E5631] font-bold' : 'text-[#6D7A6E]'}`}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            
            {error ? <Text className="text-red-500 mb-4">{error}</Text> : null}

            <Text className="text-[#1b1c1c] font-bold text-[16px] mb-3 mt-2">Additional Notes (Optional)</Text>
            <View className="bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl p-4 min-h-[100px] mb-8">
              <TextInput
                className="flex-1 text-[#1b1c1c] text-[16px]"
                placeholder="Tell us more about why you're cancelling..."
                placeholderTextColor="#B0B0B0"
                multiline
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View className="bg-red-50 p-4 rounded-2xl mb-8 flex-row items-start">
              <Feather name="alert-triangle" size={20} color="#E74C3C" className="mt-0.5" />
              <Text className="text-[#C0392B] ml-3 flex-1 text-[14px]">
                Are you sure you want to cancel this pickup? This action cannot be undone.
              </Text>
            </View>
          </ScrollView>

          <View className="flex-row gap-3 pt-2">
            <TouchableOpacity 
              onPress={onClose}
              className="flex-1 h-[56px] bg-[#F9F9F9] border border-[#ECECEC] rounded-full items-center justify-center"
            >
              <Text className="text-[#6D7A6E] font-bold text-[16px]">Keep Pickup</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleConfirm}
              className="flex-1 h-[56px] bg-[#E74C3C] rounded-full items-center justify-center shadow-sm"
              style={{ shadowColor: '#E74C3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
            >
              <Text className="text-white font-bold text-[16px]">Cancel Pickup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

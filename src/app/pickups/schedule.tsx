import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePickups } from '../../../hooks/usePickups';
import { PickupStatus } from '../../../services/pickup.service';
import { useAuth } from '../../../context/AuthProvider';

export default function SchedulePickupScreen() {
  const router = useRouter();
  const { post_id, contact_number, access_notes } = useLocalSearchParams();
  const { createPickup, loading } = usePickups();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setTime(selectedTime);
  };

  const handleConfirm = async () => {
    // Generate end time (+2 hours)
    const startTimeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeObj = new Date(time.getTime() + 2 * 60 * 60 * 1000);
    const endTimeString = endTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const scheduledDateString = date.toISOString().split('T')[0];

    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to request a pickup.');
        return;
      }
      await createPickup({
        post_id: Number(post_id),
        owner_id: user.id,
        status: PickupStatus.PENDING,
        contact_number: contact_number as string,
        access_notes: access_notes as string,
        scheduled_date: scheduledDateString,
        start_time: startTimeString,
        end_time: endTimeString
      });
      
      Alert.alert(
        'Success',
        'Pickup Request Submitted Successfully',
        [
          { text: 'View My Pickups', onPress: () => router.push('/pickups/my-history') },
          { text: 'Home', onPress: () => router.push('/citizen') }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit pickup request');
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Schedule Pickup</Text>
      </View>

      <View className="flex-1 p-6">
        <Text className="text-[16px] text-[#6D7A6E] mb-8">
          Select a convenient date and time for the collector to pick up the waste.
        </Text>

        {/* Date Selection */}
        <Text className="text-[18px] font-bold text-[#1b1c1c] mb-4">Date</Text>
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px] mb-6"
        >
          <Feather name="calendar" size={20} color="#2ECC71" />
          <Text className="text-[#1b1c1c] text-[16px] ml-3 flex-1">
            {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            minimumDate={new Date()}
            maximumDate={new Date(new Date().setDate(new Date().getDate() + 30))}
            onChange={onChangeDate}
          />
        )}

        {/* Time Selection */}
        <Text className="text-[18px] font-bold text-[#1b1c1c] mb-4">Start Time</Text>
        <TouchableOpacity 
          onPress={() => setShowTimePicker(true)}
          className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px] mb-8"
        >
          <Feather name="clock" size={20} color="#2ECC71" />
          <Text className="text-[#1b1c1c] text-[16px] ml-3 flex-1">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}
        
        <View className="bg-[#E8F8EE] p-4 rounded-[16px] flex-row items-start">
          <Feather name="info" size={20} color="#1E5631" className="mt-1" />
          <Text className="text-[#1E5631] text-[14px] flex-1 ml-3 leading-5">
            The collection window will be automatically set to 2 hours from your start time.
          </Text>
        </View>

      </View>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-[#F0F0F0] bg-white">
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleConfirm}
          disabled={loading}
          className={`w-full ${loading ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'} h-[56px] rounded-full flex-row items-center justify-center shadow-sm`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-[17px] font-bold">Confirm Pickup Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

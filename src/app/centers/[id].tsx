import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCenters } from '../../../hooks/useCenters';

export default function CenterDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { currentCenter, loading, error, fetchCenter } = useCenters();

  useEffect(() => {
    if (id) {
      fetchCenter(Number(id));
    }
  }, [id, fetchCenter]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (error || !currentCenter) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="text-red-500 text-center font-medium">{error || 'Center not found'}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-3xl font-bold mb-6 text-gray-900">Recycling Center</Text>
      
      <View className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm">
        <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Address</Text>
        <Text className="text-gray-800 text-lg mb-6 font-medium">{currentCenter.address}</Text>

        <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Opening Hours</Text>
        <Text className="text-gray-800 text-lg mb-6 font-medium">{currentCenter.opening_hours || 'Not specified'}</Text>

        <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Accepted Waste</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {currentCenter.accepted_categories.map((cat, index) => (
            <View key={index} className="bg-green-100 px-4 py-2 rounded-full">
              <Text className="text-green-800 text-sm font-bold">{cat}</Text>
            </View>
          ))}
        </View>

        <Text className="text-xs text-gray-400 mt-2 font-medium">
          Location: {currentCenter.latitude}, {currentCenter.longitude}
        </Text>
      </View>
    </View>
  );
}

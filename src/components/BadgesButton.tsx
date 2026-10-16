import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import GamificationService from '../../services/gamification.service';
import { theme } from '../theme/tokens';

export default function BadgesButton() {
  const router = useRouter();
  const [unlockedCount, setUnlockedCount] = useState(0);

  const fetchUnlocked = async () => {
    try {
      const res = await GamificationService.getBadges();
      setUnlockedCount((res.userBadges ?? []).length);
    } catch (err) {
      console.error('Failed to fetch badges count', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnlocked();
    }, [])
  );

  const displayCount = unlockedCount > 9 ? '9+' : unlockedCount.toString();

  return (
    <TouchableOpacity
      onPress={() => router.push('/citizen/gamification' as any)}
      activeOpacity={0.7}
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.colors.emerald[500]} />
      {unlockedCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.emerald[500],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: theme.colors.text.inverse,
              fontSize: 10,
              fontFamily: theme.typography.fontFamily.bold,
            }}
          >
            {displayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

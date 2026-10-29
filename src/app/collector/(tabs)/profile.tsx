import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button } from '../../../components/ui';

export default function CollectorProfileScreen() {
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.primary }} style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xl }}>
        <View style={{ width: 80, height: 80, backgroundColor: theme.colors.emerald[50], borderRadius: theme.radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg }}>
          <Text style={{ fontSize: 32, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.emerald[500] }}>
            {user?.name?.charAt(0).toUpperCase() || 'C'}
          </Text>
        </View>
        <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>{user?.name || 'Collector'}</Text>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>{user?.email}</Text>
        <View style={{ backgroundColor: theme.colors.emerald[50], paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, marginBottom: theme.spacing['2xl'] }}>
          <Text style={{ color: theme.colors.emerald[500], fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.fontSize.sm.size, textTransform: 'uppercase', letterSpacing: 1 }}>Collector</Text>
        </View>

        <Button
          title="Log Out"
          variant="secondary"
          size="md"
          onPress={logout}
          icon={<MaterialIcons name="logout" size={20} color={theme.colors.error[500]} />}
          iconPosition="left"
          style={{ width: '100%', maxWidth: 280, borderColor: theme.colors.error[500], color: theme.colors.error[500] }}
        />
      </View>
    </SafeAreaView>
  );
}

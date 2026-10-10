import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePickups } from '../../../hooks/usePickups';
import { PickupStatus } from '../../../services/pickup.service';
import { useAuth } from '../../../context/AuthProvider';
import { Button, Card } from '../../components/ui';
import { theme } from '../../theme/tokens';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          variant="ghost"
          onPress={() => router.back()}
          icon={<Feather name="arrow-left" size={24} color={theme.colors.text.primary} />}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Schedule Pickup</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Select a convenient date and time for the collector to pick up the waste.
        </Text>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Date</Text>
        <Button
          title={date.toLocaleDateString()}
          variant="secondary"
          size="lg"
          onPress={() => setShowDatePicker(true)}
          icon={<Feather name="calendar" size={20} color={theme.colors.green[600]} />}
          iconPosition="left"
          hapticFeedback={false}
          style={styles.pickerButton}
        />

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
        <Text style={styles.sectionTitle}>Start Time</Text>
        <Button
          title={time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          variant="secondary"
          size="lg"
          onPress={() => setShowTimePicker(true)}
          icon={<Feather name="clock" size={20} color={theme.colors.green[600]} />}
          iconPosition="left"
          hapticFeedback={false}
          style={styles.pickerButton}
        />

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}

        {/* Info Card */}
        <Card variant="flat" padding="md" style={styles.infoCard}>
          <View style={styles.infoCardContent}>
            <Feather name="info" size={20} color={theme.colors.green[700]} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              The collection window will be automatically set to 2 hours from your start time.
            </Text>
          </View>
        </Card>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Confirm Pickup Request"
          variant="primary"
          size="lg"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg + 4,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.canvas.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  description: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing['2xl'],
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  pickerButton: {
    marginBottom: theme.spacing.xl,
    justifyContent: 'flex-start',
  },
  infoCard: {
    marginTop: theme.spacing.sm,
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.green[700],
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.canvas.primary,
  },
});

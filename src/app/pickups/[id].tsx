import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePickups } from '../../../hooks/usePickups';
import { Pickup, PickupStatus } from '../../../services/pickup.service';
import api from '../../../lib/api';
import PostService, { Post } from '../../../services/post.service';
import CancelPickupModal from '../../components/CancelPickupModal';
import { Button, Card, StatusStepper } from '../../components/ui';
import { theme } from '../../theme/tokens';

export default function PickupDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { updateStatus, deletePickup, loading } = usePickups();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const currentUserRole = 'CITIZEN';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/pickup`);
        const foundPickup = res.data.find((p: Pickup) => p.id.toString() === id);
        if (foundPickup) {
          setPickup(foundPickup);
          const postData = await PostService.getPostById(foundPickup.post_id);
          setPost(postData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleStartTransit = async () => {
    try {
      await updateStatus(Number(id));
      setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
      Alert.alert('Success', 'Pickup is now in transit!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCancelConfirm = async (reason: string, notes: string) => {
    setCancelModalVisible(false);
    try {
      await deletePickup(Number(id));
      Alert.alert('Cancelled', 'Pickup request has been cancelled.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!pickup || !post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Pickup not found</Text>
      </View>
    );
  }

  const imageUrl = (post.images && post.images.length > 0)
    ? (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any).url)
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

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
        <Text style={styles.headerTitle}>Pickup #{pickup.id}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Status Timeline */}
        {pickup.status !== PickupStatus.CANCELED && (
          <Card variant="default" padding="none" style={styles.timelineCard}>
            <StatusStepper currentStatus={pickup.status as any} />
          </Card>
        )}

        {pickup.status === PickupStatus.CANCELED && (
          <Card variant="flat" padding="md" style={styles.canceledCard}>
            <View style={styles.canceledContent}>
              <Feather name="x-circle" size={24} color={theme.colors.error} />
              <Text style={styles.canceledText}>This pickup was cancelled.</Text>
            </View>
          </Card>
        )}

        {/* Post Info */}
        <Card variant="default" padding="lg" style={styles.section}>
          <Text style={styles.sectionLabel}>WASTE DETAILS</Text>
          <View style={styles.postContent}>
            <Image source={{ uri: imageUrl }} style={styles.postImage} />
            <View style={styles.postInfo}>
              <Text style={styles.postTitle}>{(post as any).title || 'Untitled'}</Text>
              <Text style={styles.postMeta}>{post.category} • {(post as any).quantity || 'TBD'} kg</Text>
              <Button
                title="View Original Post"
                variant="ghost"
                size="sm"
                onPress={() => router.push(`/citizen/${pickup.post_id}`)}
                style={styles.viewPostButton}
                textStyle={styles.viewPostButtonText}
              />
            </View>
          </View>
          {post.description && (
            <Text style={styles.postDescription}>{post.description}</Text>
          )}
        </Card>

        {/* Schedule & Location */}
        <Card variant="default" padding="lg" style={styles.section}>
          <Text style={styles.sectionLabel}>SCHEDULE & LOCATION</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconBadge}>
              <Feather name="calendar" size={18} color={theme.colors.emerald[700]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Scheduled Time</Text>
              <Text style={styles.infoValue}>
                {pickup.scheduled_date ? new Date(pickup.scheduled_date).toLocaleDateString() : 'ASAP'}
                {pickup.start_time ? ` • ${pickup.start_time} - ${pickup.end_time}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBadge}>
              <Feather name="map-pin" size={18} color={theme.colors.emerald[700]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Pickup Address</Text>
              <Text style={styles.infoValue}>
                {(post as any).address || 'No address provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Contact & Access Notes */}
        <Card variant="default" padding="lg" style={styles.section}>
          <Text style={styles.sectionLabel}>CONTACT & ACCESS</Text>

          <View style={styles.contactRow}>
            <Feather name="phone" size={18} color={theme.colors.text.tertiary} />
            <Text style={styles.contactText}>{pickup.contact_number || 'No contact provided'}</Text>
          </View>

          <View style={styles.notesRow}>
            <Feather name="key" size={18} color={theme.colors.text.tertiary} style={styles.notesIcon} />
            <Text style={styles.notesText}>{pickup.access_notes || 'No access notes provided'}</Text>
          </View>
        </Card>

      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {currentUserRole === 'CITIZEN' && (pickup.status === PickupStatus.PENDING || pickup.status === PickupStatus.ASSIGNED) && (
          <Button
            title="Cancel Pickup"
            variant="danger"
            size="lg"
            onPress={() => setCancelModalVisible(true)}
          />
        )}

        {currentUserRole === 'COLLECTOR' && pickup.status === PickupStatus.ASSIGNED && (
          <Button
            title="Start Pickup (In Transit)"
            variant="primary"
            size="lg"
            onPress={handleStartTransit}
            loading={loading}
            disabled={loading}
          />
        )}

        {currentUserRole === 'COLLECTOR' && pickup.status === PickupStatus.IN_TRANSIT && (
          <Button
            title="Complete Pickup"
            variant="primary"
            size="lg"
            onPress={() => router.push(`/pickups/confirm?id=${pickup.id}`)}
            icon={<Feather name="check-circle" size={20} color={theme.colors.canvas.primary} />}
            iconPosition="right"
          />
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <Button
            title="View Receipt"
            variant="secondary"
            size="lg"
            onPress={() => {}}
          />
        )}
      </View>

      <CancelPickupModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas.secondary,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg + 4,
    paddingBottom: 100,
  },
  timelineCard: {
    marginBottom: theme.spacing.xl,
  },
  canceledCard: {
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.status.canceled.bg,
  },
  canceledContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  canceledText: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg.size,
    marginLeft: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    color: theme.colors.emerald[700],
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 1,
    marginBottom: theme.spacing.lg,
  },
  postContent: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
  },
  postInfo: {
    marginLeft: theme.spacing.lg,
    flex: 1,
  },
  postTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.lg.size,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  postMeta: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    marginBottom: theme.spacing.xs,
  },
  viewPostButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    height: 'auto',
    marginTop: theme.spacing.xs,
  },
  viewPostButtonText: {
    fontSize: theme.typography.fontSize.sm.size,
  },
  postDescription: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconBadge: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.status.completed.bg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    marginBottom: 2,
  },
  infoValue: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  contactText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesIcon: {
    marginTop: 2,
  },
  notesText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    marginLeft: theme.spacing.md,
    flex: 1,
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

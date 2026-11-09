import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
  ScrollView, SafeAreaView, TextInput,
  StyleSheet, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../theme/tokens';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import PostService, { Post } from '../../../../services/post.service';
import RequestService, { RequestStatus } from '../../../../services/request.service';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import { InlineLoader } from '../../../components/ui/LoadingScreen';
import { getPostQuantities } from '../../../utils/post-quantities';
import { useToast, ConfirmSheet } from '../../../components/ui';

interface RequestResponse {
  id: number;
  status: RequestStatus;
}

interface CollectedData {
  quantity: number;
  notes?: string;
}

const getQuantityUnit = (category: string | undefined): string => {
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  return liquidCategories.includes(category || '') ? 'L' : 'kg';
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CollectorPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<RequestResponse | null>(null);

  // ConfirmSheet states
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;

      try {
        const postData = await PostService.getPostById(Number(id));
        setPost(postData);
        console.log('POST DETAIL RAW', JSON.stringify(postData, null, 2));
        // Check for existing PENDING request
        const requests = await RequestService.getRequestsForPost(Number(id));
        const pending = requests.find(r => r.status === RequestStatus.PENDING);
        if (pending) {
          setHasPendingRequest(true);
          setPendingRequest({ id: pending.id, status: pending.status });
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load post details');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const quantities = getPostQuantities(post);
  const unit = quantities.unit;
  const isQuantityUnavailable = quantities.available === null;
  const availableForRequest = quantities.available ?? 0;
  const totalForDisplay = quantities.total ?? 0;

  const handleWithdrawPress = () => {
    setShowWithdrawSheet(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!pendingRequest) return;
    setSubmitting(true);
    try {
      await RequestService.withdrawRequest(pendingRequest.id);
      setHasPendingRequest(false);
      setPendingRequest(null);
      showToast('Request withdrawn', 'success');
      router.back();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to withdraw request', 'error');
    } finally {
      setSubmitting(false);
      setShowWithdrawSheet(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!post || !quantity.trim() || isQuantityUnavailable) return;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    if (isQuantityUnavailable) {
      showToast('Unable to request - quantity information is not available.', 'error');
      return;
    }
    if (qty > availableForRequest) {
      showToast(`Only ${availableForRequest} ${unit} available`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      await RequestService.createRequest({
        post_id: post.id,
        requested_quantity: qty,
        message: message.trim() || undefined,
      });
      showToast('Request submitted. You can track it in the Requests tab.', 'success');
      router.back();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading post details..." />;
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title={error || 'Post not found'} showBell={false} />
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="alert-outline" size={64} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{error || 'Post not found'}</Text>
          <Text style={styles.emptyDesc}>Unable to load post details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = post.images?.[0]?.url?.trim()
    ? post.images[0].url.replace('http://', 'https://')
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={post?.title ?? "Post details"} showBack={true} showBell={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Post Image */}
        <View style={styles.imageSection}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="recycle" size={48} color={theme.colors.emerald[600]} />
            </View>
          )}
        </View>

        {/* Post Info */}
        <View style={styles.infoSection}>
          <Text style={styles.postTitle}>{post.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="tag" size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.metaText}>{post.category || 'Unknown'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="package-variant" size={14} color={theme.colors.emerald[600]} />
              {isQuantityUnavailable ? (
                <Text style={[styles.metaText, { color: theme.colors.text.tertiary }]}>
                  Quantity unavailable
                </Text>
              ) : availableForRequest === 0 ? (
                <Text style={[styles.metaText, { color: theme.colors.text.tertiary }]}>
                  Fully reserved
                </Text>
              ) : (
                <Text style={[styles.metaText, { color: theme.colors.emerald[600] }]}>
                  {availableForRequest.toLocaleString()} / {totalForDisplay.toLocaleString()} {unit} available
                </Text>
              )}
            </View>
          </View>

          {post.description && (
            <Text style={styles.description}>{post.description}</Text>
          )}
        </View>

        {/* Request Form */}
        {hasPendingRequest && pendingRequest ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Request</Text>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.colors.gold[500]}
              />
              <Text style={styles.pendingText}>
                Your request is {formatStatus(pendingRequest.status)}
              </Text>
            </View>

            {pendingRequest.status === RequestStatus.PENDING && (
              <TouchableOpacity
                onPress={handleWithdrawPress}
                disabled={submitting}
                style={styles.withdrawButton}
              >
                {submitting ? (
                  <InlineLoader />
                ) : (
                  <Text style={styles.withdrawText}>Withdraw Request</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : isQuantityUnavailable ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity Info</Text>
            <View style={styles.disabledSection}>
              <MaterialCommunityIcons name="alert-outline" size={24} color={theme.colors.text.tertiary} />
              <Text style={styles.disabledText}>Quantity unavailable</Text>
              <Text style={styles.disabledDesc}>
                Unable to load quantity data from the post.
              </Text>
            </View>
          </View>
        ) : availableForRequest === 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.disabledSection}>
              <Text style={styles.disabledText}>Fully reserved</Text>
              <Text style={styles.disabledDesc}>
                All available waste has been reserved. Check back later.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send a Request</Text>

            {/* Quantity Breakdown */}
            <View style={styles.quantityBreakdown}>
              <Text style={styles.breakdownLabel}>Total: {totalForDisplay.toLocaleString()} {unit}</Text>
              {quantities.reserved !== null && (
                <Text style={styles.breakdownLabel}>Reserved: {quantities.reserved.toLocaleString()} {unit}</Text>
              )}
              {quantities.collected !== null && (
                <Text style={styles.breakdownLabel}>Collected: {quantities.collected.toLocaleString()} {unit}</Text>
              )}
              <Text style={styles.breakdownLabel}>Available: {availableForRequest.toLocaleString()} {unit}</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Request quantity ({unit})</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter amount"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Message (optional)</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Add a note for the supplier..."
                multiline
                numberOfLines={3}
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              onPress={handleSubmitRequest}
              disabled={submitting || !quantity.trim()}
              style={[
                styles.submitButton,
                (!quantity.trim() || submitting) && styles.submitButtonDisabled
              ]}
            >
              {submitting ? (
                <InlineLoader />
              ) : (
                <Text style={styles.submitText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ConfirmSheet */}
      <ConfirmSheet
        visible={showWithdrawSheet}
        onClose={() => setShowWithdrawSheet(false)}
        title="Withdraw Request"
        message="Are you sure you want to withdraw this request?"
        confirmText="Withdraw"
        cancelText="Cancel"
        onConfirm={handleWithdrawConfirm}
        loading={submitting}
        variant="destructive"
        icon="undo-outline"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.canvas.tertiary,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.emerald[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  postTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  description: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  quantityInput: {
    height: 48,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.fontSize.base.size,
    backgroundColor: theme.colors.canvas.primary,
  },
  messageInput: {
    height: 80,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.fontSize.base.size,
    backgroundColor: theme.colors.canvas.primary,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  pendingText: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  disabledSection: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  disabledText: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  disabledDesc: {
    fontSize: theme.typography.fontSize.sm.size,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  quantityBreakdown: {
    backgroundColor: theme.colors.emerald[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: 4,
  },
  breakdownLabel: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  submitButton: {
    height: 48,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
  },
  submitText: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  withdrawButton: {
    height: 48,
    backgroundColor: theme.colors.error[500],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawText: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: theme.typography.fontSize.base.size,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.error[500],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
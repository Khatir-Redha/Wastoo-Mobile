import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { theme } from '../../theme/tokens';

/**
 * Request Card Skeleton
 *
 * Matches the structure of RequestCard in requests.tsx for Incoming Requests segment
 */
export function RequestCardSkeleton() {
  return (
    <View style={styles.requestCard}>
      {/* Header with status badge and date */}
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Skeleton width={70} height={16} borderRadius={theme.radius.sm} />
        </View>
        <Skeleton width={60} height={12} />
      </View>

      {/* Card content */}
      <View style={styles.cardContent}>
        <View style={styles.imageWrapper}>
          <Skeleton width={64} height={64} borderRadius={theme.radius.md} />
        </View>
        <View style={styles.infoWrapper}>
          <Skeleton width="70%" height={16} style={styles.postTitle} />
          <View style={styles.metaRow}>
            <Skeleton width={40} height={12} />
            <Skeleton width={60} height={12} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  postTitle: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.xs,
  },
});

export default RequestCardSkeleton;
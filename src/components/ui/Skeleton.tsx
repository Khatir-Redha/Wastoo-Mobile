import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Base Skeleton Component
 *
 * Animated placeholder for loading content.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = theme.radius.sm,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 0.6, 0.3]
    );

    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Post Card Skeleton
 *
 * Skeleton for post/waste item cards in grid.
 */
export function PostCardSkeleton() {
  return (
    <View style={styles.postCard}>
      <Skeleton height={144} borderRadius={theme.radius.xl - 2} style={styles.postImage} />
      <View style={styles.postInfo}>
        <Skeleton height={16} width="80%" style={styles.postTitle} />
        <View style={styles.postMeta}>
          <Skeleton height={12} width="40%" />
          <Skeleton height={12} width="30%" />
        </View>
      </View>
    </View>
  );
}

/**
 * List Item Skeleton
 *
 * Skeleton for activity list items.
 */
export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={64} height={64} borderRadius={theme.radius.sm} />
      <View style={styles.listItemContent}>
        <Skeleton height={16} width="70%" style={styles.mb4} />
        <Skeleton height={12} width="50%" style={styles.mb4} />
        <Skeleton height={10} width="30%" />
      </View>
    </View>
  );
}

/**
 * Pickup Card Skeleton
 *
 * Skeleton for pickup request cards.
 */
export function PickupCardSkeleton() {
  return (
    <View style={styles.pickupCard}>
      <View style={styles.pickupHeader}>
        <View style={styles.pickupHeaderLeft}>
          <Skeleton width={36} height={36} borderRadius={theme.radius.full} />
          <Skeleton height={16} width={100} style={{ marginLeft: theme.spacing.md }} />
        </View>
        <Skeleton height={24} width={80} borderRadius={theme.radius.full} />
      </View>
      <Skeleton height={12} width="60%" style={styles.mb4} />
      <Skeleton height={12} width="70%" />
    </View>
  );
}

/**
 * Grid Skeleton
 *
 * Renders multiple post card skeletons in a grid.
 */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * List Skeleton
 *
 * Renders multiple list item skeletons.
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.border.default,
  },
  postCard: {
    width: '48%',
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  postImage: {
    marginBottom: theme.spacing.md,
  },
  postInfo: {
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  postTitle: {
    marginBottom: theme.spacing.xs + 2,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  listItemContent: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  pickupCard: {
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl - 2,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pickupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  list: {
    gap: theme.spacing.lg,
  },
  mb4: {
    marginBottom: 4,
  },
});

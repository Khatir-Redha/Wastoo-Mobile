import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GamificationService, { Badge, UserBadge } from "../../../services/gamification.service";
import { theme } from "../../theme/tokens";
import NotificationBell from "../../components/NotificationBell";

export default function GamificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownedCodes = React.useMemo(
    () => new Set(userBadges.map((b) => b.badge_code)),
    [userBadges],
  );

  const fetchBadges = useCallback(async () => {
    try {
      setError(null);
      const res = await GamificationService.getBadges();
      setBadges(res.badges ?? []);
      setUserBadges(res.userBadges ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load badges");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBadges();
    }, [fetchBadges]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBadges();
  }, [fetchBadges]);

  const getThreshold = (b: Badge) => {
    const c = b.criteria as any;
    if (c && typeof c.threshold === "number") return c.threshold;
    return null;
  };

  const getMetric = (b: Badge) => {
    const c = b.criteria as any;
    return c?.metric ?? null;
  };

  const isBadIcon = (b: Badge) => !b.icon_url || b.icon_url.trim() === "";

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badges</Text>
        <NotificationBell />
      </View>
      <Text style={styles.headerSubtitle}>Collect badges as you recycle ♻️</Text>
    </View>
  );

  const renderBadge = ({ item }: { item: Badge }) => {
    const unlocked = ownedCodes.has(item.code);
    const awarded = userBadges.find((u) => u.badge_code === item.code);
    const threshold = getThreshold(item);
    const metric = getMetric(item);

    return (
      <View style={[styles.badgeCard, unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}>
        <View style={[styles.iconCircle, unlocked ? styles.iconCircleUnlocked : styles.iconCircleLocked]}>
          {isBadIcon(item) ? (
            <MaterialCommunityIcons
              name={metric === "pickups" ? "truck-check-outline" : "recycle"}
              size={30}
              color={unlocked ? theme.colors.emerald[500] : theme.colors.text.quaternary}
            />
          ) : (
            <Image
              source={{ uri: item.icon_url }}
              style={{ width: 36, height: 36, opacity: unlocked ? 1 : 0.45 }}
              contentFit="contain"
            />
          )}
          {unlocked && (
            <View style={styles.checkBadge}>
              <Feather name="check" size={12} color={theme.colors.text.inverse} />
            </View>
          )}
        </View>

        <View style={styles.badgeBody}>
          <View style={styles.badgeHeaderRow}>
            <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.statePill, unlocked ? styles.statePillUnlocked : styles.statePillLocked]}>
              <Text style={[styles.statePillText, unlocked ? styles.statePillTextUnlocked : styles.statePillTextLocked]}>
                {unlocked ? "Unlocked" : "Locked"}
              </Text>
            </View>
          </View>

          <Text style={styles.badgeDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.metaRow}>
            {threshold !== null && metric && (
              <View style={styles.metaChip}>
                <Feather
                  name={metric === "pickups" ? "package" : "file-text"}
                  size={12}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.metaChipText}>
                  {threshold} {metric}
                </Text>
              </View>
            )}
            <Text style={styles.codeText}>{item.code}</Text>
          </View>

          {awarded?.awarded_at && (
            <Text style={styles.awardedText}>
              Earned {new Date(awarded.awarded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text style={styles.loadingText}>Loading badges…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={48} color={theme.colors.border.dark} />
          <Text style={styles.errorTitle}>Couldn&apos;t load badges</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchBadges();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unlockedCount = userBadges.length;
  const totalCount = badges.length;

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.emerald[50] }]}>
            <Feather name="award" size={22} color={theme.colors.emerald[500]} />
          </View>
          <Text style={styles.statValue}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.mint[50] }]}>
            <MaterialCommunityIcons name="trophy-outline" size={22} color={theme.colors.mint[700]} />
          </View>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.gold[50] }]}>
            <Feather name="star" size={22} color={theme.colors.gold[500]} />
          </View>
          <Text style={styles.statValue}>
            {totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
      </View>

      {badges.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.emptyContainer, { paddingBottom: insets.bottom + theme.spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
        >
          <MaterialCommunityIcons name="seal-variant" size={56} color={theme.colors.border.default} />
          <Text style={styles.emptyTitle}>No badges yet</Text>
          <Text style={styles.emptyText}>
            Keep posting and completing pickups to earn your first badge.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => String(item.code)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          renderItem={renderBadge}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  errorTitle: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  retryBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.emerald[500],
    paddingHorizontal: theme.spacing.xl,
    height: 44,
    borderRadius: theme.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.canvas.secondary,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  headerTitle: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize["3xl"].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize["2xl"].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  list: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.canvas.primary,
    gap: theme.spacing.md,
  },
  badgeCardUnlocked: {
    borderColor: theme.colors.emerald[200],
    backgroundColor: theme.colors.canvas.primary,
    ...theme.shadows.sm,
  },
  badgeCardLocked: {
    borderColor: theme.colors.border.default,
    opacity: 0.92,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconCircleUnlocked: {
    backgroundColor: theme.colors.emerald[50],
    borderColor: theme.colors.emerald[200],
  },
  iconCircleLocked: {
    backgroundColor: theme.colors.canvas.secondary,
    borderColor: theme.colors.border.light,
  },
  checkBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.emerald[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.canvas.primary,
  },
  badgeBody: {
    flex: 1,
  },
  badgeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  badgeName: {
    flex: 1,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  badgeNameLocked: {
    color: theme.colors.text.secondary,
  },
  badgeDescription: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  statePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  statePillUnlocked: {
    backgroundColor: theme.colors.emerald[50],
    borderColor: theme.colors.emerald[200],
  },
  statePillLocked: {
    backgroundColor: theme.colors.canvas.secondary,
    borderColor: theme.colors.border.light,
  },
  statePillText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    letterSpacing: 0.4,
  },
  statePillTextUnlocked: {
    color: theme.colors.emerald[700],
  },
  statePillTextLocked: {
    color: theme.colors.text.quaternary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.canvas.secondary,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  metaChipText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  codeText: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.quaternary,
  },
  awardedText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.quaternary,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  emptyText: {
    marginTop: theme.spacing.sm,
    textAlign: "center",
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
});

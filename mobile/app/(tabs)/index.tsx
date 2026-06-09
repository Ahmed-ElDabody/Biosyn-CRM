import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listMyDoctors,
  type FrequencyState,
  type MeDoctorListItem,
} from "../../lib/api";
import { colors } from "../../lib/theme";

// Frequency-bar colour per spec §12: grey → light orange → green as the rep
// works through the monthly target, with a deeper green once over-achieved.
const FREQ_COLOR: Record<FrequencyState, string> = {
  todo: "#B8BCC4",
  in_progress: colors.amber,
  done: colors.mint,
  over: colors.teal,
};

export default function DoctorListTab() {
  const [items, setItems] = useState<MeDoctorListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // pageSize 200 = the endpoint max; covers every current rep (largest list
      // is 144). The footer flags it if a list ever exceeds what we loaded.
      const res = await listMyDoctors({ pageSize: 200 });
      if (res === null) {
        setError("Your session has expired. Please sign in again.");
        return;
      }
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError("Couldn't load your list. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab gains focus, so newly-attached accounts and fresh
  // visit counts show without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.listEntryId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerCount}>{total}</Text>
            <Text style={styles.headerLabel}>
              {total === 1 ? "account on your list" : "accounts on your list"}
            </Text>
          </View>
        }
        renderItem={({ item }) => <DoctorRow item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {error ? (
              <>
                <Text style={styles.emptyTitle}>{error}</Text>
                <Pressable onPress={onRefresh} style={styles.retry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.emptyTitle}>
                No accounts on your list yet. Your manager attaches accounts during the list
                window.
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          items.length > 0 && total > items.length ? (
            <Text style={styles.footer}>
              Showing {items.length} of {total}.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function DoctorRow({ item }: { item: MeDoctorListItem }) {
  const { doctor, frequency } = item;
  const pct = Math.min(100, Math.max(0, frequency.progressPct));
  const barColor = FREQ_COLOR[frequency.state];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.name} numberOfLines={1}>
          {doctor.nameAr}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.classChip, doctor.class === "A" ? styles.classA : styles.classB]}>
            <Text style={styles.classText}>{doctor.class}</Text>
          </View>
          <View style={styles.typeChip}>
            <Text style={styles.typeText}>{doctor.accountType}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.specialty}>{doctor.specialty}</Text>
      {doctor.addressAr ? (
        <Text style={styles.address} numberOfLines={1}>
          {doctor.addressAr}
        </Text>
      ) : null}

      <View style={styles.freqRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.freqText}>
          {frequency.actual}/{frequency.target}
          {frequency.overBy > 0 ? ` (+${frequency.overBy})` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 32 },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  headerCount: { color: colors.navy, fontSize: 22, fontWeight: "700" },
  headerLabel: { color: colors.navyMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    shadowColor: colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.navy,
    fontSize: 16,
    fontWeight: "600",
    writingDirection: "rtl",
    textAlign: "right",
  },
  badges: { flexDirection: "row", gap: 6 },
  classChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  classA: { backgroundColor: "rgba(226,87,76,0.15)" },
  classB: { backgroundColor: "rgba(201,161,74,0.18)" },
  classText: { fontSize: 11, fontWeight: "700", color: colors.navy },
  typeChip: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(14,124,123,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { fontSize: 11, fontWeight: "700", color: colors.teal },
  specialty: { color: colors.deep, fontSize: 13, marginTop: 8, fontWeight: "500" },
  address: {
    color: colors.navyMuted,
    fontSize: 12,
    marginTop: 2,
    writingDirection: "rtl",
    textAlign: "right",
  },
  freqRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.navyFaint,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4 },
  freqText: {
    color: colors.navyMuted,
    fontSize: 12,
    fontWeight: "600",
    minWidth: 52,
    textAlign: "right",
  },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { color: colors.navyMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  retry: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.teal,
  },
  retryText: { color: colors.white, fontWeight: "600" },
  footer: { color: colors.navyMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
});

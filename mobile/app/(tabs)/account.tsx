import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStoredUser, logout, type AuthUser, API_BASE } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function AccountTab() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => setUser(await getStoredUser()))();
  }, []);

  async function handleSignOut() {
    setBusy(true);
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.name}>{user?.nameEn ?? "—"}</Text>
          <Text style={styles.email}>{user?.email ?? "—"}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{user?.role ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>API endpoint</Text>
          <Text style={styles.mono}>{API_BASE}</Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.buttonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 20, gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    shadowColor: colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    color: colors.navyMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  name: { color: colors.navy, fontSize: 18, fontWeight: "600" },
  email: { color: colors.navyMuted, fontSize: 13, marginTop: 2 },
  roleChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(14,124,123,0.1)",
    borderColor: "rgba(14,124,123,0.4)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  mono: { color: colors.navy, fontSize: 12, fontFamily: "Menlo" },
  button: {
    backgroundColor: colors.coral,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.white, fontWeight: "600", fontSize: 15 },
});

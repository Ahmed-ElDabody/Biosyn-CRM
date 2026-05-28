import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, login, API_BASE } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("amira.adel@biosyn.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role !== "rep") {
        setError(
          `This app is for sales reps. Signed-in account has role "${user.role}".`,
        );
        setBusy(false);
        return;
      }
      router.replace("/(tabs)");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed";
      setError(message);
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>BIOSYN</Text>
            </View>
            <Text style={styles.slogan}>A Commitment Towards Better Health</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Rep sign in</Text>
            <Text style={styles.subtitle}>Sign in with your Biosyn email.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={colors.navyMuted}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={colors.navyMuted}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                (busy || pressed) && styles.buttonPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <Text style={styles.endpoint}>API: {API_BASE}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  brand: { alignItems: "center", marginBottom: 32 },
  logoBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  logoText: {
    color: colors.white,
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: "700",
  },
  slogan: { color: colors.navyMuted, fontStyle: "italic", fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: { color: colors.navy, fontSize: 22, fontWeight: "600" },
  subtitle: { color: colors.navyMuted, fontSize: 13, marginTop: 4, marginBottom: 18 },
  label: { color: colors.navy, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.navyFaint,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.navy,
    fontSize: 15,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: "rgba(226,87,76,0.1)",
    borderColor: "rgba(226,87,76,0.4)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: { color: colors.coral, fontSize: 13 },
  button: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  endpoint: {
    marginTop: 16,
    color: colors.navyMuted,
    fontSize: 11,
    textAlign: "center",
  },
});

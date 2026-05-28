import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../lib/theme";

export default function EmptyState({
  title,
  body,
  spec,
}: {
  title: string;
  body: string;
  spec?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>⏳</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {spec && <Text style={styles.spec}>Spec reference: {spec}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(232,146,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: { fontSize: 26 },
  title: { color: colors.navy, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  body: {
    color: colors.navyMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  spec: {
    marginTop: 14,
    color: colors.navyMuted,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
});

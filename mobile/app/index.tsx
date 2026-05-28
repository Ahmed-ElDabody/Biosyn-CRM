import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { getStoredUser } from "../lib/api";
import { colors } from "../lib/theme";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      if (user) router.replace("/(tabs)");
      else router.replace("/(auth)/login");
      setChecking(false);
    })();
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checking && <ActivityIndicator color={colors.navy} />}
    </View>
  );
}

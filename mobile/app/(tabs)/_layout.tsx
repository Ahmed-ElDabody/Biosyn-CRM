import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "../../lib/theme";

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 16,
          color: focused ? colors.navy : colors.navyMuted,
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.white, fontWeight: "600" },
        headerTintColor: colors.white,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.navyMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.navyFaint,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Doctor List",
          tabBarIcon: ({ focused }) => <TabIcon glyph="DR" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Weekly Plan",
          tabBarIcon: ({ focused }) => <TabIcon glyph="PL" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Manage List",
          tabBarIcon: ({ focused }) => <TabIcon glyph="LS" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: "Session",
          tabBarIcon: ({ focused }) => <TabIcon glyph="SE" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => <TabIcon glyph="ME" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import { AuthGate } from "@/components/AuthGate";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <AuthGate>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.borderLight },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShown: useClientOnlyValue(false, true),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "house", android: "home", web: "home" }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="closet"
          options={{
            title: "Closet",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "tshirt", android: "checkroom", web: "checkroom" }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="style-me"
          options={{
            title: "Style Me",
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="agent"
          options={{
            title: "Stylist",
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "bubble.left.and.bubble.right", android: "chat", web: "chat" }} tintColor={color} size={24} />
            ),
          }}
        />
      </Tabs>
    </AuthGate>
  );
}

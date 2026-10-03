import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/components/useStackScreenOptions";

export default function FittingLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="likeness" options={{ title: "Photos of you", presentation: "modal" }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}

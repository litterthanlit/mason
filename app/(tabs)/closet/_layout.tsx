import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/components/useStackScreenOptions";

export default function ClosetLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Closet" }} />
      <Stack.Screen name="add" options={{ title: "Add a garment", presentation: "modal" }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}

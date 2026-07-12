import { Stack } from "expo-router";

export default function ClosetLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Closet" }} />
      <Stack.Screen name="add" options={{ title: "Add Item", presentation: "modal" }} />
      <Stack.Screen name="[id]" options={{ title: "Item" }} />
    </Stack>
  );
}

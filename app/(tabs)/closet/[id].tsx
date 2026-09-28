import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { CATEGORY_LABELS } from "@/lib/types";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const item = useQuery(api.wardrobe.get, { itemId: id as Id<"wardrobeItems"> });
  const updateItem = useMutation(api.wardrobe.update);
  const removeItem = useMutation(api.wardrobe.remove);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (item === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Loading...</Text>
      </View>
    );
  }

  if (item === null) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Item not found</Text>
      </View>
    );
  }

  const wardrobeItem = item;

  async function handleSave() {
    await updateItem({ itemId: wardrobeItem._id, name: name || wardrobeItem.name });
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert("Delete item", "Remove this from your closet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeItem({ itemId: wardrobeItem._id });
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Image source={{ uri: wardrobeItem.imageUrl }} style={styles.image} contentFit="cover" />

      {editing ? (
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          value={name || wardrobeItem.name}
          onChangeText={setName}
        />
      ) : (
        <Text style={[styles.name, { color: colors.text }]}>{wardrobeItem.name}</Text>
      )}

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {CATEGORY_LABELS[wardrobeItem.category]} · {wardrobeItem.subcategory}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Pattern</Text>
        <Text style={{ color: colors.text }}>{wardrobeItem.pattern}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Fit</Text>
        <Text style={{ color: colors.text }}>{wardrobeItem.fit}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Seasons</Text>
        <Text style={{ color: colors.text }}>{wardrobeItem.season.join(", ")}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Occasions</Text>
        <Text style={{ color: colors.text }}>{wardrobeItem.occasions.join(", ")}</Text>
      </View>

      <View style={styles.swatches}>
        {wardrobeItem.colors.map((color) => (
          <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={() => (editing ? handleSave() : setEditing(true))}
      >
        <Text style={[styles.buttonText, { color: colors.onTint }]}>{editing ? "Save" : "Edit Name"}</Text>
      </Pressable>

      <Pressable style={[styles.deleteButton, { borderColor: colors.error }]} onPress={handleDelete}>
        <Text style={{ color: colors.error }}>Delete Item</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", aspectRatio: 3 / 4, borderRadius: 12 },
  name: { fontSize: 24, fontWeight: "700" },
  meta: { fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { fontSize: 14 },
  swatches: { flexDirection: "row", gap: 8, marginVertical: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18 },
  button: { paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { fontWeight: "600", fontSize: 16 },
  deleteButton: { paddingVertical: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, marginTop: 8 },
});

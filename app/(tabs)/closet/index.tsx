import { useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { ItemCard } from "@/components/ItemCard";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { CATEGORY_LABELS, GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/types";

export default function ClosetScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [filter, setFilter] = useState<GarmentCategory | undefined>();

  const items = useQuery(api.wardrobe.list, { category: filter });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[undefined, ...GARMENT_CATEGORIES] as const}
          keyExtractor={(item) => item ?? "all"}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const active = filter === item;
            const label = item ? CATEGORY_LABELS[item] : "All";
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.tint : colors.backgroundSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
                onPress={() => setFilter(item)}
              >
                <Text style={{ color: active ? colors.onTint : colors.text, fontSize: 13, fontWeight: "500" }}>
                  {label}
                </Text>
              </Pressable>
            );
          }}
        />
        <Link href="/closet/add" asChild>
          <Pressable style={[styles.addButton, { backgroundColor: colors.tint }]}>
            <Text style={[styles.addButtonText, { color: colors.onTint }]}>+ Add</Text>
          </Pressable>
        </Link>
      </View>

      {!items ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Loading...</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your closet is empty</Text>
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Photograph your first item to get started
          </Text>
          <Link href="/closet/add" asChild>
            <Pressable style={[styles.emptyButton, { backgroundColor: colors.tint }]}>
              <Text style={[styles.addButtonText, { color: colors.onTint }]}>Add Item</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ItemCard
              id={item._id}
              name={item.name}
              imageUrl={item.imageUrl}
              category={item.category}
              colors={item.colors}
              onPress={() => router.push(`/closet/${item._id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 12, gap: 12 },
  filters: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  addButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addButtonText: { fontWeight: "600", fontSize: 15 },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  empty: { fontSize: 14, textAlign: "center" },
  emptyButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});

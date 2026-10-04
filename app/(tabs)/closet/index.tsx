import { useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { ItemCard } from "@/components/ItemCard";
import { Body, Button, Chip, Title, space, useTheme } from "@/components/ui";
import { CATEGORY_LABELS, GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/types";

export default function ClosetScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<GarmentCategory | undefined>();

  const items = useQuery(api.wardrobe.list, { category: filter });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        accessibilityRole="radiogroup"
      >
        {[undefined, ...GARMENT_CATEGORIES].map((cat) => (
          <Chip
            key={cat ?? "all"}
            label={cat ? CATEGORY_LABELS[cat] : "All"}
            selected={filter === cat}
            onPress={() => setFilter(cat)}
          />
        ))}
      </ScrollView>

      {items === undefined ? (
        <ActivityIndicator color={colors.tint} style={styles.loading} accessibilityLabel="Loading closet" />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Title size="md">{filter ? `No ${CATEGORY_LABELS[filter].toLowerCase()} yet` : "An empty closet"}</Title>
          <Body>Photograph what you own. The stylist only dresses you from here.</Body>
          <Link href="/closet/add" asChild>
            <Button label="Add a garment" style={styles.emptyButton} />
          </Link>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <Link href="/closet/add" asChild>
              <Button label="Add a garment" variant="outline" />
            </Link>
          }
          renderItem={({ item }) => (
            <ItemCard
              name={item.name}
              imageUrl={item.mockupUrl ?? item.imageUrl}
              category={item.category}
              colors={item.colors}
              status={item.mockupStatus === "queued" || item.mockupStatus === "running" ? "Studio shot…" : undefined}
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
  filterBar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  filters: { paddingHorizontal: space.xl, columnGap: space.lg },
  loading: { marginTop: space.xxxl },
  grid: { padding: space.xl, gap: space.xxl },
  row: { gap: space.md },
  emptyState: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.md },
  emptyButton: { marginTop: space.md },
});

import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GarmentForm, type GarmentDraft } from "@/components/GarmentForm";
import { Swatch } from "@/components/Swatch";
import { Body, Button, Chip, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { describeError } from "@/lib/errors";
import { CATEGORY_LABELS } from "@/lib/types";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const router = useRouter();

  const item = useQuery(api.wardrobe.get, { itemId: id as Id<"wardrobeItems"> });
  const updateItem = useMutation(api.wardrobe.update);
  const removeItem = useMutation(api.wardrobe.remove);
  const requestMockup = useMutation(api.mockups.request);

  const [draft, setDraft] = useState<GarmentDraft | null>(null);
  const [view, setView] = useState<"studio" | "photo">("studio");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (item === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} accessibilityLabel="Loading item" />
      </View>
    );
  }

  if (item === null) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Body>This piece is no longer in the closet.</Body>
      </View>
    );
  }

  const wardrobeItem = item;
  const rendering = item.mockupStatus === "queued" || item.mockupStatus === "running";
  const showStudio = view === "studio" && !!item.mockupUrl;

  async function handleMockup() {
    setError("");
    try {
      await requestMockup({ itemId: wardrobeItem._id });
    } catch (err) {
      setError(describeError(err, "Could not start the studio shot."));
    }
  }

  function startEditing() {
    setError("");
    setDraft({
      name: wardrobeItem.name,
      category: wardrobeItem.category,
      subcategory: wardrobeItem.subcategory,
      colors: wardrobeItem.colors,
      pattern: wardrobeItem.pattern,
      fit: wardrobeItem.fit,
      season: wardrobeItem.season,
      occasions: wardrobeItem.occasions,
      material: wardrobeItem.material,
      brand: wardrobeItem.brand,
    });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      await updateItem({ itemId: wardrobeItem._id, ...draft, name: draft.name.trim() || wardrobeItem.name });
      setDraft(null);
    } catch (err) {
      setError(describeError(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete item", "Remove this from your closet? Looks that use it will lose this piece.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeItem({ itemId: wardrobeItem._id });
            router.back();
          } catch (err) {
            setError(describeError(err, "Could not delete this item."));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: draft ? "Edit" : "" }} />
      <View>
        <Image
          source={{ uri: showStudio ? item.mockupUrl! : wardrobeItem.imageUrl }}
          style={[styles.image, { backgroundColor: colors.backgroundSecondary }]}
          contentFit="cover"
          transition={200}
          accessibilityLabel={`${wardrobeItem.name}, ${showStudio ? "studio shot" : "your photo"}`}
        />
        {rendering ? (
          <View style={[styles.rendering, { backgroundColor: colors.background }]} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Kicker>Making the studio shot</Kicker>
          </View>
        ) : null}
      </View>

      {item.mockupUrl ? (
        <View style={styles.views} accessibilityRole="radiogroup" accessibilityLabel="Image">
          <Chip label="Studio" selected={showStudio} onPress={() => setView("studio")} />
          <Chip label="Your photo" selected={!showStudio} onPress={() => setView("photo")} />
        </View>
      ) : item.mockupStatus === "failed" ? (
        <View style={styles.mockupRow}>
          <ErrorText style={styles.flex}>{item.mockupError ?? "The studio shot failed."}</ErrorText>
          <Button label="Retry" variant="ghost" onPress={handleMockup} />
        </View>
      ) : !rendering ? (
        <Button label="Make a studio shot" variant="ghost" onPress={handleMockup} style={styles.alignStart} />
      ) : null}

      {draft ? (
        <>
          <GarmentForm value={draft} onChange={setDraft} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button label="Save" onPress={handleSave} loading={saving} disabled={draft.colors.length === 0} />
          <Button label="Cancel" variant="ghost" onPress={() => setDraft(null)} />
        </>
      ) : (
        <>
          <View style={styles.heading}>
            <Kicker>{CATEGORY_LABELS[wardrobeItem.category]}</Kicker>
            <Title size="md">{wardrobeItem.name}</Title>
            <Body>{wardrobeItem.subcategory}</Body>
          </View>

          <View style={styles.swatches}>
            {wardrobeItem.colors.map((color, i) => (
              <Swatch key={`${color}-${i}`} color={color} />
            ))}
          </View>

          <View style={[styles.specs, { borderTopColor: colors.border }]}>
            <Spec label="Pattern" value={wardrobeItem.pattern} />
            <Spec label="Fit" value={wardrobeItem.fit} />
            {wardrobeItem.material ? <Spec label="Material" value={wardrobeItem.material} /> : null}
            {wardrobeItem.brand ? <Spec label="Brand" value={wardrobeItem.brand} /> : null}
            <Spec label="Seasons" value={wardrobeItem.season.join(", ")} />
            <Spec label="Occasions" value={wardrobeItem.occasions.join(", ")} />
          </View>

          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button
            label="Try it on"
            onPress={() => router.push({ pathname: "/fitting", params: { items: wardrobeItem._id } })}
          />
          <Button label="Edit" variant="outline" onPress={startEditing} />
          <Button label="Delete" variant="danger" onPress={handleDelete} />
        </>
      )}
    </Screen>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.spec, { borderBottomColor: colors.border }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Kicker>{label}</Kicker>
      <Body tone="primary" style={styles.specValue}>
        {value}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  image: { width: "100%", aspectRatio: 3 / 4 },
  rendering: {
    position: "absolute",
    left: space.md,
    bottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  views: { flexDirection: "row", columnGap: space.lg, marginTop: -space.sm },
  mockupRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  alignStart: { alignSelf: "flex-start", paddingHorizontal: 0, marginTop: -space.sm },
  heading: { gap: space.xs },
  swatches: { flexDirection: "row", gap: space.sm },
  specs: { borderTopWidth: StyleSheet.hairlineWidth },
  spec: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  specValue: { flexShrink: 1, textAlign: "right" },
});

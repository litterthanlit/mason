import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TryOnCard } from "@/components/TryOnCard";
import { Body, Button, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";
import { describeError } from "@/lib/errors";
import { MAX_PIECES, SLOT_ORDER, selectionFrom, togglePiece } from "@/lib/fitting";
import { CATEGORY_LABELS, type GarmentCategory } from "@/lib/types";

type Piece = { _id: Id<"wardrobeItems">; name: string; category: GarmentCategory; image: string };

export default function FittingRoomScreen() {
  const colors = useTheme();
  const router = useRouter();
  // `items` arrives from a look or an item page: comma-separated closet ids.
  const params = useLocalSearchParams<{ items?: string }>();

  const items = useQuery(api.wardrobe.list, {});
  const likeness = useQuery(api.fitting.likeness, {});
  const renders = useQuery(api.fitting.list, {});
  const allowance = useQuery(api.fitting.allowance, {});
  const start = useMutation(api.fitting.start);

  const [selected, setSelected] = useState<Piece[]>([]);
  const [seededFrom, setSeededFrom] = useState<string | undefined>();
  const [likenessId, setLikenessId] = useState<Id<"likenessPhotos"> | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const pieces: Piece[] | undefined = items?.map((item) => ({
    _id: item._id,
    name: item.name,
    category: item.category,
    image: item.mockupUrl ?? item.imageUrl,
  }));

  // Seed the rail once per incoming link (state adjusted during render, as in closet/add).
  if (pieces && params.items && params.items !== seededFrom) {
    setSeededFrom(params.items);
    setSelected(selectionFrom(params.items.split(","), pieces));
  }

  // Default to the newest photo; fall back if the chosen one was removed.
  const activeLikeness =
    likeness?.find((p) => p._id === likenessId)?._id ?? likeness?.[likeness.length - 1]?._id ?? null;

  const slots = SLOT_ORDER.map((category) => ({
    category,
    pieces: pieces?.filter((p) => p.category === category) ?? [],
  })).filter((slot) => slot.pieces.length > 0);

  const outOfRenders = allowance?.remaining === 0;

  async function handleTryOn() {
    if (!activeLikeness || selected.length === 0) return;
    setStarting(true);
    setError("");
    try {
      const tryOnId = await start({ likenessId: activeLikeness, itemIds: selected.map((p) => p._id) });
      router.push(`/fitting/${tryOnId}`);
    } catch (err) {
      setError(describeError(err, "Could not start the render."));
    } finally {
      setStarting(false);
    }
  }

  const [latest, ...earlier] = renders ?? [];
  // Pinned once there is something to dress, so the action never sinks below a long rail.
  const showBar = !!pieces?.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Screen headerless contentContainerStyle={showBar ? styles.clearBar : undefined}>
        <Kicker>Fitting room</Kicker>
        <Title style={styles.title}>Try it on.</Title>
        <Body style={styles.lede}>
          Your photo, your pieces. A preview for colour and proportion, not a promise of fit.
        </Body>

        {/* ---------------------------------------------------------------- You */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <View style={styles.sectionHead}>
            <Kicker>You</Kicker>
            {likeness && likeness.length > 0 ? (
              <Link href="/fitting/likeness" asChild>
                <Pressable hitSlop={12} accessibilityRole="link" accessibilityLabel="Manage photos of you">
                  <Kicker style={{ color: colors.text }}>Manage</Kicker>
                </Pressable>
              </Link>
            ) : null}
          </View>

          {likeness === undefined ? (
            <ActivityIndicator color={colors.textMuted} accessibilityLabel="Loading photos" />
          ) : likeness.length === 0 ? (
            <>
              <Body>One full-length photo: head to feet, plain wall, fitted clothes. Only you can see it.</Body>
              <Link href="/fitting/likeness" asChild>
                <Button label="Add a photo of you" />
              </Link>
            </>
          ) : (
            <View style={styles.likenessRow} accessibilityRole="radiogroup" accessibilityLabel="Photo to dress">
              {likeness.map((photo, i) => {
                const on = photo._id === activeLikeness;
                return (
                  <Pressable
                    key={photo._id}
                    onPress={() => setLikenessId(photo._id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Photo ${i + 1} of you`}
                    style={[styles.likeness, { borderColor: on ? colors.text : "transparent" }]}
                  >
                    {photo.url ? (
                      <Image source={{ uri: photo.url }} style={styles.fill} contentFit="cover" transition={150} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ------------------------------------------------------------- Pieces */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <View style={styles.sectionHead}>
            <Kicker accessibilityLiveRegion="polite">
              {selected.length === 0 ? "Pieces" : `${selected.length} of ${MAX_PIECES} pieces`}
            </Kicker>
            {selected.length > 0 ? (
              <Pressable hitSlop={12} onPress={() => setSelected([])} accessibilityRole="button" accessibilityLabel="Clear pieces">
                <Kicker style={{ color: colors.text }}>Clear</Kicker>
              </Pressable>
            ) : null}
          </View>

          {pieces === undefined ? (
            <ActivityIndicator color={colors.textMuted} accessibilityLabel="Loading closet" />
          ) : pieces.length === 0 ? (
            <>
              <Body>The rail is empty. Photograph what you own first.</Body>
              <Link href="/closet/add" asChild>
                <Button label="Add a garment" variant="outline" />
              </Link>
            </>
          ) : (
            slots.map((slot) => (
              <View key={slot.category} style={styles.slot}>
                <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{CATEGORY_LABELS[slot.category]}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                  style={styles.railBleed}
                >
                  {slot.pieces.map((piece) => {
                    const on = selected.some((p) => p._id === piece._id);
                    return (
                      <Pressable
                        key={piece._id}
                        onPress={() => setSelected((prev) => togglePiece(prev, piece))}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${piece.name}, ${CATEGORY_LABELS[piece.category]}`}
                        style={styles.tile}
                      >
                        <View
                          style={[
                            styles.tileFrame,
                            { backgroundColor: colors.backgroundSecondary, borderColor: on ? colors.text : "transparent" },
                          ]}
                        >
                          <Image
                            source={{ uri: piece.image }}
                            style={styles.fill}
                            contentFit="cover"
                            transition={150}
                            recyclingKey={piece.image}
                          />
                          {on ? (
                            <View style={[styles.check, { backgroundColor: colors.tint }]}>
                              <Text style={[styles.checkMark, { color: colors.onTint }]}>✓</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[styles.tileName, { color: on ? colors.text : colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {piece.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>

        {/* ------------------------------------------------------------ Renders */}
        {latest ? (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Kicker>Renders</Kicker>
            <TryOnCard tryOn={latest} size="hero" onPress={() => router.push(`/fitting/${latest._id}`)} />
            {earlier.length > 0 ? (
              <View style={styles.grid}>
                {earlier.map((render) => (
                  <TryOnCard key={render._id} tryOn={render} onPress={() => router.push(`/fitting/${render._id}`)} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Screen>

      {showBar ? (
        <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button
            label={selected.length > 1 ? `Try on ${selected.length} pieces` : "Try it on"}
            onPress={handleTryOn}
            loading={starting}
            disabled={!activeLikeness || selected.length === 0 || outOfRenders}
          />
          {allowance ? (
            <Body tone="muted" style={styles.meter} accessibilityLiveRegion="polite">
              {likeness?.length === 0
                ? "Add a photo of you to start."
                : outOfRenders
                ? "No renders left for now. They refill through the day."
                : selected.length === 0
                  ? `Pick pieces from the rail. ${allowance.remaining} of ${allowance.capacity} renders left.`
                  : `${allowance.remaining} of ${allowance.capacity} renders left. Repeats are free.`}
            </Body>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const TILE = 96;

const styles = StyleSheet.create({
  root: { flex: 1 },
  clearBar: { paddingBottom: 170 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: { marginTop: -space.sm },
  lede: { marginBottom: space.sm },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.xl, gap: space.md, marginTop: space.sm },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  likenessRow: { flexDirection: "row", gap: space.sm },
  likeness: { width: 72, aspectRatio: 3 / 4, borderWidth: 1.5, padding: 2 },
  fill: { width: "100%", height: "100%" },
  slot: { gap: space.sm },
  slotLabel: { fontFamily: Fonts.serifItalic, fontSize: 20, lineHeight: 24 },
  railBleed: { marginHorizontal: -space.xl },
  rail: { paddingHorizontal: space.xl, gap: space.sm },
  tile: { width: TILE },
  tileFrame: { width: TILE, aspectRatio: 3 / 4, borderWidth: 1.5 },
  check: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 11, lineHeight: 13 },
  tileName: { fontFamily: Fonts.sans, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 6 },
  meter: { textAlign: "center", fontSize: 12, lineHeight: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.xl },
});

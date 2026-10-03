import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Body, Button, ErrorText, Kicker, Screen, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";
import { describeError } from "@/lib/errors";
import { CATEGORY_LABELS } from "@/lib/types";

export default function TryOnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const router = useRouter();

  const tryOn = useQuery(api.fitting.get, { tryOnId: id as Id<"tryOns"> });
  const start = useMutation(api.fitting.start);
  const remove = useMutation(api.fitting.remove);

  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");

  if (tryOn === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} accessibilityLabel="Loading render" />
      </View>
    );
  }
  if (tryOn === null) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Body>This render is gone.</Body>
      </View>
    );
  }

  const render = tryOn;
  const pending = render.status === "queued" || render.status === "running";

  async function handleRetry() {
    setRetrying(true);
    setError("");
    try {
      await start({ likenessId: render.likenessId, itemIds: render.pieces.map((p) => p.itemId) });
    } catch (err) {
      setError(describeError(err, "Could not retry."));
    } finally {
      setRetrying(false);
    }
  }

  function handleRemove() {
    Alert.alert("Delete render", "The pieces stay in your closet.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await remove({ tryOnId: render._id });
            router.back();
          } catch (err) {
            setError(describeError(err, "Could not delete this render."));
          }
        },
      },
    ]);
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={[styles.frame, { backgroundColor: colors.backgroundSecondary }]}>
        {render.imageUrl ? (
          <Image
            source={{ uri: render.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
            accessibilityLabel={`You wearing ${render.pieces.map((p) => p.name).join(", ")}`}
          />
        ) : (
          <View style={styles.placeholder} accessibilityLiveRegion="polite">
            {pending ? (
              <>
                <ActivityIndicator color={colors.textMuted} size="large" />
                <Text style={[styles.waiting, { color: colors.text }]}>Dressing you.</Text>
                <Body tone="muted" style={styles.center}>
                  Usually under half a minute. You can leave; it keeps going.
                </Body>
              </>
            ) : (
              <>
                <ErrorText style={styles.center}>{render.error ?? "The render failed."}</ErrorText>
                <Button label="Try again" variant="outline" onPress={handleRetry} loading={retrying} />
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Kicker>Wearing</Kicker>
        <View style={styles.strip}>
          {render.pieces.map((piece) => (
            <Link key={piece.itemId} href={`/closet/${piece.itemId}`} asChild>
              <Pressable style={styles.piece} accessibilityRole="link" accessibilityLabel={piece.name}>
                <Image
                  source={{ uri: piece.imageUrl }}
                  style={[styles.pieceImage, { backgroundColor: colors.backgroundSecondary }]}
                  contentFit="cover"
                  transition={150}
                />
                <Text style={[styles.pieceCategory, { color: colors.textMuted }]}>{CATEGORY_LABELS[piece.category]}</Text>
                <Text style={[styles.pieceName, { color: colors.text }]} numberOfLines={1}>
                  {piece.name}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <Body tone="muted">
          A preview for colour, proportion and how pieces sit together. Fabric, size and drape are the model&apos;s
          best guess.
        </Body>

        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button label="Delete render" variant="danger" onPress={handleRemove} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  content: { paddingHorizontal: 0, paddingTop: 0 },
  frame: { width: "100%", aspectRatio: 3 / 4 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xxl },
  waiting: { fontFamily: Fonts.serifItalic, fontSize: 28, lineHeight: 32 },
  center: { textAlign: "center" },
  body: { paddingHorizontal: space.xl, gap: space.lg },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, rowGap: space.lg },
  piece: { width: 84 },
  pieceImage: { width: "100%", aspectRatio: 3 / 4 },
  pieceCategory: { fontFamily: Fonts.sans, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
  pieceName: { fontFamily: Fonts.sans, fontSize: 12 },
});

import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CameraCapture } from "@/components/CameraCapture";
import { Body, Button, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { describeError } from "@/lib/errors";
import { uploadImageToConvex } from "@/lib/upload";

const MAX_PHOTOS = 3;

const TIPS = [
  "Full length, head to feet, phone at chest height.",
  "Plain wall, even daylight, no one else in frame.",
  "Fitted clothes and arms a little away from the body, so the cut shows.",
];

export default function LikenessScreen() {
  const colors = useTheme();
  const router = useRouter();
  const photos = useQuery(api.fitting.likeness, {});
  const generateUploadUrl = useMutation(api.recognition.generateUploadUrl);
  const addLikeness = useMutation(api.fitting.addLikeness);
  const removeLikeness = useMutation(api.fitting.removeLikeness);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleCapture(uri: string) {
    setUploading(true);
    setError("");
    try {
      const storageId = await uploadImageToConvex(() => generateUploadUrl(), uri);
      await addLikeness({ storageId });
    } catch (err) {
      setError(describeError(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(likenessId: Id<"likenessPhotos">, index: number) {
    Alert.alert(`Remove photo ${index + 1}?`, "Every render made from it is deleted too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeLikeness({ likenessId });
          } catch (err) {
            setError(describeError(err, "Could not remove this photo."));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Kicker>Fitting room</Kicker>
      <Title size="md">The model is you.</Title>
      <Body>Up to {MAX_PHOTOS} photos. The fitting room dresses one at a time and keeps your face, build and pose.</Body>

      <View style={[styles.tips, { borderColor: colors.border }]}>
        {TIPS.map((tip, i) => (
          <View key={tip} style={styles.tip}>
            <Text style={[styles.tipIndex, { color: colors.textMuted }]}>{String(i + 1).padStart(2, "0")}</Text>
            <Body tone="primary" style={styles.flex}>
              {tip}
            </Body>
          </View>
        ))}
      </View>

      {photos === undefined ? (
        <ActivityIndicator color={colors.tint} accessibilityLabel="Loading photos" />
      ) : photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo, i) => (
            <View key={photo._id} style={styles.thumbWrap}>
              {photo.url ? (
                <Image
                  source={{ uri: photo.url }}
                  style={[styles.thumb, { backgroundColor: colors.backgroundSecondary }]}
                  contentFit="cover"
                  accessibilityLabel={`Photo ${i + 1} of you`}
                />
              ) : null}
              <Pressable
                onPress={() => handleRemove(photo._id, i)}
                style={[styles.remove, { backgroundColor: colors.background }]}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${i + 1}`}
              >
                <Text style={[styles.removeText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {uploading ? (
        <ActivityIndicator color={colors.tint} accessibilityLabel="Uploading photo" />
      ) : photos && photos.length < MAX_PHOTOS ? (
        <CameraCapture onCapture={handleCapture} label={`${photos.length} of ${MAX_PHOTOS}`} />
      ) : photos ? (
        <Body tone="muted">That is the maximum. Remove one to swap it.</Body>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Body tone="muted">
        Only you can see these. A photo is sent to the image model only when you render, and removing it deletes the
        renders made from it.
      </Body>
      <Button label="Done" variant={photos?.length ? "primary" : "outline"} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tips: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: space.md, gap: space.md },
  tip: { flexDirection: "row", gap: space.md, alignItems: "baseline" },
  tipIndex: { fontSize: 11, letterSpacing: 1.6, width: 22 },
  flex: { flex: 1 },
  grid: { flexDirection: "row", gap: space.sm },
  thumbWrap: { width: "31%" },
  thumb: { width: "100%", aspectRatio: 3 / 4 },
  remove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { fontSize: 18, lineHeight: 20 },
});

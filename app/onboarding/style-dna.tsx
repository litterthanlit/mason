import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AuthGate } from "@/components/AuthGate";
import { CameraCapture } from "@/components/CameraCapture";
import { Body, Button, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";
import { describeError } from "@/lib/errors";
import { uploadImageToConvex } from "@/lib/upload";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

// Sign-up lands here directly, outside (tabs), so it needs its own gate.
export default function StyleDnaRoute() {
  return (
    <AuthGate>
      <StyleDnaScreen />
    </AuthGate>
  );
}

function StyleDnaScreen() {
  const colors = useTheme();
  const router = useRouter();

  const generateUploadUrl = useMutation(api.recognition.generateUploadUrl);
  const startExtraction = useMutation(api.styleProfile.startExtraction);
  const profile = useQuery(api.styleProfile.get);

  const [photos, setPhotos] = useState<{ uri: string; storageId: Id<"_storage"> }[]>([]);
  const [replacing, setReplacing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  async function handleAddPhoto(uri: string) {
    setUploading(true);
    setError("");
    try {
      const storageId = await uploadImageToConvex(() => generateUploadUrl(), uri);
      setPhotos((prev) => [...prev, { uri, storageId }]);
    } catch (err) {
      setError(describeError(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract() {
    setExtracting(true);
    setError("");
    try {
      await startExtraction({ storageIds: photos.map((p) => p.storageId) });
      // Home shows progress while the references are read.
      router.replace("/(tabs)");
    } catch (err) {
      setError(describeError(err, "Could not start the analysis."));
      setExtracting(false);
    }
  }

  if (profile === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} accessibilityLabel="Loading" />
      </View>
    );
  }

  if (profile && !replacing) {
    return (
      <Screen>
        <Kicker>Style DNA</Kicker>
        <Text style={[styles.summary, { color: colors.text }]}>{profile.summary}</Text>
        <Body>{profile.aesthetics.join(" · ")}</Body>
        {profile.avoid.length > 0 ? <Body tone="muted">Avoids {profile.avoid.join(", ")}.</Body> : null}
        <Button label="Done" onPress={() => router.back()} />
        <Button label="Replace with new references" variant="ghost" onPress={() => setReplacing(true)} />
      </Screen>
    );
  }

  const canAdd = photos.length < MAX_PHOTOS;

  return (
    <Screen>
      <Kicker>Style DNA</Kicker>
      <Title size="md">Show the stylist your eye.</Title>
      <Body>
        {MIN_PHOTOS} to {MAX_PHOTOS} photos of clothes you love: outfits you have worn, saved looks, a
        runway you keep returning to.
      </Body>

      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo, i) => (
            <View key={photo.storageId} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={`Reference ${i + 1}`} />
              <Pressable
                onPress={() => setPhotos((prev) => prev.filter((p) => p.storageId !== photo.storageId))}
                style={[styles.remove, { backgroundColor: colors.background }]}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove reference ${i + 1}`}
              >
                <Text style={[styles.removeText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {uploading ? (
        <ActivityIndicator color={colors.tint} accessibilityLabel="Uploading photo" />
      ) : canAdd ? (
        <CameraCapture onCapture={handleAddPhoto} label={`${photos.length} of at least ${MIN_PHOTOS}`} />
      ) : (
        <Body tone="muted">That is the maximum. Remove one to swap it.</Body>
      )}

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button
        label="Read my style"
        onPress={handleExtract}
        loading={extracting}
        disabled={photos.length < MIN_PHOTOS || uploading}
      />
      {replacing ? <Button label="Keep my current DNA" variant="ghost" onPress={() => setReplacing(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  summary: { fontFamily: Fonts.serifItalic, fontSize: 24, lineHeight: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
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

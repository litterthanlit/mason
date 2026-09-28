import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "@/convex/_generated/api";
import { describeError } from "@/lib/errors";
import type { Id } from "@/convex/_generated/dataModel";
import { AuthGate } from "@/components/AuthGate";
import { CameraCapture } from "@/components/CameraCapture";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { uploadImageToConvex } from "@/lib/upload";

const MIN_PHOTOS = 3;

// Sign-up lands here directly, outside (tabs), so it needs its own gate.
export default function StyleDnaRoute() {
  return (
    <AuthGate>
      <StyleDnaScreen />
    </AuthGate>
  );
}

function StyleDnaScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const generateUploadUrl = useMutation(api.recognition.generateUploadUrl);
  const startExtraction = useMutation(api.styleProfile.startExtraction);
  const profile = useQuery(api.styleProfile.get);

  const [photos, setPhotos] = useState<{ uri: string; storageId?: Id<"_storage"> }[]>([]);
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
    const storageIds = photos.map((p) => p.storageId).filter(Boolean) as Id<"_storage">[];
    if (storageIds.length < MIN_PHOTOS) {
      setError(`Add at least ${MIN_PHOTOS} inspiration photos`);
      return;
    }

    setExtracting(true);
    setError("");
    try {
      await startExtraction({ storageIds });
      router.replace("/(tabs)");
    } catch (err) {
      setError(describeError(err, "Extraction failed"));
    } finally {
      setExtracting(false);
    }
  }

  if (profile) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Your Style DNA</Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{profile.summary}</Text>
        <View style={styles.tags}>
          {profile.aesthetics.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={{ color: colors.text }}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable style={[styles.button, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Text style={[styles.buttonText, { color: colors.onTint }]}>Done</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Build Your Style DNA</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Upload {MIN_PHOTOS}+ photos of looks you love — outfits, Pinterest saves, or your own style.
      </Text>

      <View style={styles.photoGrid}>
        {photos.map((photo, i) => (
          <Image key={i} source={{ uri: photo.uri }} style={styles.thumbnail} />
        ))}
      </View>

      {uploading ? (
        <ActivityIndicator color={colors.tint} />
      ) : (
        <CameraCapture onCapture={handleAddPhoto} label={`${photos.length} photos added`} />
      )}

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      {photos.length >= MIN_PHOTOS ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.tint, opacity: extracting ? 0.6 : 1 }]}
          onPress={handleExtract}
          disabled={extracting}
        >
          <Text style={[styles.buttonText, { color: colors.onTint }]}>{extracting ? "Analyzing..." : "Analyze My Style"}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 15, lineHeight: 22 },
  summary: { fontSize: 15, lineHeight: 22 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbnail: { width: 80, height: 100, borderRadius: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  error: { textAlign: "center" },
});

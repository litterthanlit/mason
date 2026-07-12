import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CameraCapture } from "@/components/CameraCapture";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { uploadImageToConvex } from "@/lib/upload";
import { CATEGORY_LABELS, GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/types";

type Step = "capture" | "processing" | "review";

export default function AddItemScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const generateUploadUrl = useMutation(api.recognition.generateUploadUrl);
  const startRecognition = useMutation(api.recognition.startRecognition);
  const confirmGarment = useMutation(api.recognition.confirmGarment);

  const [step, setStep] = useState<Step>("capture");
  const [jobId, setJobId] = useState<Id<"recognitionJobs"> | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("top");
  const [subcategory, setSubcategory] = useState("");
  const [colorsList, setColorsList] = useState<string[]>([]);
  const [pattern, setPattern] = useState("solid");
  const [fit, setFit] = useState("regular");
  const [season, setSeason] = useState<string[]>(["all-season"]);
  const [occasions, setOccasions] = useState<string[]>(["casual"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const job = useQuery(api.recognition.getJob, jobId ? { jobId } : "skip");

  useEffect(() => {
    if (step !== "processing" || !job) return;

    if (job.status === "complete" && job.result) {
      setName(job.result.subcategory);
      setCategory(job.result.category);
      setSubcategory(job.result.subcategory);
      setColorsList(job.result.colors);
      setPattern(job.result.pattern);
      setFit(job.result.fit);
      setSeason(job.result.season);
      setOccasions(job.result.occasions);
      setStep("review");
    }

    if (job.status === "failed") {
      setError(job.error ?? "Recognition failed");
      setStep("capture");
    }
  }, [step, job]);

  async function handleCapture(uri: string) {
    setPreviewUri(uri);
    setStep("processing");
    setError("");

    try {
      const storageId = await uploadImageToConvex(() => generateUploadUrl(), uri);
      const newJobId = await startRecognition({ storageId });
      setJobId(newJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("capture");
    }
  }

  async function handleSave() {
    if (!jobId) return;
    setSaving(true);
    try {
      await confirmGarment({
        jobId,
        name: name || subcategory,
        category,
        subcategory,
        colors: colorsList,
        pattern,
        fit,
        season,
        occasions,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (step === "capture") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CameraCapture onCapture={handleCapture} label="Photograph on a plain background for best results" />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      </View>
    );
  }

  if (step === "processing") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}
        <ActivityIndicator color={colors.tint} size="large" style={{ marginTop: 24 }} />
        <Text style={[styles.processingText, { color: colors.textSecondary }]}>
          {job?.currentStep ?? "Analyzing garment..."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.review}>
      {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
      <View style={styles.chips}>
        {GARMENT_CATEGORIES.map((cat) => (
          <Pressable key={cat} onPress={() => setCategory(cat)}>
            <Text
              style={[
                styles.chip,
                {
                  backgroundColor: category === cat ? colors.tint : colors.backgroundSecondary,
                  color: category === cat ? "#FFFFFF" : colors.text,
                },
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Subcategory</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
        value={subcategory}
        onChangeText={setSubcategory}
      />

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <Pressable
        style={[styles.saveButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save to Closet"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 12 },
  processingText: { marginTop: 16, fontSize: 16 },
  review: { padding: 20, gap: 12 },
  label: { fontSize: 13, fontWeight: "500", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 13,
    overflow: "hidden",
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  error: { textAlign: "center", marginTop: 12 },
});

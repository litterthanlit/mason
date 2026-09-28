import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CameraCapture } from "@/components/CameraCapture";
import { GarmentForm, type GarmentDraft } from "@/components/GarmentForm";
import { Body, Button, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { describeError } from "@/lib/errors";
import { uploadImageToConvex } from "@/lib/upload";

type Step = "capture" | "processing" | "review";

const EMPTY: GarmentDraft = {
  name: "",
  category: "top",
  subcategory: "",
  colors: [],
  pattern: "solid",
  fit: "regular",
  season: [],
  occasions: [],
};

export default function AddItemScreen() {
  const colors = useTheme();
  const router = useRouter();

  const generateUploadUrl = useMutation(api.recognition.generateUploadUrl);
  const startRecognition = useMutation(api.recognition.startRecognition);
  const confirmGarment = useMutation(api.recognition.confirmGarment);

  const [step, setStep] = useState<Step>("capture");
  const [jobId, setJobId] = useState<Id<"recognitionJobs"> | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<GarmentDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const job = useQuery(api.recognition.getJob, jobId ? { jobId } : "skip");

  useEffect(() => {
    if (step !== "processing" || !job) return;

    if (job.status === "complete" && job.result) {
      const { confidence: _confidence, ...attributes } = job.result;
      setDraft({ ...attributes, name: attributes.subcategory });
      setStep("review");
    }

    if (job.status === "failed") {
      setError(job.error ?? "Could not read this garment. Try another photo.");
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
      setError(describeError(err, "Upload failed"));
      setStep("capture");
    }
  }

  async function handleSave() {
    if (!jobId) return;
    setSaving(true);
    setError("");
    try {
      await confirmGarment({ jobId, ...draft, name: draft.name.trim() || draft.subcategory });
      router.back();
    } catch (err) {
      setError(describeError(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  if (step === "capture") {
    return (
      <Screen>
        <Kicker>Closet</Kicker>
        <Title size="md">Photograph a garment</Title>
        <Body>Flat or hung, on a plain background. The stylist reads cut, cloth and color from this.</Body>
        <CameraCapture onCapture={handleCapture} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Screen>
    );
  }

  if (step === "processing") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" accessibilityLabel="Your photo" />
        ) : null}
        <ActivityIndicator color={colors.tint} size="large" style={{ marginTop: space.xxl }} />
        <Body accessibilityLiveRegion="polite" style={{ marginTop: space.lg }}>
          {job?.currentStep ?? "Reading the garment"}
        </Body>
      </View>
    );
  }

  return (
    <Screen>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" accessibilityLabel="Your photo" />
      ) : null}
      <Body>Check what the stylist read. Anything wrong here carries into every look.</Body>
      <GarmentForm value={draft} onChange={setDraft} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label="Save to closet" onPress={handleSave} loading={saving} disabled={draft.colors.length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  preview: { width: "100%", aspectRatio: 3 / 4 },
});

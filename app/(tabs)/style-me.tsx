import { useAction } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/convex/_generated/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { OCCASIONS } from "@/lib/types";

export default function StyleMeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const generateOutfits = useAction(api.stylingAgent.generateOutfits);

  const [occasion, setOccasion] = useState("casual");
  const [weather, setWeather] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const text = await generateOutfits({
        occasion,
        weather: weather || undefined,
      });
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate outfits");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Style Me</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Get outfit suggestions from your closet
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Occasion</Text>
      <View style={styles.chips}>
        {OCCASIONS.map((occ) => (
          <Pressable key={occ} onPress={() => setOccasion(occ)}>
            <Text
              style={[
                styles.chip,
                {
                  backgroundColor: occasion === occ ? colors.tint : colors.backgroundSecondary,
                  color: occasion === occ ? "#FFFFFF" : colors.text,
                },
              ]}
            >
              {occ}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Weather (optional)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
        placeholder="e.g. rainy, cold, hot"
        placeholderTextColor={colors.textMuted}
        value={weather}
        onChangeText={setWeather}
      />

      <Pressable
        style={[styles.button, { backgroundColor: colors.tint, opacity: loading ? 0.6 : 1 }]}
        onPress={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Generate Outfits</Text>
        )}
      </Pressable>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      {result ? (
        <View style={[styles.resultCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Suggestions</Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>{result}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 15, marginTop: -4, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "500", marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, fontSize: 13, overflow: "hidden" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  error: { fontSize: 14 },
  resultCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  resultTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  resultBody: { fontSize: 14, lineHeight: 22 },
});

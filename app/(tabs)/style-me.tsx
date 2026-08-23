import { useAction, useQuery } from "convex/react";
import { Link } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import Colors from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { useColorScheme } from "@/components/useColorScheme";
import { LookCard, type Look } from "@/components/LookCard";
import { OCCASIONS } from "@/lib/types";

export default function StyleMeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const items = useQuery(api.wardrobe.list, {});
  const generateOutfits = useAction(api.stylingAgent.generateOutfits);

  const [occasion, setOccasion] = useState("casual");
  const [weather, setWeather] = useState("");
  const [looks, setLooks] = useState<Look[]>([]);
  const [missing, setMissing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emptyCloset = items !== undefined && items.length === 0;

  async function handleCompose() {
    if (emptyCloset || loading) return;
    setLoading(true);
    setError("");
    setMissing(null);
    try {
      const result = await generateOutfits({
        occasion,
        weather: weather.trim() || undefined,
      });
      setLooks(result.looks);
      setMissing(result.missing);
    } catch (err) {
      setLooks([]);
      setError(err instanceof Error ? err.message : "Could not compose looks.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
    >
      <Text style={[styles.kicker, { color: colors.textMuted }]}>Style</Text>
      <Text style={[styles.title, { color: colors.text }]}>Looks</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Two, from the closet. Silhouette first.
      </Text>

      {emptyCloset ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Photograph the closet first.
          </Text>
          <Link href="/closet/add" asChild>
            <Pressable style={[styles.button, { backgroundColor: colors.tint }]}>
              <Text style={[styles.buttonText, { color: colors.onTint }]}>Add a garment</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.occasions}>
            {OCCASIONS.map((occ) => {
              const selected = occasion === occ;
              return (
                <Pressable key={occ} onPress={() => setOccasion(occ)} hitSlop={8}>
                  <Text
                    style={[
                      styles.occasion,
                      { color: selected ? colors.text : colors.textMuted },
                      selected && { borderBottomColor: colors.text },
                    ]}
                  >
                    {occ}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { borderBottomColor: colors.border, color: colors.text }]}
            placeholder="Weather, if it matters"
            placeholderTextColor={colors.textMuted}
            value={weather}
            onChangeText={setWeather}
          />

          <Pressable
            style={[styles.button, { backgroundColor: colors.tint, opacity: loading ? 0.45 : 1 }]}
            onPress={handleCompose}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onTint} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onTint }]}>Compose</Text>
            )}
          </Pressable>
        </>
      )}

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      {looks.map((look) => (
        <LookCard key={look.name} look={look} />
      ))}

      {missing && looks.length === 0 ? (
        <Text style={[styles.missing, { color: colors.textSecondary }]}>{missing}</Text>
      ) : null}

      {missing && looks.length > 0 ? (
        <Text style={[styles.note, { color: colors.textMuted }]}>{missing}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  kicker: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1,
    marginTop: -8,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  occasions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    rowGap: 12,
  },
  occasion: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  empty: { gap: 20, paddingTop: 12 },
  emptyText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    lineHeight: 28,
  },
  error: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  missing: {
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    lineHeight: 30,
    marginTop: 12,
  },
  note: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
});

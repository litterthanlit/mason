import { useAction, useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { LookCard } from "@/components/LookCard";
import { Body, Button, Chip, ErrorText, Field, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";
import { describeError } from "@/lib/errors";
import { OCCASIONS } from "@/lib/types";

export default function StyleMeScreen() {
  const colors = useTheme();
  const items = useQuery(api.wardrobe.list, {});
  // Composed looks are saved as outfits, so the list survives leaving the tab.
  const looks = useQuery(api.outfits.listLooks, {});
  const generateOutfits = useAction(api.stylingAgent.generateOutfits);
  const removeOutfit = useMutation(api.outfits.remove);

  const [occasion, setOccasion] = useState<string>("casual");
  const [weather, setWeather] = useState("");
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
      const result = await generateOutfits({ occasion, weather: weather.trim() || undefined });
      setMissing(result.missing);
    } catch (err) {
      setError(describeError(err, "Could not compose looks."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen headerless>
      <Kicker>Style</Kicker>
      <Title style={styles.title}>Looks</Title>
      <Body style={styles.subtitle}>Two, from the closet. Silhouette first.</Body>

      {emptyCloset ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Photograph the closet first.</Text>
          <Link href="/closet/add" asChild>
            <Button label="Add a garment" />
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.occasions} accessibilityRole="radiogroup" accessibilityLabel="Occasion">
            {OCCASIONS.map((occ) => (
              <Chip key={occ} label={occ} selected={occasion === occ} onPress={() => setOccasion(occ)} />
            ))}
          </View>

          <Field
            label="Weather"
            placeholder="If it matters: cold rain, 30°, humid"
            value={weather}
            onChangeText={setWeather}
            returnKeyType="done"
          />

          <Button label="Compose" onPress={handleCompose} loading={loading} />
        </>
      )}

      {error ? <ErrorText>{error}</ErrorText> : null}

      {missing ? (
        <Text accessibilityLiveRegion="polite" style={[styles.missing, { color: colors.textSecondary }]}>
          {missing}
        </Text>
      ) : null}

      {looks?.map((look) => (
        <LookCard key={look.outfitId} look={look} onRemove={() => void removeOutfit({ outfitId: look.outfitId })} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: -space.sm },
  subtitle: { marginBottom: space.sm },
  occasions: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg },
  empty: { gap: space.xl, paddingTop: space.md },
  emptyText: { fontFamily: Fonts.serifItalic, fontSize: 22, lineHeight: 28 },
  missing: { fontFamily: Fonts.serifItalic, fontSize: 22, lineHeight: 30, marginTop: space.md },
});

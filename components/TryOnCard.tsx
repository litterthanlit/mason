import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Kicker, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";

export type TryOnView = {
  _id: string;
  status: "queued" | "running" | "complete" | "failed";
  error?: string;
  imageUrl: string | null;
  pieces: { itemId: string; name: string }[];
};

type Props = {
  tryOn: TryOnView;
  onPress: () => void;
  /** Hero renders fill the width; the rest sit two to a row. */
  size?: "hero" | "grid";
};

export function TryOnCard({ tryOn, onPress, size = "grid" }: Props) {
  const colors = useTheme();
  const caption = tryOn.pieces.map((p) => p.name).join(" · ") || "Pieces removed";
  const pending = tryOn.status === "queued" || tryOn.status === "running";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [size === "grid" ? styles.grid : styles.hero, { opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Render: ${caption}${pending ? ", in progress" : tryOn.status === "failed" ? ", failed" : ""}`}
    >
      <View style={[styles.frame, { backgroundColor: colors.backgroundSecondary }]}>
        {tryOn.imageUrl ? (
          <Image
            source={{ uri: tryOn.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            recyclingKey={tryOn.imageUrl}
          />
        ) : (
          <View style={styles.placeholder}>
            {pending ? <ActivityIndicator color={colors.textMuted} /> : null}
            <Kicker style={tryOn.status === "failed" ? { color: colors.error } : undefined}>
              {pending ? "Dressing you" : "Failed"}
            </Kicker>
          </View>
        )}
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={2}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%" },
  grid: { width: "48%" },
  frame: { width: "100%", aspectRatio: 3 / 4, overflow: "hidden" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  caption: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: space.sm },
});

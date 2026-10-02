import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { useColorScheme } from "@/components/useColorScheme";
import type { Id } from "@/convex/_generated/dataModel";

export type LookPiece = {
  itemId: Id<"wardrobeItems">;
  name: string;
  imageUrl: string;
  category: string;
};

export type Look = {
  outfitId: Id<"outfits">;
  name: string;
  rationale: string;
  occasion?: string;
  pieces: LookPiece[];
};

type Props = {
  look: Look;
  onRemove?: () => void;
};

export function LookCard({ look, onRemove }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          {look.occasion ? (
            <Text style={[styles.occasion, { color: colors.textMuted }]}>{look.occasion}</Text>
          ) : null}
          <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">
            {look.name}
          </Text>
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remove look ${look.name}`}
          >
            <Text style={[styles.remove, { color: colors.textMuted }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.strip}>
        {look.pieces.map((piece) => (
          <Link key={piece.itemId} href={`/closet/${piece.itemId}`} asChild>
            <Pressable style={styles.piece} accessibilityRole="link" accessibilityLabel={piece.name}>
              <Image
                source={{ uri: piece.imageUrl }}
                style={[styles.image, { backgroundColor: colors.backgroundSecondary }]}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
              <Text style={[styles.pieceName, { color: colors.textMuted }]} numberOfLines={1}>
                {piece.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
      {look.rationale ? (
        <Text style={[styles.rationale, { color: colors.textSecondary }]}>{look.rationale}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    paddingTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 },
  titleBlock: { flex: 1, gap: 4 },
  occasion: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: Fonts.serifItalic,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  remove: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    paddingBottom: 6,
  },
  strip: {
    flexDirection: "row",
    gap: 2,
  },
  piece: {
    flex: 1,
    minWidth: 0,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  pieceName: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 8,
  },
  rationale: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
  },
});

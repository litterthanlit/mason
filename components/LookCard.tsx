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
  name: string;
  rationale: string;
  pieces: LookPiece[];
};

export function LookCard({ look }: { look: Look }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <Text style={[styles.name, { color: colors.text }]}>{look.name}</Text>
      <View style={[styles.strip, { borderColor: colors.border }]}>
        {look.pieces.map((piece) => (
          <Link key={piece.itemId} href={`/closet/${piece.itemId}`} asChild>
            <Pressable style={styles.piece}>
              <Image
                source={{ uri: piece.imageUrl }}
                style={[styles.image, { backgroundColor: colors.backgroundSecondary }]}
                contentFit="cover"
              />
              <Text style={[styles.pieceName, { color: colors.textMuted }]} numberOfLines={1}>
                {piece.name}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Text style={[styles.rationale, { color: colors.textSecondary }]}>{look.rationale}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    paddingTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "transparent",
  },
  name: {
    fontFamily: Fonts.serifItalic,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
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

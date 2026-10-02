import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swatch } from "@/components/Swatch";
import { space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";
import { CATEGORY_LABELS, type GarmentCategory } from "@/lib/types";

type Props = {
  name: string;
  imageUrl: string;
  category: GarmentCategory;
  colors: string[];
  onPress?: () => void;
};

export function ItemCard({ name, imageUrl, category, colors: itemColors, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${CATEGORY_LABELS[category]}`}
    >
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { backgroundColor: theme.backgroundSecondary }]}
        contentFit="cover"
        transition={150}
        recyclingKey={imageUrl}
      />
      <View style={styles.content}>
        <Text style={[styles.category, { color: theme.textMuted }]}>{CATEGORY_LABELS[category]}</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.swatches}>
          {itemColors.slice(0, 4).map((color, i) => (
            <Swatch key={`${color}-${i}`} color={color} size={12} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, maxWidth: "50%" },
  image: { width: "100%", aspectRatio: 3 / 4 },
  content: { paddingTop: space.sm, gap: 3 },
  category: { fontFamily: Fonts.sans, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  name: { fontFamily: Fonts.sans, fontSize: 14 },
  swatches: { flexDirection: "row", gap: 4, marginTop: 4 },
});

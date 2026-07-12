import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { CATEGORY_LABELS, type GarmentCategory } from "@/lib/types";

type Props = {
  id: string;
  name: string;
  imageUrl: string;
  category: GarmentCategory;
  colors: string[];
  onPress?: () => void;
};

export function ItemCard({ name, imageUrl, category, colors: itemColors, onPress }: Props) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.borderLight }]}
      onPress={onPress}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.category, { color: theme.textSecondary }]}>
          {CATEGORY_LABELS[category]}
        </Text>
        <View style={styles.swatches}>
          {itemColors.slice(0, 4).map((color) => (
            <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  category: {
    fontSize: 12,
  },
  swatches: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
});

import { Pressable, StyleSheet, View } from "react-native";
import { colorName } from "@/lib/colorName";

type Props = {
  color: string;
  size?: number;
  /** When set, the swatch becomes a button that removes the color. */
  onRemove?: () => void;
};

export function Swatch({ color, size = 28, onRemove }: Props) {
  const dot = (
    <View
      accessible={!onRemove}
      accessibilityLabel={colorName(color)}
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
    />
  );
  if (!onRemove) return dot;
  return (
    <Pressable
      onPress={onRemove}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${colorName(color)}`}
    >
      {dot}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(128,128,128,0.4)" },
});

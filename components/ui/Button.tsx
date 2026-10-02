import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { Fonts } from "@/constants/Fonts";
import { TOUCH, useTheme } from "./theme";

type Props = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = "primary", loading = false, disabled, style, ...props }: Props) {
  const colors = useTheme();
  const inactive = disabled || loading;

  const container =
    variant === "primary"
      ? { backgroundColor: colors.tint }
      : variant === "outline"
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.text }
        : variant === "danger"
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.error }
          : null;
  const textColor =
    variant === "primary" ? colors.onTint : variant === "danger" ? colors.error : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      {...props}
      style={({ pressed }) => [
        styles.base,
        container,
        { opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: TOUCH + 8, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: Fonts.sansMedium, fontSize: 12, letterSpacing: 2.2, textTransform: "uppercase" },
});

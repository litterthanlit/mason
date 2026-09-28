import { StyleSheet, Text, type TextProps } from "react-native";
import { Fonts } from "@/constants/Fonts";
import { useTheme } from "./theme";

/** Small uppercase label above a title or section. */
export function Kicker({ style, ...props }: TextProps) {
  const colors = useTheme();
  return <Text {...props} style={[styles.kicker, { color: colors.textMuted }, style]} />;
}

/** Serif display title. `size="lg"` for screen titles, `"md"` for sections. */
export function Title({ style, size = "lg", ...props }: TextProps & { size?: "lg" | "md" }) {
  const colors = useTheme();
  return (
    <Text
      accessibilityRole="header"
      {...props}
      style={[size === "lg" ? styles.titleLg : styles.titleMd, { color: colors.text }, style]}
    />
  );
}

export function Body({ style, tone = "secondary", ...props }: TextProps & { tone?: "primary" | "secondary" | "muted" }) {
  const colors = useTheme();
  const color = tone === "primary" ? colors.text : tone === "muted" ? colors.textMuted : colors.textSecondary;
  return <Text {...props} style={[styles.body, { color }, style]} />;
}

/** Inline error; announced by screen readers when it appears. */
export function ErrorText({ style, ...props }: TextProps) {
  const colors = useTheme();
  return <Text accessibilityLiveRegion="polite" {...props} style={[styles.body, { color: colors.error }, style]} />;
}

const styles = StyleSheet.create({
  kicker: { fontFamily: Fonts.sans, fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase" },
  titleLg: { fontFamily: Fonts.serif, fontSize: 48, lineHeight: 50, letterSpacing: -1 },
  titleMd: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
});

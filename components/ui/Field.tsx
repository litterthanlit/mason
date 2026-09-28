import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Fonts } from "@/constants/Fonts";
import { Kicker } from "./Typography";
import { useTheme } from "./theme";

type Props = TextInputProps & { label: string };

/** Labeled hairline text input. The label doubles as the accessibility label. */
export function Field({ label, style, ...props }: Props) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <Kicker>{label}</Kicker>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

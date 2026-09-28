import { Pressable, StyleSheet, Text } from "react-native";
import { Fonts } from "@/constants/Fonts";
import { TOUCH, useTheme } from "./theme";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** "radio" for single choice, "checkbox" for multi-select. */
  role?: "radio" | "checkbox";
};

/** Underlined text toggle, matching the occasion picker on Looks. */
export function Chip({ label, selected, onPress, role = "radio" }: Props) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      style={styles.hit}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? colors.text : colors.textMuted, borderBottomColor: selected ? colors.text : "transparent" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: TOUCH, justifyContent: "center" },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
});

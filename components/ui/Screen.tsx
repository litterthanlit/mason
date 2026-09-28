import type { ReactNode } from "react";
import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, useTheme } from "./theme";

type Props = ScrollViewProps & {
  children: ReactNode;
  /** Pad for the status bar when the screen has no navigation header. */
  headerless?: boolean;
};

export function Screen({ children, headerless = false, contentContainerStyle, ...props }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerless ? insets.top + space.xl : space.xl },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingBottom: 48, gap: space.lg },
});

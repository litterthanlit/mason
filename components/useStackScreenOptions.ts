import { useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";

/** Header styling shared by every stack, matching the tab headers. */
export function useStackScreenOptions() {
  const colors = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: Fonts.serif, fontSize: 20, fontWeight: "400" as const },
    contentStyle: { backgroundColor: colors.background },
  };
}

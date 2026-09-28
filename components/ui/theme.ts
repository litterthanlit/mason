import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export function useTheme() {
  return Colors[useColorScheme()];
}

/** Spacing scale (4pt base). Screens use these instead of one-off numbers. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** Minimum touch target (Apple HIG / WCAG 2.5.8). */
export const TOUCH = 44;

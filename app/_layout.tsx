import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { ConvexClerkProvider } from "@/components/ConvexClerkProvider";
import { useStackScreenOptions } from "@/components/useStackScreenOptions";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    InstrumentSerif: require("../assets/fonts/InstrumentSerif-Regular.ttf"),
    InstrumentSerifItalic: require("../assets/fonts/InstrumentSerif-Italic.ttf"),
    IBMPlexSans: require("../assets/fonts/IBMPlexSans-Regular.ttf"),
    IBMPlexSansMedium: require("../assets/fonts/IBMPlexSans-Medium.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ConvexClerkProvider>
      <RootStack />
    </ConvexClerkProvider>
  );
}

function RootStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/style-dna" options={{ title: "Style DNA", presentation: "modal" }} />
    </Stack>
  );
}

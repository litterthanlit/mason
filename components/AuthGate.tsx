import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { describeError } from "@/lib/errors";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

/**
 * Children only mount once the Convex `users` row exists. Every authed query
 * throws "User not found" before that, so rendering early crashes first launch.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const upsertUser = useMutation(api.users.upsertFromAuth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  // Keyed by Clerk user so a sign-out/sign-in as someone else waits again.
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userReady = !!userId && syncedFor === userId;

  const syncUser = useCallback(
    (forUser: string) =>
      upsertUser()
        .then(() => setSyncedFor(forUser))
        .catch((err: unknown) => setError(describeError(err, "Could not load your account"))),
    [upsertUser],
  );

  useEffect(() => {
    if (isSignedIn && userId) void syncUser(userId);
  }, [isSignedIn, userId, syncUser]);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isLoaded || !userReady) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: colors.background }}
      >
        {error ? (
          <>
            <Text style={{ color: colors.error }}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                if (userId) void syncUser(userId);
              }}
              hitSlop={8}
            >
              <Text style={{ color: colors.text, textDecorationLine: "underline" }}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.tint} accessibilityLabel="Loading your account" />
        )}
      </View>
    );
  }

  return <>{children}</>;
}

export function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}

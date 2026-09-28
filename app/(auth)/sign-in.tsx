import { isClerkAPIResponseError, useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Clerk requires email verification by default; sign-up is not complete until the code is entered.
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  if (isSignedIn && !pendingVerification) {
    return <Redirect href="/(tabs)" />;
  }

  function describeError(err: unknown) {
    if (isClerkAPIResponseError(err)) {
      return err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Authentication failed";
    }
    return err instanceof Error ? err.message : "Authentication failed";
  }

  async function handleVerify() {
    if (!signInLoaded || !signUpLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding/style-dna");
      } else {
        setError("That code did not finish sign-up. Try again.");
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!signInLoaded || !signUpLoaded) return;
    setLoading(true);
    setError("");

    try {
      if (mode === "signIn") {
        const result = await signIn.create({ identifier: email, password });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.replace("/(tabs)");
        }
      } else {
        const result = await signUp.create({ emailAddress: email, password });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.replace("/onboarding/style-dna");
        } else {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setPendingVerification(true);
        }
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.text }]}>Fashion Agent</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your AI stylist. Recognize clothes, build your closet, get styled.
        </Text>

        <View style={styles.form}>
          {pendingVerification ? (
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
              placeholder="Code from your email"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Verification code"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              value={code}
              onChangeText={setCode}
            />
          ) : (
            <>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                placeholder="Email"
                accessibilityLabel="Email"
                textContentType="emailAddress"
                autoComplete="email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Password"
                textContentType={mode === "signIn" ? "password" : "newPassword"}
                autoComplete={mode === "signIn" ? "password" : "new-password"}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </>
          )}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={pendingVerification ? handleVerify : handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.onTint} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onTint }]}>
                {pendingVerification ? "Verify Email" : mode === "signIn" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          {pendingVerification ? null : (
            <Pressable accessibilityRole="button" onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 32 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  switchText: { textAlign: "center", marginTop: 16, fontSize: 14 },
  error: { fontSize: 14 },
});

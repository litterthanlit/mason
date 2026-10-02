import { isClerkAPIResponseError, useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Body, Button, ErrorText, Field, Kicker, Title, space, useTheme } from "@/components/ui";

export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const colors = useTheme();

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
        <Kicker>Style Me</Kicker>
        <Title size="md">{pendingVerification ? "Check your email." : "Dressed from what you own."}</Title>
        <Body style={styles.subtitle}>
          {pendingVerification
            ? `We sent a code to ${email}.`
            : "Photograph your closet. A stylist with a trained eye composes from it."}
        </Body>

        <View style={styles.form}>
          {pendingVerification ? (
            <Field
              label="Verification code"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              value={code}
              onChangeText={setCode}
            />
          ) : (
            <>
              <Field
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Password"
                secureTextEntry
                textContentType={mode === "signIn" ? "password" : "newPassword"}
                autoComplete={mode === "signIn" ? "password" : "new-password"}
                value={password}
                onChangeText={setPassword}
              />
            </>
          )}

          {error ? <ErrorText>{error}</ErrorText> : null}

          <Button
            label={pendingVerification ? "Verify email" : mode === "signIn" ? "Sign in" : "Create account"}
            onPress={pendingVerification ? handleVerify : handleSubmit}
            loading={loading}
          />

          {pendingVerification ? null : (
            <Button
              variant="ghost"
              label={mode === "signIn" ? "New here? Create an account" : "Have an account? Sign in"}
              onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.sm },
  subtitle: { marginBottom: space.xxl },
  form: { gap: space.lg },
});

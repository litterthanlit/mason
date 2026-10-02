import { Link, Stack } from "expo-router";
import { Body, Button, Screen, Title } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen>
        <Title size="md">Nothing here.</Title>
        <Body>This page does not exist, or it moved.</Body>
        <Link href="/" asChild>
          <Button label="Back to the closet" variant="outline" />
        </Link>
      </Screen>
    </>
  );
}

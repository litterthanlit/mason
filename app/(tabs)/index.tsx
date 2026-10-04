import { useClerk } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { Swatch } from "@/components/Swatch";
import { Body, Button, ErrorText, Kicker, Screen, Title, space, useTheme } from "@/components/ui";
import { Fonts } from "@/constants/Fonts";

export default function HomeScreen() {
  const colors = useTheme();
  const { signOut } = useClerk();
  const user = useQuery(api.users.getMe);
  const items = useQuery(api.wardrobe.list, {});
  const profile = useQuery(api.styleProfile.get);
  const dnaJob = useQuery(api.styleProfile.latestJob);
  const looks = useQuery(api.outfits.listLooks, { limit: 50 });

  const firstName = user?.name?.split(" ")[0];

  return (
    <Screen headerless>
      <Kicker>{firstName ? `For ${firstName}` : "Your closet"}</Kicker>
      <Title size="md">Dressed from what you own.</Title>

      <View style={[styles.stats, { borderColor: colors.border }]}>
        <Stat value={items?.length} label="Pieces" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Stat value={looks?.length} label="Looks" />
      </View>

      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Kicker>Style DNA</Kicker>
        {dnaJob?.status === "running" ? (
          <View style={styles.inline} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.textMuted} />
            <Body>Reading your references. This takes about a minute.</Body>
          </View>
        ) : dnaJob?.status === "failed" && !profile ? (
          <>
            <ErrorText>{dnaJob.error ?? "Could not read those references."}</ErrorText>
            <Link href="/onboarding/style-dna" asChild>
              <Button label="Try again" variant="outline" />
            </Link>
          </>
        ) : profile ? (
          <>
            <Text style={[styles.summary, { color: colors.text }]}>{profile.summary}</Text>
            <Body>{profile.aesthetics.slice(0, 4).join(" · ")}</Body>
            <View style={styles.palette}>
              {profile.palette.map((color, i) => (
                <Swatch key={`${color}-${i}`} color={color} size={22} />
              ))}
            </View>
            {dnaJob?.status === "failed" ? (
              <ErrorText>The last update failed: {dnaJob.error ?? "try again"}</ErrorText>
            ) : null}
            <Link href="/onboarding/style-dna" asChild>
              <Button label="Update references" variant="ghost" style={styles.alignStart} />
            </Link>
          </>
        ) : profile === null ? (
          <>
            <Body>Three or more photos of clothes you love. The stylist reads your eye from them.</Body>
            <Link href="/onboarding/style-dna" asChild>
              <Button label="Build your Style DNA" />
            </Link>
          </>
        ) : null}
      </View>

      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Link href="/closet/add" asChild>
          <Button label="Add a garment" />
        </Link>
        <Link href="/style-me" asChild>
          <Button label="Compose a look" variant="outline" />
        </Link>
        <Link href="/fitting" asChild>
          <Button label="Open the fitting room" variant="outline" />
        </Link>
      </View>

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} style={styles.signOut} />
    </Screen>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  const colors = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value ?? 0} ${label}`}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value ?? "–"}</Text>
      <Kicker>{label}</Kicker>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: space.md,
  },
  stat: { flex: 1, paddingVertical: space.lg, gap: 2 },
  statValue: { fontFamily: Fonts.serif, fontSize: 40, lineHeight: 44 },
  divider: { width: StyleSheet.hairlineWidth, marginRight: space.xl },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.xl, gap: space.md, marginTop: space.md },
  inline: { flexDirection: "row", alignItems: "center", gap: space.md },
  summary: { fontFamily: Fonts.serifItalic, fontSize: 22, lineHeight: 30 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  alignStart: { alignSelf: "flex-start", paddingHorizontal: 0 },
  signOut: { alignSelf: "center", marginTop: space.xl },
});

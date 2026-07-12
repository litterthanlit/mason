import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@/convex/_generated/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const user = useQuery(api.users.getMe);
  const items = useQuery(api.wardrobe.list, {});
  const profile = useQuery(api.styleProfile.get);
  const outfits = useQuery(api.outfits.list);

  const itemCount = items?.length ?? 0;
  const outfitCount = outfits?.length ?? 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.greeting, { color: colors.text }]}>
        {user?.name ? `Hey, ${user.name.split(" ")[0]}` : "Welcome"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your personal AI stylist
      </Text>

      <View style={styles.stats}>
        <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>{itemCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>{outfitCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Outfits</Text>
        </View>
      </View>

      {profile ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your Style DNA</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{profile.summary}</Text>
          <View style={styles.tags}>
            {profile.aesthetics.slice(0, 4).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.backgroundTertiary }]}>
                <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Link href="/onboarding/style-dna" asChild>
          <Pressable style={[styles.card, { backgroundColor: colors.tint }]}>
            <Text style={styles.cardTitleLight}>Discover Your Style DNA</Text>
            <Text style={styles.cardBodyLight}>Upload inspiration photos to build your profile</Text>
          </Pressable>
        </Link>
      )}

      <View style={styles.actions}>
        <Link href="/closet/add" asChild>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.actionButtonText}>Add to Closet</Text>
          </Pressable>
        </Link>
        <Link href="/style-me" asChild>
          <Pressable style={[styles.actionButtonOutline, { borderColor: colors.border }]}>
            <Text style={[styles.actionButtonOutlineText, { color: colors.text }]}>Style Me</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 20 },
  greeting: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 16, marginTop: -12 },
  stats: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "700" },
  statLabel: { fontSize: 14, marginTop: 4 },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  cardBody: { fontSize: 14, lineHeight: 20 },
  cardTitleLight: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  cardBodyLight: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.9)" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: "500" },
  actions: { gap: 12 },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  actionButtonOutline: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  actionButtonOutlineText: { fontSize: 16, fontWeight: "500" },
});

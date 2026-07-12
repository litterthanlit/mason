import { useAction, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/convex/_generated/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

type Message = { role: "user" | "assistant"; content: string };

export default function AgentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const createThread = useMutation(api.styling.createThread);
  const sendMessage = useAction(api.stylingAgent.sendMessage);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    void createThread().then(setThreadId);
  }, [createThread]);

  async function handleSend() {
    if (!threadId || !input.trim() || loading) return;

    const prompt = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const reply = await sendMessage({ threadId, prompt });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your AI Stylist</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Ask what to wear, how to style an item, or get advice based on your closet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.tint }]
                : [styles.assistantBubble, { backgroundColor: colors.backgroundSecondary }],
            ]}
          >
            <Text style={{ color: item.role === "user" ? "#FFFFFF" : colors.text, lineHeight: 20 }}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.tint} style={{ marginTop: 12 }} /> : null}
      />

      <View style={[styles.inputRow, { borderTopColor: colors.borderLight, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          placeholder="Ask your stylist..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.tint, opacity: !input.trim() || loading ? 0.5 : 1 }]}
          onPress={handleSend}
          disabled={!input.trim() || loading || !threadId}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { paddingTop: 60, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "600" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  bubble: { maxWidth: "85%", padding: 14, borderRadius: 16 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sendText: { color: "#FFFFFF", fontWeight: "600" },
});

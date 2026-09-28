import { optimisticallySendMessage, useSmoothText, useUIMessages, type UIMessage } from "@convex-dev/agent/react";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useMutation, useQuery } from "convex/react";
import { Tabs } from "expo-router";
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
import { describeError } from "@/lib/errors";
import Colors from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { useColorScheme } from "@/components/useColorScheme";

export default function AgentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const headerHeight = useHeaderHeight();

  const threadId = useQuery(api.styling.currentThread);
  const createThread = useMutation(api.styling.createThread);
  const sendMessage = useMutation(api.styling.sendChatMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.styling.listThreadMessages),
  );

  const { results: messages, status, loadMore } = useUIMessages(
    api.styling.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 20, stream: true },
  );

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const creating = useRef(false);
  const listRef = useRef<FlatList<UIMessage>>(null);

  // First visit: open a thread. Later visits resume the saved one.
  useEffect(() => {
    if (threadId !== null || creating.current) return;
    creating.current = true;
    createThread()
      .catch((err: unknown) => setError(describeError(err, "Could not open the stylist.")))
      .finally(() => {
        creating.current = false;
      });
  }, [threadId, createThread]);

  const replying = messages.some((m) => m.role === "assistant" && m.status === "streaming");
  const lastIsUser = messages.at(-1)?.role === "user";
  const waiting = replying || lastIsUser;

  async function handleSend() {
    const prompt = input.trim();
    if (!threadId || !prompt || waiting) return;
    setInput("");
    setError("");
    try {
      await sendMessage({ threadId, prompt });
    } catch (err) {
      setInput(prompt);
      setError(describeError(err, "Message not sent."));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Tabs.Screen
        options={{
          headerRight: () =>
            messages.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a new conversation"
                onPress={() => void createThread()}
                hitSlop={12}
                style={styles.headerAction}
              >
                <Text style={[styles.headerActionText, { color: colors.textSecondary }]}>New</Text>
              </Pressable>
            ) : null,
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y < 40 && status === "CanLoadMore") loadMore(20);
        }}
        scrollEventThrottle={200}
        ListEmptyComponent={
          threadId === undefined || status === "LoadingFirstPage" ? (
            <ActivityIndicator color={colors.tint} style={styles.loading} accessibilityLabel="Loading conversation" />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.kicker, { color: colors.textMuted }]}>Stylist</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>What are you dressing for.</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                An occasion, a piece you cannot place, or a look that feels unfinished.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListFooterComponent={
          lastIsUser ? (
            <ActivityIndicator color={colors.textMuted} style={styles.typing} accessibilityLabel="Stylist is replying" />
          ) : null
        }
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
          placeholder="What are you dressing for"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Message the stylist"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.tint, opacity: !input.trim() || waiting ? 0.45 : 1 }]}
          onPress={handleSend}
          disabled={!input.trim() || waiting || !threadId}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !input.trim() || waiting || !threadId }}
        >
          <Text style={[styles.sendText, { color: colors.onTint }]}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isUser = message.role === "user";
  const [text] = useSmoothText(message.text, { startStreaming: message.status === "streaming" });

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.tint }]}>
        <Text style={[styles.userText, { color: colors.onTint }]}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.assistant} accessibilityLiveRegion={message.status === "streaming" ? "polite" : "none"}>
      <Text style={[styles.assistantText, { color: colors.text }]}>{text || " "}</Text>
      {message.status === "failed" ? (
        <Text style={[styles.failed, { color: colors.error }]}>The stylist could not finish this reply.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: 20, gap: 20, flexGrow: 1 },
  loading: { marginTop: 60 },
  empty: { paddingTop: 48, gap: 10 },
  kicker: { fontFamily: Fonts.sans, fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase" },
  emptyTitle: { fontFamily: Fonts.serif, fontSize: 36, lineHeight: 40, letterSpacing: -0.6 },
  emptyBody: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  bubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { alignSelf: "flex-end" },
  userText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21 },
  assistant: { maxWidth: "92%", alignSelf: "flex-start", gap: 6 },
  assistantText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24 },
  failed: { fontFamily: Fonts.sans, fontSize: 13 },
  typing: { alignSelf: "flex-start", marginTop: 4 },
  error: { fontFamily: Fonts.sans, fontSize: 14, paddingHorizontal: 20, paddingBottom: 8 },
  headerAction: { paddingHorizontal: 16 },
  headerActionText: { fontFamily: Fonts.sans, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase" },
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sendButton: { paddingHorizontal: 18, paddingVertical: 12, minHeight: 44, justifyContent: "center" },
  sendText: { fontFamily: Fonts.sansMedium, fontSize: 12, letterSpacing: 2.2, textTransform: "uppercase" },
});

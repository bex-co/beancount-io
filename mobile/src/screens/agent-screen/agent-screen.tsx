import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isToolUIPart } from "ai";

import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerGuard } from "@/components/ledger-guard";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { useAgentChat } from "./use-agent-chat";
import { MessageBubble } from "./message-bubble";
import { messageText } from "./message-text";
import { classifyAgentError, isRetryable } from "./agent-errors";
import { AGENT_PRESET_KEYS } from "./presets";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.white },
    list: { flex: 1 },
    listContent: { paddingVertical: space.sm, flexGrow: 1 },
    presets: {
      paddingHorizontal: space.lg,
      paddingTop: space.sm,
      gap: space.sm,
    },
    presetChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.controlFill,
      borderRadius: 18,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    presetText: {
      fontSize: fontSizes.md,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
    },
    typing: {
      paddingHorizontal: space.lg + space.md,
      paddingVertical: space.sm,
      fontSize: fontSizes.sm,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    notice: {
      marginHorizontal: space.lg,
      marginVertical: space.sm,
      padding: space.md,
      borderRadius: 12,
      backgroundColor: theme.black10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      gap: space.xs,
    },
    noticeTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
    },
    noticeBody: {
      fontSize: fontSizes.md,
      color: theme.black80,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    noticeAction: {
      alignSelf: "flex-start",
      paddingVertical: space.xs,
    },
    noticeActionText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.primary,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingTop: space.sm,
      paddingBottom: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      backgroundColor: theme.white,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      borderRadius: 20,
      paddingHorizontal: space.md,
      paddingTop: space.sm,
      paddingBottom: space.sm,
      backgroundColor: theme.controlFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      color: theme.black,
      fontSize: fontSizes.lg,
      textAlign: LEADING_TEXT_ALIGN,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    sendButtonDisabled: { backgroundColor: theme.black40 },
    headerButton: { paddingHorizontal: space.sm },
  });

type NoticeStyles = ReturnType<typeof getStyles>;

/**
 * The card the screen falls back to when there is no answer to show: waiting on
 * a web approval, out of quota, failed, or finished without saying anything.
 * All four say a sentence and sometimes offer one way forward, so they are one
 * component — four copies drifted apart on padding within a single sitting.
 */
function Notice({
  styles,
  testID,
  title,
  body,
  action,
}: {
  styles: NoticeStyles;
  testID: string;
  title?: string;
  body: string;
  action?: { label: string; testID: string; onPress: () => void };
}) {
  return (
    <View style={styles.notice} testID={testID}>
      {!!title && <Text style={styles.noticeTitle}>{title}</Text>}
      <Text style={styles.noticeBody}>{body}</Text>
      {action && (
        <TouchableOpacity
          style={styles.noticeAction}
          onPress={action.onPress}
          accessibilityRole="button"
          testID={action.testID}
        >
          <Text style={styles.noticeActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AgentScreenImpl() {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  const params = useLocalSearchParams<{ q?: string }>();
  const {
    messages,
    sendMessage,
    isStreaming,
    stop,
    error,
    regenerate,
    startNewChat,
    isReadOnly,
  } = useAgentChat();

  // A `?q=` deep link prefills and never submits. Any app can open this scheme
  // with text it chose, so the send has to stay a human act (ADR002 review).
  const [input, setInput] = useState(() => params.q?.trim() ?? "");

  // A second deep link arriving while this screen is already on the stack
  // updates the params without remounting, so the initializer above never runs
  // again and the new question would be silently dropped. Applying it here
  // keeps the question visible; the ref makes it happen once per distinct link,
  // so it cannot overwrite what the user is typing on an unrelated re-render.
  const appliedQuestionRef = useRef(params.q);
  useEffect(() => {
    if (params.q === appliedQuestionRef.current) return;
    appliedQuestionRef.current = params.q;
    const question = params.q?.trim();
    if (question) setInput(question);
  }, [params.q]);

  const scrollRef = useRef<ScrollView>(null);
  const [followTail, setFollowTail] = useState(true);
  const isAutoScrollingRef = useRef(false);

  const conversationStarted = messages.some((m) => m.role === "user");
  const lastMessage = messages[messages.length - 1];
  // The turn is in flight but nothing has been rendered for it yet — no text,
  // no tool call. That gap is what the typing indicator is for.
  const showTyping = isStreaming && (!lastMessage || !messageText(lastMessage));

  // A turn can finish having done nothing but run tools. The server caps the
  // agent at a fixed number of steps, and a question that sends it exploring —
  // "add a transaction", which made it read ten files — can burn the whole
  // budget before it ever speaks. Without this the screen just falls silent:
  // the activity line, then nothing, forever. Say so, and offer another go.
  const answeredNothing =
    !isStreaming &&
    !error &&
    lastMessage?.role === "assistant" &&
    !messageText(lastMessage) &&
    lastMessage.parts.some(isToolUIPart);

  // The stream stops here and waits: the server asked to run a tool that writes
  // to the ledger. Mobile cannot show the real diff yet, so it never answers
  // the request — it explains and points at the web (ADR002 P2).
  const awaitingApproval = useMemo(
    () =>
      lastMessage?.role === "assistant" &&
      lastMessage.parts.some(
        (part) => isToolUIPart(part) && part.state === "approval-requested",
      ),
    [lastMessage],
  );

  const scrollToEnd = useCallback(() => {
    isAutoScrollingRef.current = true;
    scrollRef.current?.scrollToEnd({ animated: true });
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (followTail) scrollToEnd();
  }, [messages, followTail, scrollToEnd]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setFollowTail(true);
      setInput("");
      void sendMessage({ text: trimmed });
    },
    [isStreaming, sendMessage],
  );

  const errorKind = error ? classifyAgentError(error) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: t("agentTitle"),
          headerRight: () =>
            conversationStarted ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={startNewChat}
                accessibilityRole="button"
                accessibilityLabel={t("agentNewChat")}
                testID="agent-new-chat"
              >
                <Ionicons name="create-outline" size={22} color={theme.nav02} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          onScroll={({ nativeEvent }) => {
            if (isAutoScrollingRef.current) return;
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            const distanceFromEnd =
              contentSize.height - contentOffset.y - layoutMeasurement.height;
            setFollowTail(distanceFromEnd < 24);
          }}
          scrollEventThrottle={16}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {showTyping && (
            <Text style={styles.typing}>{t("agentThinking")}</Text>
          )}

          {isReadOnly && (
            <Notice
              styles={styles}
              testID="agent-read-only-notice"
              title={t("agentReadOnlyTitle")}
              body={t("agentReadOnlyBody")}
            />
          )}

          {awaitingApproval && (
            <Notice
              styles={styles}
              testID="agent-approval-notice"
              title={t("agentApprovalTitle")}
              body={t("agentApprovalBody")}
            />
          )}

          {answeredNothing && !awaitingApproval && (
            <Notice
              styles={styles}
              testID="agent-no-answer-notice"
              body={t("agentNoAnswerBody")}
              action={{
                label: t("agentRetry"),
                testID: "agent-no-answer-retry",
                onPress: () => void regenerate(),
              }}
            />
          )}

          {errorKind === "quota" && (
            <Notice
              styles={styles}
              testID="agent-quota-notice"
              title={t("agentQuotaTitle")}
              body={t("agentQuotaBody")}
            />
          )}

          {errorKind && errorKind !== "quota" && (
            <Notice
              styles={styles}
              testID="agent-error-notice"
              body={t("agentErrorBody")}
              action={
                isRetryable(error)
                  ? {
                      label: t("agentRetry"),
                      testID: "agent-retry",
                      onPress: () => void regenerate(),
                    }
                  : undefined
              }
            />
          )}

          {!conversationStarted && !isStreaming && (
            <View style={styles.presets}>
              {AGENT_PRESET_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.presetChip}
                  onPress={() => submit(t(key))}
                  accessibilityRole="button"
                  testID={`agent-preset-${key}`}
                >
                  <Text style={styles.presetText}>{t(key)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {!awaitingApproval && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t("agentPlaceholder")}
              placeholderTextColor={theme.controlPlaceholder}
              multiline
              editable={!isStreaming}
              onSubmitEditing={() => submit(input)}
              testID="agent-input"
            />
            {isStreaming ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={stop}
                accessibilityRole="button"
                accessibilityLabel={t("agentStop")}
                testID="agent-stop"
              >
                <Ionicons name="square" size={16} color={theme.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !input.trim() && styles.sendButtonDisabled,
                ]}
                onPress={() => submit(input)}
                disabled={!input.trim()}
                accessibilityRole="button"
                accessibilityLabel={t("agentSend")}
                testID="agent-send"
              >
                <Ionicons name="arrow-up" size={20} color={theme.white} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AgentScreen() {
  return (
    <LedgerGuard>
      <AgentScreenImpl />
    </LedgerGuard>
  );
}

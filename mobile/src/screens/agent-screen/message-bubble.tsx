import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { isToolUIPart, type UIMessage } from "ai";
import { useMarkdown } from "react-native-marked";

import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, space } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { stripAgentNotation } from "./agent-notation";
import { messageText } from "./message-text";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    userRow: {
      alignItems: "flex-end",
    },
    assistantRow: {
      alignItems: "flex-start",
    },
    bubble: {
      maxWidth: "88%",
      borderRadius: 16,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    userBubble: {
      backgroundColor: theme.primary,
      borderBottomRightRadius: space.xs,
    },
    assistantBubble: {
      backgroundColor: theme.black10,
      borderBottomLeftRadius: space.xs,
    },
    userText: {
      color: theme.white,
      fontSize: fontSizes.lg,
      lineHeight: 22,
      // Ledger data is Latin even in a right-to-left app, so alignment must
      // come from the layout, not from the string (see m31's finding).
      textAlign: LEADING_TEXT_ALIGN,
    },
    activity: {
      fontSize: fontSizes.sm,
      color: theme.black80,
      fontWeight: fontWeights.medium,
      paddingVertical: space.xxs,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

/**
 * Markdown styles handed to `react-native-marked`.
 *
 * Every colour is a theme token — the library ships its own light/dark palette,
 * which would be a second source of truth sitting next to ours. Blocks carry no
 * top margin and a bottom one, so a single-paragraph answer (the common case)
 * does not open a gap above itself inside the bubble.
 */
const getMarkdownStyles = (theme: ColorTheme) => ({
  text: {
    color: theme.black,
    fontSize: fontSizes.lg,
    lineHeight: 22,
    textAlign: LEADING_TEXT_ALIGN,
  },
  paragraph: {
    paddingTop: 0,
    paddingBottom: space.xs,
  },
  strong: { fontWeight: fontWeights.medium, color: theme.black },
  em: { fontStyle: "italic" as const, color: theme.black },
  link: { color: theme.primary },
  list: { paddingBottom: space.xs },
  li: {
    color: theme.black,
    fontSize: fontSizes.lg,
    lineHeight: 22,
    textAlign: LEADING_TEXT_ALIGN,
  },
  h1: { color: theme.black, fontSize: fontSizes.xl, paddingBottom: space.xs },
  h2: { color: theme.black, fontSize: fontSizes.xl, paddingBottom: space.xs },
  h3: { color: theme.black, fontSize: fontSizes.lg, paddingBottom: space.xs },
  h4: { color: theme.black, fontSize: fontSizes.lg, paddingBottom: space.xs },
  h5: { color: theme.black, fontSize: fontSizes.lg, paddingBottom: space.xs },
  h6: { color: theme.black, fontSize: fontSizes.lg, paddingBottom: space.xs },
  codespan: {
    color: theme.black,
    backgroundColor: theme.black20,
    fontSize: fontSizes.md,
  },
  code: {
    backgroundColor: theme.black20,
    padding: space.sm,
    borderRadius: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: theme.black40,
    paddingLeft: space.sm,
  },
  hr: { borderBottomColor: theme.black40 },
  table: { borderColor: theme.black40 },
  tableRow: { borderColor: theme.black40 },
  tableCell: { borderColor: theme.black40 },
});

/**
 * An agent answer, rendered as markdown.
 *
 * Its own component so the hook is mounted only where there is markdown to
 * read: the user's own turn is echoed verbatim, and calling `useMarkdown` for
 * it would parse a string we have already decided not to format.
 */
function AssistantMarkdown({ text }: { text: string }) {
  const theme = useTheme().colorTheme;
  const markdownStyles = useMemo(() => getMarkdownStyles(theme), [theme]);
  const cleaned = useMemo(() => stripAgentNotation(text), [text]);
  const elements = useMarkdown(cleaned, { styles: markdownStyles });
  return <>{elements}</>;
}

/**
 * Tool calls the message is running or has run. Names come from the server's
 * tool set, so the row shows one translated line rather than the raw names — an
 * untranslated `insertReceiptTransaction` mid-chat reads as a leak, not as
 * progress.
 */
function hasToolActivity(message: UIMessage): boolean {
  return message.parts.some(isToolUIPart);
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const isUser = message.role === "user";
  const text = messageText(message);
  const activity = !isUser && hasToolActivity(message);

  // A turn that is still deciding what to call has neither text nor a tool yet;
  // the typing indicator in the list covers that, so render nothing here.
  if (!text && !activity) return null;

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {activity && <Text style={styles.activity}>{t("agentWorking")}</Text>}
      {!!text && (
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {/* The user's own text is echoed verbatim: they typed it, so
              formatting it would put words on screen they did not write. */}
          {isUser ? (
            <Text style={styles.userText} selectable>
              {text}
            </Text>
          ) : (
            <AssistantMarkdown text={text} />
          )}
        </View>
      )}
    </View>
  );
}

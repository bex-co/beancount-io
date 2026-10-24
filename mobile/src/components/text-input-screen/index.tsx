import { cleanFreeText } from "@/common/clean-free-text";
import { matchSuggestions } from "./match-suggestions";
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  fontSizes,
  fontWeights,
  headerActionMaxFontSizeMultiplier,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { i18n } from "@/translations";
import { ColorTheme } from "@/types/theme-props";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import {
  LEADING_TEXT_ALIGN,
  leadingInputTextAlign,
  letterSpacing,
} from "@/common/rtl";
import { useStackKeyboardOffset } from "@/common/hooks/use-stack-keyboard-offset";

const MAX_SUGGESTIONS = 30;
const SKELETON_ROW_WIDTHS = [176, 128, 200, 144];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      flex: 1,
    },
    inputContainer: {
      marginHorizontal: 16,
      marginTop: 16,
      borderBottomColor: theme.black40,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    input: {
      color: theme.text01,
      fontSize: fontSizes.xl,
      paddingVertical: 8,
      textAlign: leadingInputTextAlign(),
    },
    inputMultiline: {
      flex: 1,
      textAlignVertical: "top",
    },
    multilineBody: {
      flex: 1,
    },
    doneButton: headerActionStyle(theme),
    suggestionsScroll: {
      flex: 1,
      marginTop: 20,
    },
    // Padding on the content, not the ScrollView: padded itself, an iOS
    // ScrollView in right-to-left layout shifted its content toward the
    // trailing edge and cut the caption and card off there (w0/049).
    suggestionsContent: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing(0.8),
      // The rows below mirror; the caption follows them (w0/049).
      textAlign: LEADING_TEXT_ALIGN,
      color: theme.black80,
      marginBottom: 8,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
      marginBottom: 24,
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.white,
    },
    suggestionRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    suggestionRowPressed: {
      backgroundColor: theme.controlSelected,
    },
    suggestionText: {
      flex: 1,
      fontSize: fontSizes.lg,
      lineHeight: 20,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    iconTile: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    // marginVertical fills the same 20px line box as suggestionText, keeping
    // skeleton and loaded rows the same height.
    textTile: {
      height: 14,
      borderRadius: 7,
      marginVertical: 3,
    },
  });

type TextInputScreenProps = {
  /** The initial value for the text input */
  initialValue?: string;
  /** The title to display in the header */
  headerTitle: string;
  /** The placeholder text for the input field */
  placeholder?: string;
  /** Whether to allow multiline input */
  multiline?: boolean;
  /** Callback function when the user saves */
  onSave?: (value: string) => void;
  /** Existing values offered below the input; tapping one saves it directly */
  suggestions?: string[];
  /** Show a skeleton suggestions card while the suggestions query is in flight */
  suggestionsLoading?: boolean;
};

/**
 * A reusable text input screen component.
 * Used for inputting simple text values like payee, narration, etc.
 */
export const TextInputScreen: React.FC<TextInputScreenProps> = ({
  initialValue = "",
  headerTitle,
  placeholder,
  multiline = false,
  onSave,
  suggestions,
  suggestionsLoading,
}) => {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const keyboardVerticalOffset = useStackKeyboardOffset();
  const [value, setValue] = useState<string>(initialValue);

  const matches = useMemo(
    () => matchSuggestions(suggestions, value, MAX_SUGGESTIONS),
    [suggestions, value],
  );

  const showSkeleton = !!suggestionsLoading && matches.length === 0;

  // Trimmed: a trailing space (iOS adds one after a completion) would save a
  // payee that looks identical on screen and is a different string in the file.
  const commit = (selected: string) => {
    onSave?.(cleanFreeText(selected));
    router.back();
  };

  // The suggestions card. Narration's multiline layout (w3/211) rendered only
  // the input, so the ledger's narrations were fetched and never shown
  // (w21/082).
  const suggestionsList =
    matches.length > 0 || showSkeleton ? (
      <ScrollView
        style={styles.suggestionsScroll}
        contentContainerStyle={styles.suggestionsContent}
        keyboardShouldPersistTaps="handled"
        // The last matches scroll above the keyboard instead of staying
        // under it (w21/145). Not in the multiline layout: its
        // KeyboardAvoidingView already shrinks the list by the keyboard, and
        // insetting the content as well left a ~300 pt blank band (w21/319).
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios" && !multiline}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {i18n.t("suggestions").toUpperCase()}
        </Text>
        <View style={styles.card}>
          {showSkeleton &&
            SKELETON_ROW_WIDTHS.map((width, index) => (
              <View
                key={index}
                style={[
                  styles.suggestionRow,
                  index > 0 && styles.suggestionRowDivider,
                ]}
              >
                <LoadingTile style={styles.iconTile} />
                <LoadingTile
                  style={StyleSheet.flatten([styles.textTile, { width }])}
                />
              </View>
            ))}
          {!showSkeleton && (
            <FadeInView>
              {matches.map((suggestion, index) => (
                <Pressable
                  key={suggestion}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    index > 0 && styles.suggestionRowDivider,
                    pressed && styles.suggestionRowPressed,
                  ]}
                  onPress={() => commit(suggestion)}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={theme.black60}
                  />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </FadeInView>
          )}
        </View>
      </ScrollView>
    ) : null;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle,
          headerRight: () => (
            <Pressable
              onPress={() => commit(value)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={i18n.t("save")}
            >
              <Text
                style={styles.doneButton}
                numberOfLines={1}
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
              >
                {i18n.t("save")}
              </Text>
            </Pressable>
          ),
        }}
      />
      {multiline ? (
        <KeyboardAvoidingView
          style={styles.multilineBody}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {/* Input and list share the space above the keyboard, so a long
              draft stays visible while the list narrows. */}
          <View style={[styles.inputContainer, styles.multilineBody]}>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={value}
              placeholder={placeholder ?? i18n.t("pleaseInput")}
              accessibilityLabel={headerTitle}
              placeholderTextColor={theme.controlPlaceholder}
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              autoFocus
              onChangeText={setValue}
              multiline
              scrollEnabled
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          {suggestionsList}
        </KeyboardAvoidingView>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={value}
              placeholder={placeholder ?? i18n.t("pleaseInput")}
              accessibilityLabel={headerTitle}
              placeholderTextColor={theme.controlPlaceholder}
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              autoFocus
              onChangeText={setValue}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          {suggestionsList}
        </>
      )}
    </SafeAreaView>
  );
};

import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import {
  fontSizes,
  fontWeights,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { i18n } from "@/translations";
import { ColorTheme } from "@/types/theme-props";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePageView } from "@/common/hooks/use-page-view";
import { analytics } from "@/common/analytics";
import { Ionicons } from "@expo/vector-icons";
import { LoadingTile } from "@/components/loading-tile";

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
    },
    doneButton: headerActionStyle(theme),
    suggestionsScroll: {
      flex: 1,
      paddingHorizontal: 16,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.8,
      color: theme.black80,
      marginBottom: 8,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.black10,
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
      backgroundColor: theme.black10,
    },
    suggestionText: {
      flex: 1,
      fontSize: fontSizes.lg,
      lineHeight: 20,
      color: theme.text01,
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
  /** The analytics page name (will be prefixed with "page_view_") */
  analyticsPageName: string;
  /** The analytics event name for saving (without "tap_" prefix) */
  analyticsSaveEventName: string;
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
  analyticsPageName,
  analyticsSaveEventName,
  onSave,
  suggestions,
  suggestionsLoading,
}) => {
  usePageView(analyticsPageName);

  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const [value, setValue] = useState<string>(initialValue);

  const query = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!suggestions?.length) {
      return [];
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const suggestion of suggestions) {
      const item = suggestion.trim();
      if (!item || seen.has(item)) {
        continue;
      }
      seen.add(item);
      if (!query || item.toLowerCase().includes(query)) {
        out.push(item);
        if (out.length >= MAX_SUGGESTIONS) {
          break;
        }
      }
    }
    return out;
  }, [suggestions, query]);

  const showSkeleton = !!suggestionsLoading && matches.length === 0;

  const commit = async (selected: string, source: "input" | "suggestion") => {
    onSave?.(selected);
    await analytics.track(`tap_${analyticsSaveEventName}`, {
      value: selected,
      source,
    });
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle,
          headerRight: () => (
            <Pressable onPress={() => commit(value, "input")} hitSlop={10}>
              <Text style={styles.doneButton}>{i18n.t("save")}</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder ?? i18n.t("pleaseInput")}
          placeholderTextColor={theme.black60}
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          autoFocus
          onChangeText={setValue}
          multiline={multiline}
        />
      </View>
      {(matches.length > 0 || showSkeleton) && (
        <ScrollView
          style={styles.suggestionsScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>
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
            {!showSkeleton &&
              matches.map((suggestion, index) => (
                <Pressable
                  key={suggestion}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    index > 0 && styles.suggestionRowDivider,
                    pressed && styles.suggestionRowPressed,
                  ]}
                  onPress={() => commit(suggestion, "suggestion")}
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
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

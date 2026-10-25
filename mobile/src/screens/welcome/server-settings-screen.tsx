import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReactiveVar } from "@apollo/client";
import { useTheme } from "@/common/theme";
import { contentColumn } from "@/common/content-column";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  type ServerConnectionResult,
  type ServerUrlErrorCode,
  defaultRuntimeServerUrl,
  testServerConnection,
  validateServerUrl,
} from "@/common/server-url";
import {
  restoreDefaultServerUrl,
  selectServerUrl,
} from "@/common/server-url-actions";
import { serverUrlOverrideVar } from "@/common/vars/server-url";
import { Button } from "@/components/button";
import { PressableScale } from "@/components/pressable-scale";
import { createConnectionTestGate } from "./connection-test-gate";
import { connectionTone } from "./connection-tone";
import { useStackKeyboardOffset } from "@/common/hooks/use-stack-keyboard-offset";
import { InlineError } from "@/components/inline-error";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
      // Capped centered column on iPad; a no-op on phones (w21/m2).
      ...contentColumn,
      flexGrow: 1,
      padding: 20,
      gap: 16,
    },
    title: {
      color: theme.text01,
      fontSize: 24,
      fontWeight: "700",
    },
    copy: {
      color: theme.black80,
      fontSize: 16,
      lineHeight: 23,
    },
    label: {
      color: theme.text01,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    input: {
      borderColor: theme.controlBorder,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.text01,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    inputError: {
      borderColor: theme.error,
    },
    helper: {
      color: theme.black80,
      fontSize: 13,
      lineHeight: 19,
    },
    error: {
      color: theme.error,
      fontSize: 13,
      lineHeight: 19,
    },
    success: {
      color: theme.success,
      fontSize: 13,
      lineHeight: 19,
    },
    warning: {
      color: theme.warningText,
      fontSize: 13,
      lineHeight: 19,
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
    },
    action: {
      flex: 1,
    },
    restoreButton: {
      alignSelf: "flex-start",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    restoreText: {
      color: theme.primary,
      fontSize: 15,
      fontWeight: "600",
    },
  });

function validationMessage(
  code: ServerUrlErrorCode,
  t: (key: string) => string,
): string {
  switch (code) {
    case "empty":
      return t("serverUrlEmpty");
    case "credentials":
      return t("serverUrlCredentials");
    case "query":
      return t("serverUrlQuery");
    case "insecure":
      return t("serverUrlInsecure");
    default:
      return t("serverUrlInvalid");
  }
}

function connectionMessage(
  result: ServerConnectionResult,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  switch (result.kind) {
    case "connected":
      return t("serverConnectionSuccess");
    case "invalid":
      return validationMessage(result.code, t);
    case "timeout":
      return t("serverConnectionTimeout");
    case "unreachable":
      return t("serverConnectionUnreachable");
    case "older":
      return t("serverConnectionOlder");
    case "incompatible":
      // Say what the server told us, so the fix is a tap rather than a guess
      // (w21/214); only a server that answered without a hint gets the
      // generic words.
      if (result.detail?.reason === "not_configured") {
        return t("serverConnectionNotConfigured");
      }
      if (result.detail?.reason === "mismatch") {
        return t("serverConnectionCanonical", {
          url: result.detail.canonicalUrl,
        });
      }
      return t("serverConnectionIncompatible");
  }
}

/** The address a mismatched server names itself by, when it offered one. */
function canonicalAddress(
  result: ServerConnectionResult | undefined,
): string | undefined {
  return result?.kind === "incompatible" && result.detail?.reason === "mismatch"
    ? result.detail.canonicalUrl
    : undefined;
}

export function ServerSettingsScreen(): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const { t } = useTranslations();
  const keyboardVerticalOffset = useStackKeyboardOffset();
  const override = useReactiveVar(serverUrlOverrideVar);
  const activeUrl = override ?? defaultRuntimeServerUrl();
  const [url, setUrl] = useState(activeUrl);
  const [validationError, setValidationError] = useState<ServerUrlErrorCode>();
  const [connection, setConnection] = useState<ServerConnectionResult>();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testGate] = useState(createConnectionTestGate);

  const validate = useCallback(() => {
    const validation = validateServerUrl(url);
    setValidationError(validation.ok ? undefined : validation.code);
    return validation;
  }, [url]);

  const onTestConnection = useCallback(async () => {
    if (testing) {
      return;
    }
    const validation = validate();
    if (!validation.ok) {
      setConnection(undefined);
      return;
    }
    const token = testGate.start();
    setTesting(true);
    setConnection(undefined);
    const result = await testServerConnection(validation.url);
    // The draft changed (or a newer test began) while this one ran: its
    // result belongs to a URL no longer on screen.
    if (!testGate.isCurrent(token)) return;
    setTesting(false);
    setConnection(result);
  }, [testing, testGate, validate]);

  // One tap from "this server identifies as X": take X and test it, so the
  // user does not retype an address the server already told us (w21/214).
  const onUseCanonical = useCallback(
    async (canonical: string) => {
      setUrl(canonical);
      setValidationError(undefined);
      const token = testGate.start();
      setTesting(true);
      setConnection(undefined);
      const result = await testServerConnection(canonical);
      if (!testGate.isCurrent(token)) return;
      setTesting(false);
      setConnection(result);
    },
    [testGate],
  );

  const onSave = useCallback(async () => {
    if (saving) {
      return;
    }
    const validation = validate();
    if (!validation.ok) {
      return;
    }
    setSaving(true);
    await selectServerUrl(validation.url);
    setSaving(false);
    router.back();
  }, [saving, validate]);

  const onRestoreDefault = useCallback(async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    await restoreDefaultServerUrl();
    setUrl(defaultRuntimeServerUrl());
    setValidationError(undefined);
    testGate.invalidate();
    setTesting(false);
    setConnection(undefined);
    setSaving(false);
  }, [saving, testGate]);

  const canonical = canonicalAddress(connection);
  const tone = connection ? connectionTone(connection) : undefined;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: true, title: t("serverSettings") }}
      />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t("serverSettings")}</Text>
          <Text style={styles.copy}>{t("serverSettingsDescription")}</Text>
          <View>
            <Text style={styles.label}>{t("serverUrl")}</Text>
            <TextInput
              style={[styles.input, validationError && styles.inputError]}
              value={url}
              onChangeText={(value) => {
                setUrl(value);
                setValidationError(undefined);
                testGate.invalidate();
                setTesting(false);
                setConnection(undefined);
              }}
              placeholder="https://ledger.example.com/"
              placeholderTextColor={theme.controlPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="url"
              textContentType="URL"
              accessibilityLabel={t("serverUrl")}
              testID="server-url-input"
            />
            <Text style={styles.helper}>{t("serverUrlHelper")}</Text>
            {validationError && (
              <InlineError
                style={styles.error}
                message={validationMessage(validationError, t)}
              />
            )}
            {connection && (
              <InlineError
                style={styles[tone ?? "error"]}
                message={connectionMessage(connection, t)}
              />
            )}
            {canonical !== undefined && (
              <PressableScale
                style={styles.restoreButton}
                accessibilityRole="button"
                accessibilityLabel={t("serverUseCanonical")}
                testID="use-canonical-server"
                disabled={saving || testing}
                onPress={() => void onUseCanonical(canonical)}
              >
                <Text style={styles.restoreText}>
                  {t("serverUseCanonical")}
                </Text>
              </PressableScale>
            )}
            {tone === "error" && (
              <Text style={styles.helper}>{t("serverConnectionAdvisory")}</Text>
            )}
          </View>
          <View style={styles.actionRow}>
            <Button
              type="outline"
              style={styles.action}
              loading={testing}
              disabled={saving}
              testID="test-server-connection"
              onPress={() => void onTestConnection()}
            >
              {t("testConnection")}
            </Button>
            <Button
              type="primary"
              style={styles.action}
              loading={saving}
              disabled={testing}
              testID="save-server-url"
              onPress={() => void onSave()}
            >
              {t("save")}
            </Button>
          </View>
          <PressableScale
            style={styles.restoreButton}
            accessibilityRole="button"
            accessibilityLabel={t("restoreDefaultServer")}
            testID="restore-default-server"
            disabled={saving || testing}
            onPress={() => void onRestoreDefault()}
          >
            <Text style={styles.restoreText}>{t("restoreDefaultServer")}</Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

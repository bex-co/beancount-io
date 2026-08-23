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

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
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
      color: theme.black60,
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
  t: (key: string) => string,
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
    case "incompatible":
      return t("serverConnectionIncompatible");
  }
}

export function ServerSettingsScreen(): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const { t } = useTranslations();
  const override = useReactiveVar(serverUrlOverrideVar);
  const activeUrl = override ?? defaultRuntimeServerUrl();
  const [url, setUrl] = useState(activeUrl);
  const [validationError, setValidationError] = useState<ServerUrlErrorCode>();
  const [connection, setConnection] = useState<ServerConnectionResult>();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setTesting(true);
    setConnection(undefined);
    const result = await testServerConnection(validation.url);
    setTesting(false);
    setConnection(result);
  }, [testing, validate]);

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
    setConnection(undefined);
    setSaving(false);
  }, [saving]);

  const connectionIsSuccess = connection?.kind === "connected";
  const connectionIsError = connection !== undefined && !connectionIsSuccess;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: true, title: t("serverSettings") }}
      />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              <Text style={styles.error} accessibilityRole="alert">
                {validationMessage(validationError, t)}
              </Text>
            )}
            {connection && (
              <Text
                style={connectionIsSuccess ? styles.success : styles.error}
                accessibilityRole="alert"
              >
                {connectionMessage(connection, t)}
              </Text>
            )}
            {connectionIsError && (
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

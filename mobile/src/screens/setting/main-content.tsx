import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { List as List2 } from "@/components";

import { analytics } from "@/common/analytics";
import { i18n, setLocale } from "@/translations";
import { useTranslations } from "@/common/hooks/use-translations";
import { useDeleteAccountMutation } from "@/generated-graphql/graphql";
import { useSession } from "@/common/hooks/use-session";
import { localeVar, themeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";
import { router } from "expo-router";
import { useToast } from "@/common/hooks";
import { Picker } from "@/components/picker";
import { TextInputModal } from "@/components/text-input-modal";
import {
  ListItemHorizontal,
  SectionHeader,
  SecondaryButton,
} from "./list-item";
import { Theme } from "@/common/vars/theme";
import { useTheme } from "@/common/theme";
import { Ionicons } from "@expo/vector-icons";
import { LedgerListItem } from "./ledger-list-item";

export const MainContent = () => {
  const { authToken } = useSession();
  const toast = useToast();
  const locale = useReactiveVar(localeVar);
  const currentTheme = useReactiveVar(themeVar);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const LANGUAGES = {
    en: "English",
    zh: "中文",
    bg: "Български",
    ca: "Català",
    de: "Deutsch",
    es: "Español",
    fa: "فارسی",
    fr: "Français",
    nl: "Nederlands",
    pt: "Português",
    ru: "Русский",
    sk: "Slovenčina",
    uk: "Українська",
  };

  const THEMES = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };

  const languageSource = Object.entries(LANGUAGES).map(([value, label]) => ({
    value,
    label,
  }));

  const themeSource = Object.entries(THEMES).map(([value, label]) => ({
    value,
    label,
  }));
  const [deleteAccountMutation, { loading: deleteAccountLoading }] =
    useDeleteAccountMutation();

  const getLanguageLabel = (lng: string) => {
    return LANGUAGES[lng as keyof typeof LANGUAGES] || LANGUAGES.en;
  };

  const getThemeLabel = (theme: Theme) => {
    return THEMES[theme] || THEMES.light;
  };

  const handleDeleteAccount = async () => {
    try {
      const result = await deleteAccountMutation();
      if (result.data?.deleteAccount) {
        toast.showToast({
          message: "Account deleted successfully",
          type: "success",
        });
        // Navigate to logout screen after successful deletion
        router.push("/(app)/logout");
      } else {
        toast.showToast({
          message: "Failed to delete account",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast.showToast({
        message: "Failed to delete account",
        type: "error",
      });
    }
  };

  const handleDeleteAccountConfirm = (inputText: string) => {
    setDeleteAccountModalVisible(false);
    // Proceed with deletion only if the input matches
    if (inputText === t("deleteAccountConfirmPhrase")) {
      handleDeleteAccount();
    }
  };

  return (
    <>
      <List2>
        <SectionHeader title={t("appSettings")} />
        <ListItemHorizontal
          icon={<Ionicons name="language" size={22} color={theme.black80} />}
          title={t("currentLanguage")}
          content={getLanguageLabel(String(locale))}
          onPress={() => {
            setLanguageModalVisible(true);
          }}
        />
        <ListItemHorizontal
          icon={<Ionicons name="contrast" size={22} color={theme.black80} />}
          title={t("theme")}
          content={getThemeLabel(currentTheme)}
          onPress={() => {
            setThemeModalVisible(true);
          }}
        />
        <LedgerListItem />

        <SectionHeader title={t("supportSettings")} />
        <ListItemHorizontal
          icon={<Ionicons name="star" size={22} color={theme.black80} />}
          title={t("reviewApp")}
          content={Platform.OS === "ios" ? "Apple Store" : "Google Play"}
          onPress={async () => {
            const storeUrl =
              Platform.OS === "ios"
                ? "https://apps.apple.com/us/app/id1527950512"
                : "https://play.google.com/store/apps/details?id=io.beancount.android";
            if (storeUrl) {
              await WebBrowser.openBrowserAsync(storeUrl);
              await analytics.track("tap_review_app", { storeUrl });
            }
          }}
        />
        <ListItemHorizontal
          icon={<Ionicons name="help-circle" size={22} color={theme.black80} />}
          title={t("helpCenter")}
          onPress={async () => {
            const helpCenterUrl = "https://beancount.io/docs/help-center";
            await WebBrowser.openBrowserAsync(helpCenterUrl);
            await analytics.track("tap_help_center", { url: helpCenterUrl });
          }}
        />
        {authToken && (
          <ListItemHorizontal
            icon={<Ionicons name="trash" size={22} color={theme.black80} />}
            title={t("deleteAccount")}
            description={t("deleteAccountDescription")}
            onPress={() => {
              if (deleteAccountLoading) return;
              Alert.alert(
                "",
                t("deleteAccountAlertMsg"),
                [
                  { text: t("deleteAccountAlertCancel"), style: "cancel" },
                  {
                    text: t("deleteAccountAlertConfirm"),
                    style: "destructive",
                    onPress: () => setDeleteAccountModalVisible(true),
                  },
                ],
                { cancelable: false },
              );
            }}
          />
        )}
        <ListItemHorizontal
          icon={
            <Ionicons
              name="information-circle"
              size={22}
              color={theme.black80}
            />
          }
          title={t("currentVersion")}
          content={Constants.expoConfig?.version || "Unknown"}
        />
      </List2>

      {authToken && (
        <SecondaryButton
          title={t("logout")}
          icon={<Ionicons name="log-out" size={20} color={theme.error} />}
          destructive
          onPress={() => {
            Alert.alert(
              "",
              t("logoutAlertMsg"),
              [
                { text: t("logoutAlertCancel"), style: "cancel" },
                {
                  text: t("logoutAlertConfirm"),
                  onPress: () => {
                    router.push("/(app)/logout");
                  },
                },
              ],
              { cancelable: false },
            );
          }}
        />
      )}
      <Picker
        visible={languageModalVisible}
        items={languageSource}
        onSelect={async (item) => {
          const changeTo = item.value ? String(item.value) : "en";
          if (changeTo === locale) {
            return;
          }
          localeVar(changeTo);
          i18n.locale = changeTo;
          setLocale(changeTo);
          await analytics.track("tap_switch_language", { changeTo });
          setLanguageModalVisible(false);
        }}
        onCancel={() => {
          setLanguageModalVisible(false);
        }}
        selectedValue={locale}
        confirmButtonText={t("confirm")}
        cancelButtonText={t("cancel")}
      />
      <Picker
        visible={themeModalVisible}
        items={themeSource}
        onSelect={async (item) => {
          const newTheme = item.value as Theme;
          if (newTheme === currentTheme) {
            return;
          }
          themeVar(newTheme);
          await analytics.track("tap_switch_theme", { mode: newTheme });
          setThemeModalVisible(false);
        }}
        onCancel={() => {
          setThemeModalVisible(false);
        }}
        selectedValue={currentTheme}
        confirmButtonText={t("confirm")}
        cancelButtonText={t("cancel")}
      />
      <TextInputModal
        visible={deleteAccountModalVisible}
        title={t("deleteAccountConfirmTitle")}
        message={t("deleteAccountConfirmMessage")}
        placeholder={t("deleteAccountConfirmPlaceholder")}
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setDeleteAccountModalVisible(false)}
        confirmButtonText={t("deleteAccountAlertConfirm")}
        cancelButtonText={t("deleteAccountAlertCancel")}
        destructive
        validateInput={(text) => text === t("deleteAccountConfirmPhrase")}
      />
    </>
  );
};

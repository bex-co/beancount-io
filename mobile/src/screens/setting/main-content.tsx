import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { Alert, Linking, Platform, View } from "react-native";
import { CardLoadFailure } from "@/components/card-load-failure";
import { LoadingTile } from "@/components/loading-tile";
import { List as List2 } from "@/components";

import { i18n, setLocale } from "@/translations";
import { useTranslations } from "@/common/hooks/use-translations";
import { helpCenterUrl } from "@/common/site-url";
import { useDeleteAccountMutation } from "@/generated-graphql/graphql";
import { useSession } from "@/common/hooks/use-session";
import { actionLogout } from "./logout";
import { runAccountDeletion } from "./delete-account";
import { flushLocale, localeVar, themeVar } from "@/common/vars";
import {
  applyLayoutDirection,
  isRtlLayout,
  languageChangePlan,
} from "@/common/rtl";
import { reloadApp } from "@/common/reload-app";
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
import { useCurrentUser } from "@/common/hooks/use-current-user";
import { UserAvatar } from "@/components/user-avatar";
import { deleteConfirmationCheck } from "./delete-confirmation";
import { openReviewPage } from "./review-app";

export const MainContent = () => {
  const session = useSession();
  const toast = useToast();
  const locale = useReactiveVar(localeVar);
  const currentTheme = useReactiveVar(themeVar);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const {
    user,
    displayName,
    loading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useCurrentUser();
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

  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);

  const getLanguageLabel = (lng: string) => {
    return LANGUAGES[lng as keyof typeof LANGUAGES] || LANGUAGES.en;
  };

  const getThemeLabel = (theme: Theme) => {
    return THEMES[theme] || THEMES.light;
  };

  const handleDeleteAccount = async () => {
    const outcome = await runAccountDeletion({
      deleteAccount: async () =>
        Boolean((await deleteAccountMutation()).data?.deleteAccount),
      signOut: () => actionLogout(session),
    });
    if (outcome === "deleted") {
      toast.showToast({ message: t("deleteAccountSuccess"), type: "success" });
      router.replace("/auth/welcome");
      return;
    }
    // Native chrome rather than a toast: a failed deletion must be reported,
    // and it cannot depend on the toast layer for its only message.
    Alert.alert("", t("deleteAccountFailed"));
  };

  const handleDeleteAccountConfirm = (inputText: string) => {
    setDeleteAccountModalVisible(false);
    // Proceed with deletion only if the input matches
    if (
      deleteConfirmationCheck(
        inputText,
        t("deleteAccountConfirmPhrase"),
        t("deleteAccountConfirmMismatch"),
      ) === true
    ) {
      // Never an unhandled rejection from here: the deletion settles its own
      // outcome, and whatever else throws is reported as a failure (w21/968).
      handleDeleteAccount().catch(() =>
        Alert.alert("", t("deleteAccountFailed")),
      );
    }
  };

  return (
    <>
      <List2>
        {/* The Account section is the only way into Profile, so it is never
            dropped without a word: a skeleton while the profile loads, and a
            retry if it could not (w21/405). */}
        {(user || userLoading || userError) && (
          <SectionHeader title={t("accountSettings")} />
        )}
        {!user && userLoading && (
          <View
            testID="setting-profile-loading"
            style={{ paddingHorizontal: 16, paddingVertical: 18 }}
          >
            <LoadingTile height={28} width={180} />
          </View>
        )}
        {!user && !userLoading && userError && (
          <CardLoadFailure onRetry={() => refetchUser()} />
        )}
        {user && (
          <ListItemHorizontal
            testID="setting-profile"
            icon={
              <UserAvatar uri={user.avatarUrl} name={displayName} size={28} />
            }
            title={displayName}
            content={user.email}
            onPress={() => router.push("/(app)/profile")}
          />
        )}
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
          testID="setting-theme"
          icon={<Ionicons name="contrast" size={22} color={theme.black80} />}
          title={t("theme")}
          content={getThemeLabel(currentTheme)}
          onPress={() => {
            setThemeModalVisible(true);
          }}
        />

        <SectionHeader title={t("supportSettings")} />
        <ListItemHorizontal
          icon={<Ionicons name="star" size={22} color={theme.black80} />}
          title={t("reviewApp")}
          content={Platform.OS === "ios" ? "App Store" : "Google Play"}
          onPress={() =>
            void openReviewPage(
              Platform.OS,
              (url) => Linking.openURL(url),
              (url) => WebBrowser.openBrowserAsync(url),
            )
          }
        />
        <ListItemHorizontal
          icon={<Ionicons name="help-circle" size={22} color={theme.black80} />}
          title={t("helpCenter")}
          onPress={async () => {
            await WebBrowser.openBrowserAsync(helpCenterUrl(locale));
          }}
        />
        {session && (
          <ListItemHorizontal
            icon={<Ionicons name="trash" size={22} color={theme.black80} />}
            title={t("deleteAccount")}
            busy={deleteAccountLoading}
            description={
              deleteAccountLoading
                ? t("deleteAccountInProgress")
                : t("deleteAccountDescription")
            }
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
          content={Constants.expoConfig?.version || t("unknown")}
        />
      </List2>

      {session && (
        <SecondaryButton
          title={t("logout")}
          icon={<Ionicons name="log-out" size={20} color={theme.error} />}
          destructive
          busy={loggingOut}
          onPress={() => {
            Alert.alert(
              "",
              t("logoutAlertMsg"),
              [
                { text: t("logoutAlertCancel"), style: "cancel" },
                {
                  text: t("logoutAlertConfirm"),
                  onPress: async () => {
                    // One sign-out at a time: a second tap used to start a
                    // parallel one (w21/352).
                    if (loggingOutRef.current) return;
                    loggingOutRef.current = true;
                    setLoggingOut(true);
                    try {
                      await actionLogout(session);
                    } catch {
                      // Still signed out as far as this device can tell: the
                      // revocation has run, and Welcome is where it leads
                      // (w21/967).
                    } finally {
                      loggingOutRef.current = false;
                      setLoggingOut(false);
                    }
                    router.replace("/auth/welcome");
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
          // A layout that disagrees with the language costs a restart:
          // `I18nManager.forceRTL` is read by the native side at startup.
          // Decided from the live layout, so a cancelled prompt can be
          // brought back by picking the language again (w21/086).
          const plan = languageChangePlan(locale, changeTo, isRtlLayout());
          if (!plan.switchLanguage && !plan.promptRestart) {
            return;
          }
          if (plan.switchLanguage) {
            localeVar(changeTo);
            i18n.locale = changeTo;
            setLocale(changeTo);
          }
          setLanguageModalVisible(false);

          if (!plan.promptRestart) {
            return;
          }
          Alert.alert(
            t("restartForLayoutTitle"),
            t("restartForLayoutMessage", {
              language: getLanguageLabel(changeTo),
            }),
            [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("restartNow"),
                onPress: async () => {
                  applyLayoutDirection(changeTo);
                  // The restart kills the process, so the persisted locale has
                  // to have actually landed first — otherwise the app comes
                  // back in the previous language with the new direction.
                  await flushLocale();
                  await reloadApp();
                },
              },
            ],
            { cancelable: true },
          );
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
        onSelect={(item) => {
          const newTheme = item.value as Theme;
          if (newTheme === currentTheme) {
            return;
          }
          themeVar(newTheme);
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
        validateInput={(text) =>
          deleteConfirmationCheck(
            text,
            t("deleteAccountConfirmPhrase"),
            t("deleteAccountConfirmMismatch"),
          )
        }
      />
    </>
  );
};

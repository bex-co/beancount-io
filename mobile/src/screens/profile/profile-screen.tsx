import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import {
  useUpdateProfileMutation,
  useUpdateUsernameMutation,
} from "@/generated-graphql/graphql";
import { useCurrentUser } from "@/common/hooks/use-current-user";
import { useLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useToast } from "@/common/hooks";
import { useStackKeyboardOffset } from "@/common/hooks/use-stack-keyboard-offset";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { isGravatarUrl } from "@/common/user-display";
import type { ColorTheme } from "@/types/theme-props";
import { Button } from "@/components/button";
import { CardLoadFailure } from "@/components/card-load-failure";
import { LoadingTile } from "@/components/loading-tile";
import { UserAvatar } from "@/components/user-avatar";
import {
  isUsernameTaken,
  profileChanges,
  type ProfileValues,
} from "./profile-changes";

const AVATAR_SIZE = 96;
const skeletonWidths = [120, 96, 140, 180];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.white },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: gutter,
      paddingTop: space.lg,
      paddingBottom: space.xl,
      gap: space.md,
    },
    avatarBlock: {
      alignItems: "center",
      gap: space.sm,
      marginBottom: space.sm,
    },
    avatarCaption: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.primary,
    },
    card: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black20,
      borderRadius: 12,
      backgroundColor: theme.white,
      minHeight: 64,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.xxs,
      justifyContent: "center",
    },
    readOnlyCard: { backgroundColor: theme.controlFill },
    label: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    input: {
      fontSize: fontSizes.lg,
      lineHeight: 22,
      color: theme.text01,
      paddingVertical: space.xxs,
      textAlign: LEADING_TEXT_ALIGN,
    },
    readOnlyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    readOnlyValue: { flex: 1, color: theme.black80 },
    hint: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black80,
      paddingHorizontal: space.md,
      marginTop: -space.xs,
      textAlign: LEADING_TEXT_ALIGN,
    },
    hintError: { color: theme.error },
    footer: {
      paddingHorizontal: gutter,
      paddingTop: space.sm,
      paddingBottom: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      backgroundColor: theme.white,
      gap: space.sm,
    },
    formError: {
      fontSize: fontSizes.md,
      color: theme.error,
      textAlign: "center",
    },
    // The shared Button has no disabled look; here it matters, because an
    // untouched form is the common state and Save must read as unavailable.
    saveDisabled: { opacity: 0.4 },
    skeletonAvatar: { borderRadius: AVATAR_SIZE / 2 },
    skeletonCard: { gap: space.sm },
  });

/** First-load placeholder in the loaded screen's exact geometry. */
function ProfileSkeleton(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <View style={styles.content} testID="profile-skeleton">
      <View style={styles.avatarBlock}>
        <LoadingTile
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          style={styles.skeletonAvatar}
        />
      </View>
      {skeletonWidths.map((width) => (
        <View key={width} style={[styles.card, styles.skeletonCard]}>
          <LoadingTile width={72} height={12} />
          <LoadingTile width={width} height={16} />
        </View>
      ))}
    </View>
  );
}

/** The Save bar. Its own component so that only it, not the whole form,
 * re-renders on each keystroke to recompute whether there is anything to save. */
function ProfileFooter({
  control,
  savedValues,
  saved,
  isSubmitting,
  rootError,
  onSave,
}: {
  control: Control<ProfileValues>;
  savedValues: ProfileValues;
  saved: boolean;
  isSubmitting: boolean;
  rootError?: string;
  onSave: () => void;
}): JSX.Element {
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const edited = useWatch({ control }) as ProfileValues;
  const hasChanges =
    Object.keys(profileChanges(savedValues, edited)).length > 0;
  const canSave = hasChanges && !isSubmitting && !saved;
  return (
    <View style={styles.footer}>
      {rootError ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {rootError}
        </Text>
      ) : null}
      <View style={!canSave && !isSubmitting ? styles.saveDisabled : null}>
        <Button
          testID="profile-save"
          onPress={onSave}
          disabled={!canSave}
          loading={isSubmitting}
        >
          {t("save")}
        </Button>
      </View>
    </View>
  );
}

export function ProfileScreen(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const toast = useToast();
  const { user, displayName, loading, refetch } = useCurrentUser();
  const [updateProfile] = useUpdateProfileMutation();
  const [updateUsername] = useUpdateUsernameMutation();
  const { refresh: refreshLedgers } = useLedgerDirectory();
  const [saved, setSaved] = useState(false);
  const keyboardVerticalOffset = useStackKeyboardOffset();
  const screenOptions = useMemo(() => ({ title: t("profile") }), [t]);

  const savedValues: ProfileValues = useMemo(
    () => ({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    }),
    [user?.firstName, user?.lastName, user?.username],
  );

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().max(100),
        lastName: z.string().max(100),
        username: z
          .string()
          .trim()
          .min(1, t("profileUsernameRequired"))
          .regex(/^\S+$/, t("profileUsernameNoSpaces")),
      }),
    [t],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    // `values` keeps the form in step with the cached profile until edited.
    values: savedValues,
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    const pending = profileChanges(savedValues, values);
    // Username first: it is the write most likely to be refused, and a
    // refusal should leave the names untouched too.
    if (pending.username !== undefined) {
      try {
        await updateUsername({ variables: { username: pending.username } });
        // Renaming the account renames every ledger it owns; the directory
        // would otherwise keep listing them under the old owner.
        void refreshLedgers().catch(() => {});
      } catch (error) {
        const taken = isUsernameTaken(error);
        setError(taken ? "username" : "root", {
          message: t(taken ? "profileUsernameTaken" : "saveFailed"),
        });
        return;
      }
    }
    if (pending.name) {
      try {
        await updateProfile({ variables: pending.name });
      } catch {
        setError("root", { message: t("saveFailed") });
        return;
      }
    }
    setSaved(true);
    toast.showToast({ message: t("profileUpdated"), type: "success" });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/settings");
    }
  });

  const textField = (
    name: keyof ProfileValues,
    label: string,
    options: { autoCapitalize: "words" | "none"; testID: string },
  ) => (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            testID={options.testID}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize={options.autoCapitalize}
            autoCorrect={false}
            editable={!saved}
            placeholder={t("profileNotSet")}
            placeholderTextColor={theme.controlPlaceholder}
            style={styles.input}
            accessibilityLabel={label}
            returnKeyType="done"
          />
        )}
      />
    </View>
  );

  let body: JSX.Element;
  if (user) {
    body = (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarBlock}>
          <UserAvatar
            testID="profile-avatar"
            uri={user.avatarUrl}
            name={displayName}
            size={AVATAR_SIZE}
          />
          {isGravatarUrl(user.avatarUrl) ? (
            <Pressable
              onPress={() =>
                void WebBrowser.openBrowserAsync("https://gravatar.com/")
              }
              accessibilityRole="link"
              accessibilityLabel={t("profilePhotoFromGravatar")}
              hitSlop={8}
            >
              <Text style={styles.avatarCaption}>
                {t("profilePhotoFromGravatar")}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {textField("firstName", t("profileFirstName"), {
          autoCapitalize: "words",
          testID: "profile-first-name",
        })}
        {textField("lastName", t("profileLastName"), {
          autoCapitalize: "words",
          testID: "profile-last-name",
        })}
        {textField("username", t("profileUsername"), {
          autoCapitalize: "none",
          testID: "profile-username",
        })}
        {errors.username?.message ? (
          <Text
            style={[styles.hint, styles.hintError]}
            accessibilityRole="alert"
          >
            {errors.username.message}
          </Text>
        ) : (
          <Text style={styles.hint}>{t("profileUsernameHint")}</Text>
        )}

        <View
          style={[styles.card, styles.readOnlyCard]}
          accessible
          accessibilityLabel={`${t("profileEmail")}, ${user.email}`}
          accessibilityHint={t("profileEmailReadOnly")}
        >
          <Text style={styles.label}>{t("profileEmail")}</Text>
          <View style={styles.readOnlyRow}>
            <Text
              style={[styles.input, styles.readOnlyValue]}
              numberOfLines={1}
            >
              {user.email}
            </Text>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.black80}
            />
          </View>
        </View>
      </ScrollView>
    );
  } else if (loading) {
    body = <ProfileSkeleton />;
  } else {
    body = <CardLoadFailure onRetry={() => void refetch()} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={screenOptions} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {body}
        {user ? (
          <ProfileFooter
            control={control}
            savedValues={savedValues}
            saved={saved}
            isSubmitting={isSubmitting}
            rootError={errors.root?.message}
            onSave={() => void onSubmit()}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

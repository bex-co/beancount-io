import { useMemo, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { renameLedgerOwner } from "@/common/vars/rename-ledger-owner";
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
import { LEADING_TEXT_ALIGN, leadingInputTextAlign } from "@/common/rtl";
import { isGravatarUrl } from "@/common/user-display";
import type { ColorTheme } from "@/types/theme-props";
import { Button } from "@/components/button";
import { CardLoadFailure } from "@/components/card-load-failure";
import { LoadingTile } from "@/components/loading-tile";
import { UserAvatar } from "@/components/user-avatar";
import {
  usernameAllowed,
  usernameErrorKey,
  nameFailureKey,
  profileChanges,
  type ProfileValues,
} from "./profile-changes";
import { useIsHere } from "@/common/hooks/use-is-here";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
import { InlineError } from "@/components/inline-error";

/** The longest first or last name the form accepts. */
const NAME_MAX = 100;

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
      textAlign: leadingInputTextAlign(),
    },
    readOnlyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    // A Text reusing the input style: it needs the Text rule back, or iOS
    // flips the input-only "right" to the wrong edge (w0/045).
    readOnlyValue: {
      flex: 1,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
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
        <InlineError style={styles.formError} message={rootError} />
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
  const client = useApolloClient();
  const [saved, setSaved] = useState(false);
  const [avatarFallback, setAvatarFallback] = useState(false);
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
        // Rendered under its field: a hidden error blocked Save with no word
        // (w21/123).
        firstName: z.string().max(NAME_MAX, t("profileNameTooLong")),
        lastName: z.string().max(NAME_MAX, t("profileNameTooLong")),
        username: z
          .string()
          .trim()
          .min(1, t("profileUsernameRequired"))
          .refine(
            (name) => usernameAllowed(savedValues.username, name),
            t("profileUsernameRule"),
          ),
      }),
    [t, savedValues.username],
  );

  const isHere = useIsHere();
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

  // The username this form has already saved. A retry after the name failed
  // must not send it, or rename the ledgers a second time (w21/288).
  const savedUsernameRef = useRef<string | null>(null);

  // Back on an edit asks first, as every other edit form does: Profile let a
  // changed name go without a word (w21/800). The Back after a save is not a
  // discard.
  const edited = useWatch({ control }) as ProfileValues;
  const hasChanges =
    Object.keys(profileChanges(savedValues, edited)).length > 0;
  const leavingSavedRef = useRef(false);
  useUnsavedChangesGuard(hasChanges && !saved, leavingSavedRef);

  const onSubmit = handleSubmit(async (values) => {
    const pending = profileChanges(savedValues, values);
    // Username first: it is the write most likely to be refused, and a
    // refusal should leave the names untouched too.
    if (
      pending.username !== undefined &&
      pending.username !== savedUsernameRef.current
    ) {
      try {
        await updateUsername({ variables: { username: pending.username } });
        // Renaming the account renames every ledger it owns: follow them with
        // everything remembered per ledger, drop what was read under the old
        // ids, and re-list the directory, which would otherwise keep listing
        // them under the old owner (w21/226).
        savedUsernameRef.current = pending.username;
        renameLedgerOwner(savedValues.username, pending.username);
        void invalidateLedgerData(client, "file");
        void refreshLedgers().catch(() => {});
      } catch (error) {
        const fieldKey = usernameErrorKey(error);
        setError(fieldKey ? "username" : "root", {
          message: t(fieldKey ?? "saveFailed"),
        });
        return;
      }
    }
    if (pending.name) {
      try {
        await updateProfile({ variables: pending.name });
      } catch {
        setError("root", {
          message: t(nameFailureKey(savedUsernameRef.current !== null)),
        });
        return;
      }
    }
    setSaved(true);
    toast.showToast({ message: t("profileUpdated"), type: "success" });
    // Left during the save: the toast is enough, and `back()` would close
    // whatever the user opened meanwhile (w21/194).
    if (!isHere()) return;
    leavingSavedRef.current = true;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/settings");
    }
  });

  const textField = (
    name: keyof ProfileValues,
    label: string,
    options: {
      autoCapitalize: "words" | "none";
      testID: string;
      maxLength?: number;
    },
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
            maxLength={options.maxLength}
          />
        )}
      />
    </View>
  );

  const nameError = (message: string | undefined) =>
    message ? (
      <InlineError style={[styles.hint, styles.hintError]} message={message} />
    ) : null;

  // A Gravatar URL comes back for everyone without an upload; when it fails to
  // load there is no Gravatar, and the initials must not be captioned as one
  // (w21/289).
  const gravatarCaption = avatarFallback
    ? t("profileAddGravatar")
    : t("profilePhotoFromGravatar");

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
            onFallbackChange={setAvatarFallback}
          />
          {isGravatarUrl(user.avatarUrl) ? (
            <Pressable
              onPress={() =>
                void WebBrowser.openBrowserAsync("https://gravatar.com/")
              }
              accessibilityRole="link"
              accessibilityLabel={gravatarCaption}
              hitSlop={8}
            >
              <Text style={styles.avatarCaption}>{gravatarCaption}</Text>
            </Pressable>
          ) : null}
        </View>

        {textField("firstName", t("profileFirstName"), {
          autoCapitalize: "words",
          testID: "profile-first-name",
          maxLength: NAME_MAX,
        })}
        {nameError(errors.firstName?.message)}
        {textField("lastName", t("profileLastName"), {
          autoCapitalize: "words",
          testID: "profile-last-name",
          maxLength: NAME_MAX,
        })}
        {nameError(errors.lastName?.message)}
        {textField("username", t("profileUsername"), {
          autoCapitalize: "none",
          testID: "profile-username",
        })}
        {errors.username?.message ? (
          <InlineError
            style={[styles.hint, styles.hintError]}
            message={errors.username.message}
          />
        ) : (
          <Text style={styles.hint}>
            {`${t("profileUsernameRule")} ${t("profileUsernameHint")}`}
          </Text>
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
    body = <CardLoadFailure onRetry={() => refetch()} />;
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

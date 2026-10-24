import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { InlineError } from "@/components/inline-error";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { durations, useTheme } from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    // The input autofocuses, so the keyboard is always up when this dialog is
    // open and the action row below the field used to sit behind it. The avoider
    // carries the card's width so the card itself is unchanged, and the body
    // scrolls inside a bounded card so enlarged text still reaches the actions.
    avoider: {
      width: "100%",
      maxWidth: 400,
      maxHeight: "100%",
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderRadius: 16,
      width: "100%",
      maxWidth: 400,
      maxHeight: "100%",
    },
    body: {
      flexGrow: 0,
      flexShrink: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text01,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: theme.black80,
      lineHeight: 20,
    },
    inputContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.black40,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.text01,
      backgroundColor: theme.white,
    },
    buttonContainer: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black40,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
    },
    cancelButton: {
      color: theme.black80,
      fontSize: 16,
    },
    confirmButton: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: "600",
    },
    confirmButtonDestructive: {
      color: theme.error,
      fontSize: 16,
      fontWeight: "600",
    },
    inputError: {
      marginTop: 8,
      fontSize: 13,
      color: theme.error,
    },
    confirmButtonDisabled: {
      color: theme.black40,
      fontSize: 16,
      fontWeight: "600",
    },
  });

type TextInputModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  destructive?: boolean;
  /**
   * Whether the text may be confirmed. A string means no and says why: it is
   * shown under the field and announced, so a disabled Confirm is never
   * unexplained (w21/014). `false` disables without a message.
   */
  validateInput?: (text: string) => boolean | string;
  /** The caller is checking the input against the server: Confirm waits. */
  busy?: boolean;
};

export const TextInputModal: React.FC<TextInputModalProps> = ({
  visible,
  title,
  message,
  placeholder,
  onConfirm,
  onCancel,
  confirmButtonText,
  cancelButtonText,
  destructive = false,
  validateInput,
  busy = false,
}) => {
  const theme = useTheme().colorTheme;
  // Translated defaults, never English ones (w21/178).
  const { t } = useTranslations();
  confirmButtonText ??= t("confirm");
  cancelButtonText ??= t("cancel");
  const styles = getStyles(theme);
  const [inputText, setInputText] = useState("");
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      setInputText("");
      opacity.value = withTiming(1, {
        duration: durations.fast,
        easing: easeStandard,
      });
      scale.value = withTiming(1, {
        duration: durations.fast,
        easing: easeStandard,
      });
    } else {
      opacity.value = withTiming(0, {
        duration: durations.fast,
        easing: easeStandard,
      });
      scale.value = withTiming(0.9, {
        duration: durations.fast,
        easing: easeStandard,
      });
    }
  }, [visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const validation = validateInput ? validateInput(inputText) : true;
  // `busy`: the caller is checking the input against the server; Confirm waits.
  const isConfirmDisabled = validation !== true || busy;
  const inputError = typeof validation === "string" ? validation : null;

  const handleConfirm = () => {
    if (isConfirmDisabled) {
      return;
    }
    onConfirm(inputText);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={onCancel}
        ></Pressable>
        <KeyboardAvoidingView
          style={styles.avoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View
            style={[styles.modalContainer, modalAnimatedStyle]}
            // VoiceOver's two-finger scrub dismisses it as Cancel (w21/357).
            onAccessibilityEscape={onCancel}
          >
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {message && <Text style={styles.message}>{message}</Text>}
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={placeholder}
                  accessibilityLabel={title}
                  placeholderTextColor={theme.controlPlaceholder}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  // Return confirms, as the button does: it closed the keyboard
                  // and nothing else (w21/990). A disabled confirm does nothing.
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                />
                {inputError ? (
                  <InlineError
                    style={styles.inputError}
                    testID="text-input-modal-error"
                    message={inputError}
                  />
                ) : null}
              </View>
            </ScrollView>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                accessibilityRole="button"
                onPress={onCancel}
                activeOpacity={0.6}
              >
                <Text style={styles.cancelButton}>{cancelButtonText}</Text>
              </TouchableOpacity>
              <View style={styles.buttonDivider} />
              <TouchableOpacity
                style={styles.button}
                accessibilityRole="button"
                onPress={handleConfirm}
                activeOpacity={0.6}
                disabled={isConfirmDisabled}
                accessibilityState={{ disabled: isConfirmDisabled, busy }}
              >
                <Text
                  style={
                    isConfirmDisabled
                      ? styles.confirmButtonDisabled
                      : destructive
                        ? styles.confirmButtonDestructive
                        : styles.confirmButton
                  }
                >
                  {confirmButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

import React, { useCallback, useMemo, useState } from "react";
import {
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ColorTheme } from "@/types/theme-props";
import { useTheme } from "@/common/theme";
import { PressableScale } from "@/components/pressable-scale";

type ButtonType = "primary" | "outline";

type ButtonProps = {
  type?: ButtonType;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

const getButtonStyles = (theme: ColorTheme) => {
  return StyleSheet.create({
    buttonBase: {
      height: 44,
      borderRadius: 8,
      // flex: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    buttonPrimary: {
      backgroundColor: theme.primary,
    },
    buttonPrimaryPressed: {
      backgroundColor: theme.primaryDark,
    },
    buttonPrimaryText: {
      color: theme.white,
      fontSize: 16,
    },
    buttonOutline: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    buttonOutlinePressed: {
      opacity: 0.6,
    },
    buttonOutlineText: {
      color: theme.primary,
      fontSize: 16,
    },
    buttonLoading: {
      marginEnd: 8,
    },
  });
};

export const Button = (props: ButtonProps) => {
  const type = props.type || "primary";
  const styles = useThemeStyle(getButtonStyles);
  // Tracked here rather than read from `Pressable`'s `({ pressed })` callback:
  // `PressableScale` animates the style prop, and Reanimated cannot resolve the
  // callback form. The colors below are unchanged either way.
  const [pressed, setPressed] = useState(false);

  const buttonStyle = useMemo(() => {
    switch (type) {
      case "primary":
        return [
          props.style,
          styles.buttonBase,
          styles.buttonPrimary,
          pressed && styles.buttonPrimaryPressed,
        ];
      case "outline":
        return [
          props.style,
          styles.buttonBase,
          styles.buttonOutline,
          pressed && styles.buttonOutlinePressed,
        ];
    }
  }, [styles, type, props.style, pressed]);

  const handlePressIn = useCallback(() => setPressed(true), []);
  const handlePressOut = useCallback(() => setPressed(false), []);

  const buttonTextStyle = useMemo(() => {
    switch (type) {
      case "primary":
        return styles.buttonPrimaryText;
      case "outline":
        return styles.buttonOutlineText;
    }
  }, [styles, type]);

  const theme = useTheme().colorTheme;

  return (
    <PressableScale
      style={buttonStyle}
      onPress={props.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={props.disabled || props.loading}
      testID={props.testID}
      accessibilityLabel={props.accessibilityLabel}
      pointerEvents={
        props.onPress && !props.disabled && !props.loading ? "auto" : "none"
      }
    >
      {props.loading ? (
        <ActivityIndicator
          color={type === "primary" ? theme.white : theme.primary}
          style={styles.buttonLoading}
        />
      ) : null}
      <Text style={buttonTextStyle}>{props.children}</Text>
    </PressableScale>
  );
};

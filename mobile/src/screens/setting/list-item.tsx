import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/common/theme";
import { directionalIcon, LEADING_TEXT_ALIGN } from "@/common/rtl";

type ListItemHorizontalProps = {
  onPress?: () => void;
  testID?: string;
  title: string | React.ReactNode;
  description?: string;
  content?: string | React.ReactNode;
  icon?: React.ReactNode;
  destructive?: boolean;
};

export const ListItemHorizontal = ({
  onPress,
  testID,
  title,
  content,
  description,
  icon,
  destructive = false,
}: ListItemHorizontalProps) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        backgroundColor: theme.white,
        paddingVertical: 12,
        minHeight: 64,
      },
      topRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingStart: 40, // Space for the absolutely positioned leading icon
      },
      iconContainer: {
        width: 28,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        start: 0,
        top: 18, // Center vertically (64px - 28px) / 2 = 18px
      },
      titleContainer: {
        flex: 1,
      },
      // The row's icon is pinned to the leading edge and the disclosure
      // chevron to the trailing one, so the text between them has to commit to
      // the leading edge too — left to `natural` it drifted to the opposite
      // side and sat under the chevron. See `LEADING_TEXT_ALIGN`.
      title: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.black90,
        textAlign: LEADING_TEXT_ALIGN,
      },
      titleDestructive: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.error,
        textAlign: LEADING_TEXT_ALIGN,
      },
      secondaryText: {
        fontSize: 14,
        color: theme.black80,
        marginTop: 2,
        textAlign: LEADING_TEXT_ALIGN,
      },
      bottomRow: {
        marginTop: 2,
        marginStart: 40, // Align with title (icon width + gap)
      },
      arrow: {
        position: "absolute",
        end: 0,
        top: 22, // Center vertically (64px - 20px) / 2 = 22px
      },
    }),
  );

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          {typeof title === "string" ? (
            <Text style={destructive ? styles.titleDestructive : styles.title}>
              {title}
            </Text>
          ) : (
            <View>{title}</View>
          )}
          {description && (
            <Text style={styles.secondaryText}>{description}</Text>
          )}
        </View>
      </View>
      {onPress && (
        <View style={styles.arrow}>
          <Ionicons
            name={directionalIcon("chevron-forward")}
            size={20}
            color={theme.black60}
          />
        </View>
      )}
      {content && (
        <View style={styles.bottomRow}>
          {typeof content === "string" ? (
            <Text style={styles.secondaryText}>{content}</Text>
          ) : (
            content
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ItemDescription = ({ text }: { text: string }) => {
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      text: {
        fontSize: 14,
        color: theme.black60,
      },
    }),
  );
  return <Text style={styles.text}>{text}</Text>;
};

export const SectionHeader = ({ title }: { title: string }) => {
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        paddingTop: 24,
        paddingBottom: 8,
      },
      title: {
        fontSize: 18,
        fontWeight: "600",
        color: theme.black90,
      },
    }),
  );
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export const SecondaryButton = ({
  title,
  onPress,
  icon,
  destructive = false,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}) => {
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        marginTop: 32,
        marginBottom: 16,
        paddingHorizontal: 16,
      },
      button: {
        backgroundColor: theme.white,
        borderWidth: 1,
        borderColor: destructive ? theme.error : theme.black20,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      },
      text: {
        fontSize: 16,
        fontWeight: "500",
        color: destructive ? theme.error : theme.black90,
      },
    }),
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={onPress}
      >
        {icon}
        <Text style={styles.text}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};

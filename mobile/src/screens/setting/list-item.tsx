import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/common/theme";
import { directionalIcon, LEADING_TEXT_ALIGN } from "@/common/rtl";
import { listItemLabel } from "./list-item-label";

type ListItemHorizontalProps = {
  onPress?: () => void;
  testID?: string;
  title: string | React.ReactNode;
  description?: string;
  content?: string | React.ReactNode;
  icon?: React.ReactNode;
  destructive?: boolean;
  /** The row's action is running; announced as busy (w21/287). */
  busy?: boolean;
};

export const ListItemHorizontal = ({
  onPress,
  testID,
  title,
  content,
  description,
  icon,
  destructive = false,
  busy = false,
}: ListItemHorizontalProps) => {
  const theme = useTheme().colorTheme;
  // Keys re-measure the Texts after a live text-size change (w22/021).
  const { fontScale } = useWindowDimensions();
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        backgroundColor: theme.white,
        paddingVertical: 12,
        minHeight: 64,
        // The icon and the chevron are pinned to the middle of that minimum
        // height, so a title-only row (Plan, Help Center, Log out) centres its
        // one line there too instead of hugging the top (w22/048). A row with
        // a second line is already about the minimum, so it barely moves.
        justifyContent: "center",
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

  const label = listItemLabel({ title, content, description });

  const body = (
    <>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          {typeof title === "string" ? (
            <Text
              key={`title-${fontScale}`}
              style={destructive ? styles.titleDestructive : styles.title}
            >
              {title}
            </Text>
          ) : (
            <View>{title}</View>
          )}
          {description && (
            <Text key={`description-${fontScale}`} style={styles.secondaryText}>
              {description}
            </Text>
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
            <Text key={`content-${fontScale}`} style={styles.secondaryText}>
              {content}
            </Text>
          ) : (
            content
          )}
        </View>
      )}
    </>
  );

  // A row with no action is not a control: a disabled touchable is read as
  // "dimmed" (Version). It is one readable line instead.
  return onPress ? (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      {body}
    </TouchableOpacity>
  ) : (
    <View
      style={styles.container}
      testID={testID}
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      {body}
    </View>
  );
};

export const SectionHeader = ({ title }: { title: string }) => {
  const { fontScale } = useWindowDimensions();
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
        textAlign: LEADING_TEXT_ALIGN,
      },
    }),
  );
  return (
    <View style={styles.container}>
      <Text key={fontScale} style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
};

export const SecondaryButton = ({
  title,
  onPress,
  icon,
  destructive = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  /** An action is under way: the button is dimmed and ignores presses. */
  busy?: boolean;
}) => {
  const { fontScale } = useWindowDimensions();
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
        opacity: busy ? 0.5 : 1,
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
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: busy, busy }}
      >
        {icon}
        <Text key={fontScale} style={styles.text}>
          {title}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

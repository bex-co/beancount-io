import * as React from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { LoginWebView } from "@/screens/welcome/login-web-view";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

const getLoginOrSignUpStyles = (theme: ColorTheme) => {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.white,
    },
    closeButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      position: "absolute",
      bottom: 10,
      end: 10,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    closeText: {
      color: theme.white,
      fontSize: 24,
      fontWeight: "bold",
    },
  });
};

type LoginOrSignUpProps = {
  children: JSX.Element;
  isSignUp?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LoginOrSignUp(props: LoginOrSignUpProps): JSX.Element {
  const [shouldDisplayModal, setShouldDisplayModal] = React.useState(false);

  const onCloseModal = () => {
    setShouldDisplayModal(false);
  };

  const styles = useThemeStyle(getLoginOrSignUpStyles);

  return (
    <>
      <TouchableOpacity
        style={props.style}
        onPress={async () => {
          setShouldDisplayModal(true);
          await analytics.track("tap_login_or_signup", {
            isSignUp: props.isSignUp ?? false,
          });
        }}
      >
        {props.children}
      </TouchableOpacity>

      <Modal
        visible={shouldDisplayModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onCloseModal}
      >
        <View style={styles.modalContainer}>
          <LoginWebView
            onClose={onCloseModal}
            isSignUp={props.isSignUp ?? false}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onCloseModal}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/common/apollo/client";
import { SplashProvider } from "./splash-provider/splash-provider";
import { ThemeProvider } from "./theme-provider/theme-provider";
import { ToastProvider } from "./toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export function Providers({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}): JSX.Element {
  return (
    <SplashProvider>
      <ToastProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={styles.container}>
            <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </ToastProvider>
    </SplashProvider>
  );
}

// import { ApolloProvider } from "@apollo/client/react";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { ReactNativeBridgeProvider } from "@/common/providers/react-native-bridge-provider";
import { Toaster } from "@/common/components/ui/sonner";
import { AnalyticsProvider } from "@/common/analytics";
import { LanguageSync } from "@/common/providers/language-sync";
import { VisualViewportHeight } from "@/common/providers/visual-viewport-height";
import i18n from "@/i18n/init";

export const RootProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ReactNativeBridgeProvider>
          {children}
          <AnalyticsProvider />
          <VisualViewportHeight />
          <LanguageSync />
        </ReactNativeBridgeProvider>
      </ThemeProvider>
      <Toaster />
    </I18nextProvider>
  );
};

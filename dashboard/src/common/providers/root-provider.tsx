// import { ApolloProvider } from "@apollo/client/react";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { ReactNativeBridgeProvider } from "@/common/providers/react-native-bridge-provider";
import { Toaster } from "@/common/components/ui/sonner";
import { AnalyticsProvider } from "@/common/analytics";
import { LanguageSync } from "@/common/providers/language-sync";
import { VisualViewportHeight } from "@/common/providers/visual-viewport-height";

export const RootProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ThemeProvider>
        <ReactNativeBridgeProvider>
          {children}
          <AnalyticsProvider />
          <VisualViewportHeight />
          <LanguageSync />
        </ReactNativeBridgeProvider>
      </ThemeProvider>
      <Toaster />
    </>
  );
};

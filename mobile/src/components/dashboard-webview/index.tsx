import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  WebView,
  WebViewMessageEvent,
  WebViewProps,
} from "react-native-webview";
import { useReactiveVar } from "@apollo/client";
import { localeVar } from "@/common/vars";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { StyleSheet } from "react-native";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

type SupportedLanguage =
  | "en"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru"
  | "nl"
  | "bg"
  | "ca"
  | "fa"
  | "sk"
  | "uk";

interface BridgeMessage {
  type: string;
  data: unknown;
}

const getStyles = (theme: ColorTheme) => {
  return StyleSheet.create({
    webView: {
      backgroundColor: theme.white,
    },
  });
};

interface DashboardWebViewProps extends Omit<WebViewProps, "onMessage"> {
  onMessage?: (event: WebViewMessageEvent) => void;
  scrollEnabled?: boolean;
}

export const DashboardWebView = forwardRef<WebView, DashboardWebViewProps>(
  ({ onMessage, scrollEnabled = false, ...webViewProps }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [bridgeReady, setBridgeReady] = useState(false);
    const locale = useReactiveVar(localeVar);
    const styles = useThemeStyle(getStyles);

    // Expose WebView methods to parent via ref
    useImperativeHandle(ref, () => webViewRef.current as WebView);

    // Sync language to webview when bridge is ready or locale changes
    useEffect(() => {
      if (bridgeReady && locale) {
        changeLanguage(locale as SupportedLanguage);
      }
    }, [bridgeReady, locale]);

    const changeLanguage = (language: SupportedLanguage) => {
      if (!webViewRef.current) return;

      const script = `
        window.dispatchEvent(new CustomEvent('rn:changeLanguage', {
          detail: { language: '${language}' }
        }));
        true;
      `;

      webViewRef.current.injectJavaScript(script);
      analytics.track("webview_language_sync", { language });
    };

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data: BridgeMessage = JSON.parse(event.nativeEvent.data);

        // Handle bridge ready message
        if (data.type === "bridgeReady") {
          setBridgeReady(true);
        }

        // Call custom onMessage handler if provided
        if (onMessage) {
          onMessage(event);
        }
      } catch (error) {
        console.error("Error handling webview message:", error);
      }
    };

    return (
      <WebView
        ref={webViewRef}
        {...webViewProps}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.webView}
        scrollEnabled={scrollEnabled}
        injectedJavaScriptBeforeContentLoaded={`
          // Inject React Native detection flag before content loads
          // This ensures the dashboard can detect it's running in React Native WebView
          window.isReactNativeApp = true;
          console.log('[DashboardWebView] Injected isReactNativeApp flag');
          true; // Required for injectedJavaScript to work properly
        `}
      />
    );
  },
);

DashboardWebView.displayName = "DashboardWebView";

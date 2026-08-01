# React Native WebView Bridge Integration Guide

## Overview

This guide shows how to integrate the Beancount Dashboard with a React Native app using WebView, with support for language synchronization and environment detection.

## Quick Start

### 1. Install Dependencies

```bash
npm install react-native-webview
# or
yarn add react-native-webview
```

### 2. Basic WebView Setup

```typescript
import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';

export default function DashboardScreen() {
  const webViewRef = useRef<WebView>(null);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://beancount.io' }}
      javaScriptEnabled={true}
    />
  );
}
```

## Language Synchronization

### Listen for Bridge Ready

Wait for the bridge to initialize before sending commands:

```typescript
import React, { useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

export default function DashboardScreen() {
  const webViewRef = useRef<WebView>(null);
  const [bridgeReady, setBridgeReady] = useState(false);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'bridgeReady') {
        console.log('✅ Bridge ready!');
        console.log('Supported languages:', data.data.supportedLanguages);
        console.log('Current language:', data.data.currentLanguage);

        setBridgeReady(true);

        // Now safe to send language commands
        changeLanguage('zh');
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://beancount.io' }}
      onMessage={handleMessage}
      javaScriptEnabled={true}
    />
  );
}
```

### Change Language

```typescript
const changeLanguage = (language: string) => {
  if (!webViewRef.current) return;

  const script = `
    window.dispatchEvent(new CustomEvent('rn:changeLanguage', {
      detail: { language: '${language}' }
    }));
    true;
  `;

  webViewRef.current.injectJavaScript(script);
};

// Usage
changeLanguage("zh"); // Chinese
changeLanguage("es"); // Spanish
changeLanguage("fr"); // French
```

### Listen for Language Changes

When the user changes language inside the webview:

```typescript
const handleMessage = (event) => {
  const data = JSON.parse(event.nativeEvent.data);

  if (data.type === "languageChanged") {
    console.log("Language changed to:", data.data.language);

    // Update React Native app state
    setCurrentLanguage(data.data.language);

    // Save to AsyncStorage for persistence
    AsyncStorage.setItem("appLanguage", data.data.language);
  }
};
```

## Complete Example

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SupportedLanguage =
  | 'en' | 'zh' | 'es' | 'fr' | 'de' | 'pt'
  | 'ru' | 'nl' | 'bg' | 'ca' | 'fa' | 'sk' | 'uk';

export default function DashboardScreen() {
  const webViewRef = useRef<WebView>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');

  // Load saved language on mount
  useEffect(() => {
    loadLanguage();
  }, []);

  // Sync language to webview when bridge is ready
  useEffect(() => {
    if (bridgeReady && currentLanguage) {
      changeLanguage(currentLanguage);
    }
  }, [bridgeReady]);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved) {
        setCurrentLanguage(saved as SupportedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = (language: SupportedLanguage) => {
    const script = `
      window.dispatchEvent(new CustomEvent('rn:changeLanguage', {
        detail: { language: '${language}' }
      }));
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
    setCurrentLanguage(language);
    AsyncStorage.setItem('appLanguage', language);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'bridgeReady':
          console.log('✅ Bridge ready');
          setBridgeReady(true);
          break;

        case 'languageChanged':
          console.log('Language changed:', data.data.language);
          setCurrentLanguage(data.data.language);
          AsyncStorage.setItem('appLanguage', data.data.language);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://beancount.io' }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Supported Languages

| Code | Language               |
| ---- | ---------------------- |
| `en` | English                |
| `zh` | 中文 (Chinese)         |
| `es` | Español (Spanish)      |
| `fr` | Français (French)      |
| `de` | Deutsch (German)       |
| `pt` | Português (Portuguese) |
| `ru` | Русский (Russian)      |
| `nl` | Nederlands (Dutch)     |
| `bg` | Български (Bulgarian)  |
| `ca` | Català (Catalan)       |
| `fa` | فارسی (Persian)        |
| `sk` | Slovenčina (Slovak)    |
| `uk` | Українська (Ukrainian) |

## Events Reference

### From React Native → WebView

| Event               | Purpose         | Data Format            |
| ------------------- | --------------- | ---------------------- |
| `rn:changeLanguage` | Change language | `{ language: string }` |

**Example:**

```typescript
window.dispatchEvent(
  new CustomEvent("rn:changeLanguage", {
    detail: { language: "zh" },
  }),
);
```

### From WebView → React Native

| Event             | Purpose            | Data Format                                          |
| ----------------- | ------------------ | ---------------------------------------------------- |
| `bridgeReady`     | Bridge initialized | `{ timestamp, supportedLanguages, currentLanguage }` |
| `languageChanged` | Language changed   | `{ language: string }`                               |

**Example Message:**

```json
{
  "type": "bridgeReady",
  "data": {
    "timestamp": 1701789123456,
    "supportedLanguages": ["en", "zh", "es", "fr", ...],
    "currentLanguage": "en"
  }
}
```

## Advanced Usage

### With Language Selector

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
];

function LanguageSelector({ currentLanguage, onLanguageChange }) {
  return (
    <View style={styles.selector}>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.button,
            currentLanguage === lang.code && styles.buttonActive,
          ]}
          onPress={() => onLanguageChange(lang.code)}
        >
          <Text
            style={[
              styles.text,
              currentLanguage === lang.code && styles.textActive,
            ]}
          >
            {lang.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  button: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  text: {
    color: '#000',
  },
  textActive: {
    color: '#fff',
  },
});
```

### With Loading State

```typescript
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);

  const handleLoadEnd = () => {
    setLoading(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'https://beancount.io' }}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
```

## Troubleshooting

### Bridge not responding

**Problem:** No messages received from webview

**Solution:**

1. Ensure `javaScriptEnabled={true}` on WebView
2. Add `onMessage` handler
3. Check console logs
4. Verify URL is correct

### Language not changing

**Problem:** Language doesn't change when command is sent

**Solution:**

1. Wait for `bridgeReady` message before sending commands
2. Verify language code is supported
3. Check that webview is fully loaded
4. Use `onLoadEnd` to detect when page is ready

### TypeScript errors

**Problem:** TypeScript complains about types

**Solution:**

```typescript
import { WebView, WebViewMessageEvent } from "react-native-webview";

const handleMessage = (event: WebViewMessageEvent) => {
  const data = JSON.parse(event.nativeEvent.data);
  // ...
};
```

## Best Practices

1. ✅ **Wait for bridgeReady** - Don't send commands before bridge initializes
2. ✅ **Handle errors** - Wrap JSON.parse in try-catch
3. ✅ **Save language** - Persist user's language choice
4. ✅ **Use TypeScript** - Type your message handlers
5. ✅ **Show loading** - Display spinner while page loads
6. ✅ **Enable JavaScript** - Set `javaScriptEnabled={true}`

## Security

- ✅ Use HTTPS URLs in production
- ✅ Validate language codes before sending
- ✅ Sanitize any user input
- ✅ Only communicate with trusted domains

## Environment Detection

The webview can detect if it's running in React Native:

```typescript
// In the webview (dashboard code)
import { useReactNativeContext } from "@/common/providers/ReactNativeBridgeProvider";

function MyComponent() {
  const { isReactNative } = useReactNativeContext();

  if (isReactNative) {
    return <MobileView />;
  }

  return <WebView />;
}
```

## Next Steps

- Check the complete example in `docs/examples/react-native-webview-example.tsx`
- See test files for more usage patterns
- Refer to React Native WebView docs for advanced configuration

## Support

For issues or questions:

- Check test files for examples
- Review the source code in `src/common/providers/ReactNativeBridgeProvider/`
- Consult React Native WebView documentation

---

**Last Updated:** 2025-12-05
**Version:** 1.0.0
**Status:** Production Ready ✅

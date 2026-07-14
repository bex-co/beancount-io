import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Text, StyleSheet, View, ActivityIndicator } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

let messageId = 0;
const getMessageId = () => {
  messageId++;
  return messageId.toString();
};

type ToastType = "success" | "error" | "text" | "loading";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: Omit<ToastMessage, "id">) => () => void;
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => () => {},
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

const MessageIcon = ({ type }: { type: ToastType }) => {
  if (type === "loading") {
    return <ActivityIndicator size="large" color="#fff" />;
  }
  if (type === "success") {
    return <Ionicons name="checkmark-circle" size={36} color="#fff" />;
  }
  if (type === "error") {
    return <Ionicons name="close-circle" size={36} color="#fff" />;
  }
  return null;
};

const Message = ({ message }: { message: ToastMessage }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
    >
      <View style={styles.message}>
        <MessageIcon type={message.type} />
        {message.type !== "text" ? <View style={styles.space} /> : null}
        <Text style={styles.messageText}>{message.message}</Text>
      </View>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const showToast = useCallback(
    (message: Omit<ToastMessage, "id">) => {
      const id = getMessageId();
      setMessages((prev) => [...prev, { id, ...message }]);
      setTimeout(() => {
        removeToast(id);
      }, message.duration || 2000);
      return () => removeToast(id);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toast}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageContainer}>
            <Message message={message} />
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    marginHorizontal: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  messageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  message: {
    // Fixed warm-charcoal pill (both themes); white text always reads on it.
    backgroundColor: "#26281f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    opacity: 0.9,
  },
  messageText: { color: "#fff", fontSize: 16, fontWeight: "400" },
  space: {
    height: 4,
  },
});

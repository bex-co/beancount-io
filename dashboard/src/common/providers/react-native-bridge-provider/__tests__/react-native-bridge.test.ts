import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initReactNativeBridge,
  isReactNative,
  postMessageToReactNative,
  RN_EVENTS,
  type ChangeLanguageDetail,
} from "../react-native-bridge";
import i18n from "@/i18n/init";

describe("react-native-bridge", () => {
  beforeEach(() => {
    // Reset i18n to English before each test
    i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initReactNativeBridge", () => {
    it("should initialize without errors", () => {
      expect(() => initReactNativeBridge()).not.toThrow();
    });

    it("should set up event listeners", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      initReactNativeBridge();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        RN_EVENTS.CHANGE_LANGUAGE,
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        RN_EVENTS.GET_LANGUAGE,
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        RN_EVENTS.GET_SUPPORTED_LANGUAGES,
        expect.any(Function),
      );
    });
  });

  describe("Change Language Event", () => {
    beforeEach(() => {
      initReactNativeBridge();
    });

    it("should change language when event is dispatched", async () => {
      const event = new CustomEvent<ChangeLanguageDetail>(
        RN_EVENTS.CHANGE_LANGUAGE,
        {
          detail: { language: "zh" },
        },
      );

      window.dispatchEvent(event);

      // Wait for async language change
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(i18n.language).toBe("zh");
    });

    it("should handle unsupported language gracefully", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const currentLanguage = i18n.language;

      const event = new CustomEvent<ChangeLanguageDetail>(
        RN_EVENTS.CHANGE_LANGUAGE,
        {
          detail: { language: "invalid-lang" },
        },
      );

      window.dispatchEvent(event);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(i18n.language).toBe(currentLanguage); // Should not change
    });
  });

  describe("Get Language Event", () => {
    beforeEach(() => {
      initReactNativeBridge();
    });

    it("should dispatch response with current language", () => {
      const responseSpy = vi.fn();
      window.addEventListener(
        `${RN_EVENTS.GET_LANGUAGE}:response`,
        responseSpy,
      );

      window.dispatchEvent(new Event(RN_EVENTS.GET_LANGUAGE));

      expect(responseSpy).toHaveBeenCalled();
      const event = responseSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toHaveProperty("language");
    });
  });

  describe("Get Supported Languages Event", () => {
    beforeEach(() => {
      initReactNativeBridge();
    });

    it("should dispatch response with supported languages", () => {
      const responseSpy = vi.fn();
      window.addEventListener(
        `${RN_EVENTS.GET_SUPPORTED_LANGUAGES}:response`,
        responseSpy,
      );

      window.dispatchEvent(new Event(RN_EVENTS.GET_SUPPORTED_LANGUAGES));

      expect(responseSpy).toHaveBeenCalled();
      const event = responseSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toHaveProperty("languages");
      expect(Array.isArray(event.detail.languages)).toBe(true);
    });
  });

  describe("isReactNative", () => {
    it("should return false in test environment", () => {
      expect(isReactNative()).toBe(false);
    });

    it("should return true when ReactNativeWebView exists", () => {
      // @ts-expect-error - Mocking ReactNativeWebView
      window.ReactNativeWebView = { postMessage: vi.fn() };

      expect(isReactNative()).toBe(true);

      // Cleanup
      // @ts-expect-error - Cleaning up mock
      delete window.ReactNativeWebView;
    });
  });

  describe("postMessageToReactNative", () => {
    it("should not throw when not in React Native", () => {
      expect(() => {
        postMessageToReactNative("test", { data: "test" });
      }).not.toThrow();
    });

    it("should call ReactNativeWebView.postMessage when available", () => {
      const postMessageMock = vi.fn();
      // @ts-expect-error - Mocking ReactNativeWebView
      window.ReactNativeWebView = { postMessage: postMessageMock };

      postMessageToReactNative("testType", { testData: "value" });

      expect(postMessageMock).toHaveBeenCalledWith(
        JSON.stringify({
          type: "testType",
          data: { testData: "value" },
        }),
      );

      // Cleanup
      // @ts-expect-error - Cleaning up mock
      delete window.ReactNativeWebView;
    });
  });

  describe("postMessageToReactNative", () => {
    it("should post message with correct format when ReactNativeWebView exists", () => {
      const postMessageMock = vi.fn();
      // @ts-expect-error - Mocking ReactNativeWebView
      window.ReactNativeWebView = { postMessage: postMessageMock };

      postMessageToReactNative("languageChanged", { language: "fr" });

      expect(postMessageMock).toHaveBeenCalledWith(
        JSON.stringify({
          type: "languageChanged",
          data: { language: "fr" },
        }),
      );

      // Cleanup
      // @ts-expect-error - Cleaning up mock
      delete window.ReactNativeWebView;
    });
  });

  describe("Bridge Ready Notification", () => {
    it("should post bridgeReady message when running in React Native", () => {
      const postMessageMock = vi.fn();
      // @ts-expect-error - Mocking ReactNativeWebView
      window.ReactNativeWebView = { postMessage: postMessageMock };

      initReactNativeBridge();

      // Find the bridgeReady message call
      const bridgeReadyCall = postMessageMock.mock.calls.find((call) => {
        const message = JSON.parse(call[0]);
        return message.type === "bridgeReady";
      });

      expect(bridgeReadyCall).toBeDefined();

      const message = JSON.parse(bridgeReadyCall[0]);
      expect(message).toHaveProperty("type", "bridgeReady");
      expect(message.data).toHaveProperty("timestamp");
      expect(message.data).toHaveProperty("supportedLanguages");
      expect(message.data).toHaveProperty("currentLanguage");
      expect(Array.isArray(message.data.supportedLanguages)).toBe(true);
      expect(typeof message.data.timestamp).toBe("number");

      // Cleanup
      // @ts-expect-error - Cleaning up mock
      delete window.ReactNativeWebView;
    });

    it("should not post bridgeReady message when not in React Native", () => {
      const postMessageMock = vi.fn();

      // Ensure ReactNativeWebView does not exist
      // @ts-expect-error - Cleaning up mock
      delete window.ReactNativeWebView;

      initReactNativeBridge();

      expect(postMessageMock).not.toHaveBeenCalled();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { formatRelativeTime } from "../format-relative-time";
import { defaultDateLocale, loadDateLocale } from "../date-locale";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import { RepositoryListItem } from "@/features/user-profile/components/repository-list-item";
import { Calendar } from "@/common/components/ui/calendar";

vi.unmock("react-i18next");

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats English and Chinese relative ages for the same instant", async () => {
    const sixDaysAgo = new Date("2026-09-02T12:00:00.000Z");
    const zh = await loadDateLocale("zh");
    expect(formatRelativeTime(sixDaysAgo, defaultDateLocale)).toBe(
      "6 days ago",
    );
    expect(formatRelativeTime(sixDaysAgo, zh)).toBe("6 天前");
  });

  it("formats another supported locale and a future timestamp", async () => {
    const ja = await loadDateLocale("ja");
    const future = new Date("2026-09-10T12:00:00.000Z");
    expect(formatRelativeTime(future, ja)).toMatch(/後|in/);
    expect(formatRelativeTime(future, defaultDateLocale)).toBe("in 2 days");
  });
});

describe("localization date locale", () => {
  it("loads date locales for every supported language without sharing instances", async () => {
    const a = createLocalization();
    const b = createLocalization();
    await Promise.all([a.changeLanguage("zh"), b.changeLanguage("de")]);
    expect(a.getDateLocale().code).toBe("zh-CN");
    expect(b.getDateLocale().code).toBe("de");
    expect(a.getDateLocale()).not.toBe(b.getDateLocale());
  });

  it("keeps the previous date locale when a later English choice supersedes zh", async () => {
    const locale = createLocalization();
    const first = locale.changeLanguage("zh");
    const last = locale.changeLanguage("en");
    expect(await first).toBe(false);
    expect(await last).toBe(true);
    expect(locale.i18n.language).toBe("en");
    expect(locale.getDateLocale().code).toBe("en-US");
  });

  it("maps every supported language to a loadable date locale", async () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const loaded = await loadDateLocale(language);
      expect(loaded.formatDistance).toBeTypeOf("function");
    }
  });
});

describe("localized relative time in UI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Chinese relative ages when the app language is zh", async () => {
    const localization = createLocalization();
    await localization.changeLanguage("zh");
    render(
      <LocalizationProvider localization={localization}>
        <RepositoryListItem
          name="demo"
          fullName="user/demo"
          isPrivate={false}
          updatedAt="2026-09-02T12:00:00.000Z"
          ownerUsername="user"
        />
      </LocalizationProvider>,
    );
    expect(screen.getByText(/6 天前/)).toBeInTheDocument();
    expect(screen.queryByText(/ago/i)).not.toBeInTheDocument();
  });

  it("renders English relative ages when the app language is en", async () => {
    const localization = createLocalization();
    render(
      <LocalizationProvider localization={localization}>
        <RepositoryListItem
          name="demo"
          fullName="user/demo"
          isPrivate={false}
          updatedAt="2026-09-02T12:00:00.000Z"
          ownerUsername="user"
        />
      </LocalizationProvider>,
    );
    expect(screen.getByText(/6 days ago/)).toBeInTheDocument();
  });
});

describe("Calendar active locale", () => {
  it("uses Chinese weekday and month names under active zh", async () => {
    const localization = createLocalization();
    await localization.changeLanguage("zh");
    const selected = new Date(2026, 8, 15);
    render(
      <LocalizationProvider localization={localization}>
        <Calendar mode="single" selected={selected} month={selected} />
      </LocalizationProvider>,
    );
    expect(screen.getByText("2026年9月")).toBeInTheDocument();
    expect(screen.getByText("一")).toBeInTheDocument();
    expect(screen.getByLabelText("前往下个月")).toBeInTheDocument();
    expect(screen.queryByText("September 2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Su")).not.toBeInTheDocument();
  });

  it("keeps English calendar chrome under active en", async () => {
    const localization = createLocalization();
    const selected = new Date(2026, 8, 15);
    render(
      <LocalizationProvider localization={localization}>
        <Calendar mode="single" selected={selected} month={selected} />
      </LocalizationProvider>,
    );
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(screen.getByText("Su")).toBeInTheDocument();
  });
});

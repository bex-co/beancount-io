import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UserProfilePage from "../user-profile-page";

/**
 * w4/150: at 320px the Russian profile scrolled sideways —
 * `document.documentElement.scrollWidth` was 363 against a 320px viewport.
 * The overflow came from one control, the copy-link button, whose label
 * ("Копировать ссылку") is far longer than the English one.
 *
 * The cause is a contract, not a pixel count: `Button` ships
 * `whitespace-nowrap`, and a flex item's default `min-width: auto` refuses to
 * shrink below its min-content width. Together they make a long label a floor
 * on the width of the whole page. jsdom cannot measure layout, so this suite
 * asserts the contract the layout depends on — the action controls may shrink
 * and their labels may wrap — which is exactly what the fix restores.
 */

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ username: "open_ledger" }),
  useSearch: () => ({}),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}));

vi.mock("../../hooks/use-user-profile", () => ({
  useUserProfile: () => ({
    profile: {
      username: "open_ledger",
      fullName: "Open Ledger",
      avatarUrl: null,
      bio: null,
      location: null,
      website: null,
      created: "2024-01-01T00:00:00Z",
      followersCount: 165,
      followingCount: 1,
      starredReposCount: 0,
    },
    isFollowing: false,
    activities: [],
    repositories: [],
    isInitialLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

// An anonymous reader is not the profile's owner, so both action controls
// render — the case the note reproduced.
vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => ({ userProfile: null }),
}));

vi.mock("@/common/hooks/use-translations", async () => {
  const { default: ru } = await import("@/i18n/locales/ru");
  return {
    useTranslations: () => ({
      t: (key: string) => ru[key] ?? key,
      i18n: { language: "ru" },
    }),
  };
});

vi.mock("../../components/user-profile-tabs", () => ({
  UserProfileTabs: () => null,
}));
vi.mock("../../components/user-profile-header", () => ({
  UserProfileHeader: () => null,
}));
vi.mock("../../components/follow-button", () => ({
  FollowButton: ({ className }: { className?: string }) => (
    <button type="button" className={className}>
      Подписаться
    </button>
  ),
}));

afterEach(cleanup);

function actionButtons() {
  const copy = screen.getByRole("button", { name: "Копировать ссылку" });
  const follow = screen.getByRole("button", { name: "Подписаться" });
  return { copy, follow, row: copy.parentElement as HTMLElement };
}

describe("profile actions survive a 320px viewport", () => {
  it("keeps the copy-link control's full label as its accessible name", () => {
    render(<UserProfilePage />);
    // Shrinking must not be paid for by truncating the label to a fragment.
    expect(
      screen.getByRole("button", { name: "Копировать ссылку" }),
    ).toBeInTheDocument();
  });

  it("lets both action controls shrink below their label width", () => {
    render(<UserProfilePage />);
    const { copy, follow } = actionButtons();
    // Without min-w-0 a flex item's min-width is min-content, so the label
    // sets the page's minimum width.
    expect(copy.className).toContain("min-w-0");
    expect(follow.className).toContain("min-w-0");
  });

  it("lets the labels wrap instead of forcing one line", () => {
    render(<UserProfilePage />);
    const { copy, follow } = actionButtons();
    expect(copy.className).toContain("whitespace-normal");
    expect(follow.className).toContain("whitespace-normal");
  });

  it("does not pin the controls to a fixed height that would clip a wrapped label", () => {
    render(<UserProfilePage />);
    const { copy, follow } = actionButtons();
    for (const el of [copy, follow]) {
      expect(el.className).toContain("min-h-11");
      // `h-11` and `min-h-11` both match /h-11/, so assert on the exact token.
      expect(el.className.split(/\s+/)).not.toContain("h-11");
    }
  });

  it("still lets the controls share the row on narrow widths and size to content on desktop", () => {
    render(<UserProfilePage />);
    const { copy, follow } = actionButtons();
    for (const el of [copy, follow]) {
      expect(el.className.split(/\s+/)).toContain("flex-1");
      expect(el.className.split(/\s+/)).toContain("md:flex-none");
    }
  });

  it("keeps both controls in one row so the fix is about width, not stacking", () => {
    render(<UserProfilePage />);
    const { copy, follow, row } = actionButtons();
    expect(row).toContainElement(copy);
    expect(row).toContainElement(follow);
    expect(row.className.split(/\s+/)).toContain("flex");
  });
});

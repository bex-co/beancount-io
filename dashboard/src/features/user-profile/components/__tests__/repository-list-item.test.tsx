import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RepositoryListItem } from "../repository-list-item";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a
      href={`${to}/${params?.ledgerOwner || ""}/${params?.ledgerName || ""}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

// Mock useTranslations hook
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userProfile.private": "Private",
        "userProfile.public": "Public",
        "userProfile.updated": "Updated",
      };
      return translations[key] || key;
    },
  }),
}));

describe("RepositoryListItem", () => {
  describe("Rendering", () => {
    it("should render repository name", () => {
      render(
        <RepositoryListItem
          name="my-ledger"
          fullName="johndoe/my-ledger"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="johndoe"
        />,
      );

      expect(screen.getByText("my-ledger")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(
        <RepositoryListItem
          name="my-ledger"
          fullName="johndoe/my-ledger"
          description="Personal finance tracking"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="johndoe"
        />,
      );

      expect(screen.getByText("Personal finance tracking")).toBeInTheDocument();
    });

    it("should not render description section when description is null", () => {
      const { container } = render(
        <RepositoryListItem
          name="my-ledger"
          fullName="johndoe/my-ledger"
          description={null}
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="johndoe"
        />,
      );

      // CardContent should not be rendered when description is null
      const cardContent = container.querySelector(
        ".text-sm.text-muted-foreground.mb-2",
      );
      expect(cardContent).not.toBeInTheDocument();
    });
  });

  describe("Privacy Badge", () => {
    it("should render public badge for public repositories", () => {
      render(
        <RepositoryListItem
          name="public-repo"
          fullName="user/public-repo"
          description="A public repository"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("Public")).toBeInTheDocument();
    });

    it("should render private badge for private repositories", () => {
      render(
        <RepositoryListItem
          name="private-repo"
          fullName="user/private-repo"
          description="A private repository"
          isPrivate={true}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("Private")).toBeInTheDocument();
    });
  });

  describe("Stars Count", () => {
    it("should display stars count when greater than 0", () => {
      render(
        <RepositoryListItem
          name="popular-repo"
          fullName="user/popular-repo"
          description="Very popular"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={42}
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should not display stars count when 0", () => {
      render(
        <RepositoryListItem
          name="new-repo"
          fullName="user/new-repo"
          description="New repository"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={0}
          ownerUsername="user"
        />,
      );

      // Stars count should not be visible
      const starsElement = screen.queryByText("0");
      expect(starsElement).not.toBeInTheDocument();
    });

    it("should not display stars count when null", () => {
      render(
        <RepositoryListItem
          name="no-stars-repo"
          fullName="user/no-stars-repo"
          description="Repository without stars data"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={null}
          ownerUsername="user"
        />,
      );

      // No stars icon should be present
      const container = screen
        .getByText("Repository without stars data")
        .closest(".cursor-pointer");
      const svgElements = container?.querySelectorAll("svg");
      expect(svgElements?.length).toBe(0);
    });

    it("should display large stars count correctly", () => {
      render(
        <RepositoryListItem
          name="viral-repo"
          fullName="user/viral-repo"
          description="Extremely popular"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={10000}
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("10000")).toBeInTheDocument();
    });
  });

  describe("Updated Timestamp", () => {
    it("should render updated timestamp", () => {
      render(
        <RepositoryListItem
          name="recent-repo"
          fullName="user/recent-repo"
          description="A test repository"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      // Check for the "Updated" label in timestamp span
      expect(screen.getByText(/Updated.*ago/i)).toBeInTheDocument();
    });

    it("should format timestamp with date-fns", () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2);

      render(
        <RepositoryListItem
          name="recent-repo"
          fullName="user/recent-repo"
          description="Recently updated"
          isPrivate={false}
          updatedAt={recentDate.toISOString()}
          ownerUsername="user"
        />,
      );

      // Should show relative time like "2 hours ago"
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });
  });

  describe("Link Behavior", () => {
    it("should render as a link to ledger page", () => {
      const { container } = render(
        <RepositoryListItem
          name="my-ledger"
          fullName="johndoe/my-ledger"
          description="Personal finance"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="johndoe"
        />,
      );

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
    });

    it("should have hover effect classes", () => {
      const { container } = render(
        <RepositoryListItem
          name="test-repo"
          fullName="user/test-repo"
          description="Test"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      const card = container.querySelector(".cursor-pointer");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("hover:border-foreground/20");
    });
  });

  describe("Edge Cases", () => {
    it("should handle repository with no description", () => {
      render(
        <RepositoryListItem
          name="minimal-repo"
          fullName="user/minimal-repo"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("minimal-repo")).toBeInTheDocument();
      // Should not render CardContent without description
      expect(screen.queryByText("Public")).not.toBeInTheDocument();
    });

    it("should handle long repository name", () => {
      const longName = "a".repeat(100);
      render(
        <RepositoryListItem
          name={longName}
          fullName={`user/${longName}`}
          description="Test"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle long description", () => {
      const longDescription = "Lorem ipsum dolor sit amet, ".repeat(20);
      const { container } = render(
        <RepositoryListItem
          name="test-repo"
          fullName="user/test-repo"
          description={longDescription}
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      // Check that the description element exists (may be truncated by CSS)
      const descElement = container.querySelector(
        ".text-sm.text-muted-foreground.mb-2",
      );
      expect(descElement).toBeInTheDocument();
      expect(descElement?.textContent).toContain("Lorem ipsum");
    });

    it("should handle special characters in name", () => {
      render(
        <RepositoryListItem
          name="test-repo_123"
          fullName="user/test-repo_123"
          description="Test"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("test-repo_123")).toBeInTheDocument();
    });
  });

  describe("Complete Repository Data", () => {
    it("should render all fields when provided", () => {
      render(
        <RepositoryListItem
          name="complete-repo"
          fullName="user/complete-repo"
          description="Full repository with all fields"
          isPrivate={false}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={100}
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("complete-repo")).toBeInTheDocument();
      expect(
        screen.getByText("Full repository with all fields"),
      ).toBeInTheDocument();
      expect(screen.getByText("Public")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    });

    it("should render private repository with all fields", () => {
      render(
        <RepositoryListItem
          name="secret-repo"
          fullName="user/secret-repo"
          description="Private repository"
          isPrivate={true}
          updatedAt="2024-01-15T10:00:00Z"
          starsCount={5}
          ownerUsername="user"
        />,
      );

      expect(screen.getByText("secret-repo")).toBeInTheDocument();
      expect(screen.getByText("Private repository")).toBeInTheDocument();
      expect(screen.getByText("Private")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });
});

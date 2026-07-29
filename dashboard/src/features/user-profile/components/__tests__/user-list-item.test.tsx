import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserListItem } from "../user-list-item";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={`${to}/${params?.username || ""}`} {...props}>
      {children}
    </a>
  ),
}));

describe("UserListItem", () => {
  describe("Rendering", () => {
    it("should render username", () => {
      render(<UserListItem username="johndoe" />);

      expect(screen.getByText("@johndoe")).toBeInTheDocument();
    });

    it("should render full name when provided", () => {
      render(<UserListItem username="johndoe" fullName="John Doe" />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render username when full name is null", () => {
      render(<UserListItem username="johndoe" fullName={null} />);

      // Should display username as the display name
      expect(screen.getByText("johndoe")).toBeInTheDocument();
      expect(screen.getByText("@johndoe")).toBeInTheDocument();
    });

    it("should render bio when provided", () => {
      render(
        <UserListItem
          username="developer"
          bio="Software engineer at Beancount"
        />,
      );

      expect(
        screen.getByText("Software engineer at Beancount"),
      ).toBeInTheDocument();
    });

    it("should not render bio section when bio is null", () => {
      const { container } = render(
        <UserListItem username="developer" bio={null} />,
      );

      // Bio text should not be in the document
      const bioElements = container.querySelectorAll(".line-clamp-2");
      expect(bioElements).toHaveLength(0);
    });
  });

  describe("Avatar", () => {
    it("should render avatar image when avatarUrl is provided", () => {
      const { container } = render(
        <UserListItem
          username="johndoe"
          avatarUrl="https://example.com/avatar.jpg"
        />,
      );

      // Check that Avatar component is present
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it("should render fallback when avatarUrl is null", () => {
      render(<UserListItem username="johndoe" avatarUrl={null} />);

      // Fallback should show first letter of username
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should render fallback with capitalized first letter", () => {
      render(<UserListItem username="alice" avatarUrl={null} />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });
  });

  describe("Link Behavior", () => {
    it("should render as a link to user profile", () => {
      const { container } = render(<UserListItem username="developer123" />);

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
    });

    it("should have hover effect classes", () => {
      const { container } = render(<UserListItem username="test" />);

      const card = container.querySelector(".cursor-pointer");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("hover:border-foreground/20");
    });
  });

  describe("Edge Cases", () => {
    it("should handle long username", () => {
      const longUsername = "a".repeat(100);
      render(<UserListItem username={longUsername} />);

      expect(screen.getByText(`@${longUsername}`)).toBeInTheDocument();
    });

    it("should handle long bio with line clamp", () => {
      const longBio = "Lorem ipsum dolor sit amet, ".repeat(20);
      const { container } = render(
        <UserListItem username="test" bio={longBio} />,
      );

      const bioElement = container.querySelector(".line-clamp-2");
      expect(bioElement).toBeInTheDocument();
    });

    it("should handle special characters in username", () => {
      render(<UserListItem username="test-user_123" />);

      expect(screen.getByText("@test-user_123")).toBeInTheDocument();
    });

    it("should handle special characters in full name", () => {
      render(<UserListItem username="test" fullName="José García-López" />);

      expect(screen.getByText("José García-López")).toBeInTheDocument();
    });
  });

  describe("Complete User Data", () => {
    it("should render all fields when provided", () => {
      const { container } = render(
        <UserListItem
          username="completeuser"
          fullName="Complete User"
          avatarUrl="https://example.com/complete.jpg"
          bio="Full profile with all fields"
        />,
      );

      expect(screen.getByText("Complete User")).toBeInTheDocument();
      expect(screen.getByText("@completeuser")).toBeInTheDocument();
      expect(
        screen.getByText("Full profile with all fields"),
      ).toBeInTheDocument();
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });
  });
});

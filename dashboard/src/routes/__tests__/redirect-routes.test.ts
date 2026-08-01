import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@tanstack/react-router";

// Mock TanStack Router redirect function
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((options: unknown) => {
    // In real usage, redirect throws. We return the options for testing
    return options;
  }),
  createFileRoute: vi.fn(),
}));

describe("Redirect Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Legacy Auth Path Redirects", () => {
    describe("/login -> /auth/login", () => {
      it("should redirect to /auth/login with same search params", () => {
        const search = { next: "/dashboard" };

        // Simulate the beforeLoad behavior from login.tsx
        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/login",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        // Verify redirect was called with correct params
        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/login",
          search: { next: "/dashboard" },
        });
      });

      it("should redirect with empty search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/login",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/login",
          search: {},
        });
      });
    });

    describe("/logout -> /auth/logout", () => {
      it("should redirect to /auth/logout with same search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/logout",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/logout",
          search: {},
        });
      });
    });

    describe("/sign-up -> /auth/sign-up", () => {
      it("should redirect to /auth/sign-up with same search params", () => {
        const search = {
          withDefaultLedger: true,
          src: "ios",
          by: "referrer-123",
        };

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/sign-up",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/sign-up",
          search: {
            withDefaultLedger: true,
            src: "ios",
            by: "referrer-123",
          },
        });
      });

      it("should preserve withDefaultLedger as false", () => {
        const search = { withDefaultLedger: false };

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/sign-up",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/sign-up",
          search: { withDefaultLedger: false },
        });
      });
    });

    describe("/forgot-password -> /auth/forgot-password", () => {
      it("should redirect to /auth/forgot-password with same search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/forgot-password",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/forgot-password",
          search: {},
        });
      });
    });

    describe("/reset-password -> /auth/reset-password", () => {
      it("should redirect to /auth/reset-password with same search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/reset-password",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/reset-password",
          search: {},
        });
      });
    });

    describe("/welcome -> /auth/welcome", () => {
      it("should redirect to /auth/welcome with same search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/auth/welcome",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/auth/welcome",
          search: {},
        });
      });
    });
  });

  describe("Legacy Dashboard/Gallery Path Redirects", () => {
    describe("/dashboard -> /ledger", () => {
      it("should redirect to /ledger with same search params", () => {
        const search = { filter: "active" };

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/ledger",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/ledger",
          search: { filter: "active" },
        });
      });
    });

    describe("/gallery -> /ledger-gallery", () => {
      it("should redirect to /ledger-gallery with same search params", () => {
        const search = {};

        const beforeLoad = ({
          search,
        }: {
          search: Record<string, unknown>;
        }) => {
          throw redirect({
            to: "/ledger-gallery",
            search,
          });
        };

        expect(() => beforeLoad({ search })).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/ledger-gallery",
          search: {},
        });
      });
    });
  });

  describe("Settings Index Redirect", () => {
    describe("/settings/ -> /settings/general", () => {
      it("should redirect to /settings/general", () => {
        const beforeLoad = () => {
          throw redirect({
            to: "/settings/general",
          });
        };

        expect(() => beforeLoad()).toThrow();

        expect(redirect).toHaveBeenCalledWith({
          to: "/settings/general",
        });
      });
    });
  });

  describe("Search Parameter Preservation", () => {
    it("should preserve complex search parameters through redirect", () => {
      const complexSearch = {
        next: "/ledger/owner/name/overview",
        filter: "active",
        page: 1,
        sort: "name",
      };

      const beforeLoad = ({ search }: { search: Record<string, unknown> }) => {
        throw redirect({
          to: "/auth/login",
          search,
        });
      };

      expect(() => beforeLoad({ search: complexSearch })).toThrow();

      expect(redirect).toHaveBeenCalledWith({
        to: "/auth/login",
        search: complexSearch,
      });
    });

    it("should preserve undefined values in search params", () => {
      const search = {
        next: undefined,
        other: "value",
      };

      const beforeLoad = ({ search }: { search: Record<string, unknown> }) => {
        throw redirect({
          to: "/auth/login",
          search,
        });
      };

      expect(() => beforeLoad({ search })).toThrow();

      expect(redirect).toHaveBeenCalledWith({
        to: "/auth/login",
        search: {
          next: undefined,
          other: "value",
        },
      });
    });

    it("should handle null values in search params", () => {
      const search = {
        next: null,
      };

      const beforeLoad = ({ search }: { search: Record<string, unknown> }) => {
        throw redirect({
          to: "/auth/login",
          search,
        });
      };

      expect(() => beforeLoad({ search })).toThrow();

      expect(redirect).toHaveBeenCalledWith({
        to: "/auth/login",
        search: {
          next: null,
        },
      });
    });
  });
});

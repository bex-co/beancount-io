import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryView } from "../query-view";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

describe("QueryView", () => {
  describe("loading state", () => {
    it("renders custom loadingSlot when loading", () => {
      render(
        <QueryView loading={true} data={null}>
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.queryByText("data")).toBeNull();
    });

    it("renders custom loadingSlot when provided", () => {
      render(
        <QueryView
          loading={true}
          data={null}
          loadingSlot={<div>custom skeleton</div>}
        >
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.getByText("custom skeleton")).toBeTruthy();
    });
  });

  describe("error state", () => {
    it("renders error state when error is present", () => {
      render(
        <QueryView loading={false} error={new Error("boom")} data={null}>
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.queryByText("data")).toBeNull();
    });

    it("does not render error state when error is null", () => {
      render(
        <QueryView loading={false} error={null} data={["item"]}>
          {(d) => <div>{d[0]}</div>}
        </QueryView>,
      );
      expect(screen.getByText("item")).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("renders emptySlot when data is null", () => {
      render(
        <QueryView
          loading={false}
          data={null}
          emptySlot={<div>nothing here</div>}
        >
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.getByText("nothing here")).toBeTruthy();
      expect(screen.queryByText("data")).toBeNull();
    });

    it("renders emptySlot when isEmpty returns true", () => {
      render(
        <QueryView
          loading={false}
          data={[]}
          isEmpty={(d) => d.length === 0}
          emptySlot={<div>empty list</div>}
        >
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.getByText("empty list")).toBeTruthy();
    });

    it("renders children when isEmpty returns false", () => {
      render(
        <QueryView
          loading={false}
          data={["a"]}
          isEmpty={(d) => d.length === 0}
          emptySlot={<div>empty list</div>}
        >
          {(d) => <div>{d[0]}</div>}
        </QueryView>,
      );
      expect(screen.getByText("a")).toBeTruthy();
      expect(screen.queryByText("empty list")).toBeNull();
    });

    it("returns null when data is null and no emptySlot", () => {
      const { container } = render(
        <QueryView loading={false} data={null}>
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(container.textContent).toBe("");
    });
  });

  describe("data state", () => {
    it("passes data to children render prop", () => {
      render(
        <QueryView loading={false} data={{ name: "hello" }}>
          {(d) => <div>{d.name}</div>}
        </QueryView>,
      );
      expect(screen.getByText("hello")).toBeTruthy();
    });

    it("renders children for array data", () => {
      render(
        <QueryView loading={false} data={["x", "y"]}>
          {(d) => (
            <ul>
              {d.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </QueryView>,
      );
      expect(screen.getByText("x")).toBeTruthy();
      expect(screen.getByText("y")).toBeTruthy();
    });
  });

  describe("priority", () => {
    it("loading takes priority over error", () => {
      render(
        <QueryView
          loading={true}
          error={new Error("oops")}
          data={null}
          loadingSlot={<div>loading</div>}
        >
          {() => <div>data</div>}
        </QueryView>,
      );
      expect(screen.getByText("loading")).toBeTruthy();
    });
  });
});

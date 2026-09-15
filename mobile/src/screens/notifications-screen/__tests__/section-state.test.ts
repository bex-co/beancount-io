import fs from "fs";
import path from "path";
import { selectSectionsPending } from "../section-state";

describe("selectSectionsPending", () => {
  it("keeps the errors section pending while its query is out, even once commits landed", () => {
    expect(
      selectSectionsPending({
        errorsLoaded: false,
        commitsLoading: false,
        commitsLoaded: true,
      }),
    ).toEqual({ errorsPending: true, commitsPending: false });
  });

  it("does not hold the commits skeleton for the errors query", () => {
    expect(
      selectSectionsPending({
        errorsLoaded: true,
        commitsLoading: true,
        commitsLoaded: false,
      }),
    ).toEqual({ errorsPending: false, commitsPending: true });
  });

  it("keeps loaded sections on screen during a background refetch", () => {
    expect(
      selectSectionsPending({
        errorsLoaded: true,
        commitsLoading: true,
        commitsLoaded: true,
      }),
    ).toEqual({ errorsPending: false, commitsPending: false });
  });
});

/**
 * Static guardrail over the screen, which the unit runner cannot render: a
 * pull refreshes both queries, and no shared first-load flag gates the errors
 * section on the commits result.
 */
describe("Notifications screen wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "notifications-screen.tsx"),
    "utf8",
  );

  it("refetches the ledger errors as well as the commits on pull to refresh", () => {
    expect(
      source.includes(
        "await Promise.all([refetchCommits(), refetchErrors()]);",
      ),
    ).toBe(true);
  });

  it("gates each section on its own pending state", () => {
    expect(source.includes("isFirstLoad")).toBe(false);
    expect(source.includes("{errorsPending ? (")).toBe(true);
    expect(source.includes("{commitsPending ? (")).toBe(true);
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CliAuthCodeEntryView } from "../cli-auth-code-entry-view";
import { CliAuthStatus } from "@/graphql/definitions";
import DeviceAuthPage from "../index";

// PageSEO reads the router location, which these tests do not provide.
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getCliAuthRequest: {
        status: CliAuthStatus.Pending,
        client: {
          name: "bea",
          version: "0.0.0",
          deviceLabel: "Synthetic terminal",
          platform: null,
          ipAddress: null,
        },
      },
    },
  }),
  useMutation: () => [vi.fn(), { loading: false }],
}));

describe("device authorization page outline (w5/1163)", () => {
  it("names the code entry page with one main and one h1", () => {
    render(<DeviceAuthPage />);
    const main = screen.getByRole("main");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Authorize a device",
      }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole("textbox", { name: "One-time code" }),
    ).toBeInTheDocument();
  });

  it("names the consent page with one main and one h1 after an accepted code", async () => {
    const user = userEvent.setup();
    render(<DeviceAuthPage />);
    await user.type(
      screen.getByRole("textbox", { name: "One-time code" }),
      "CBTW-74V6",
    );
    expect(await screen.findByText("Synthetic terminal")).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Authorize CLI Access",
      }),
    ).toBeInTheDocument();
  });
});

function renderView() {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<CliAuthCodeEntryView onSubmit={onSubmit} />);
  const input = screen.getByLabelText("One-time code");
  return { onSubmit, user, input };
}

async function blurInput(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
) {
  await user.click(
    screen.getByText("Enter the one-time code shown in your terminal."),
  );
  expect(input).not.toHaveFocus();
}

describe("CliAuthCodeEntryView", () => {
  it("continues on its own once the code is complete", async () => {
    const { onSubmit, user, input } = renderView();

    await user.type(input, "cbtw74v");
    expect(input).toHaveValue("CBTW-74V");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(input, "6");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("CBTW-74V6");
  });

  it("accepts a code typed with its hyphen", async () => {
    const { onSubmit, user, input } = renderView();

    await user.type(input, "CBTW-74V6");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("CBTW-74V6");
  });

  it("captures a code typed while the input is not focused", async () => {
    const { onSubmit, user, input } = renderView();
    await blurInput(user, input);

    await user.keyboard("cbtw");
    expect(input).toHaveValue("CBTW");
    expect(input).toHaveFocus();

    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("CBT");

    await user.keyboard("w74v6");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("CBTW-74V6");
  });

  it("captures a code pasted while the input is not focused", async () => {
    const { onSubmit, user, input } = renderView();
    await blurInput(user, input);

    fireEvent.paste(document.body, {
      clipboardData: { getData: () => "  Your code: cbtw-74v6\n" },
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("CBTW-74V6");
  });

  it("replaces a partial entry when a whole code is pasted into the input", async () => {
    const { onSubmit, user, input } = renderView();
    await user.type(input, "CB");

    fireEvent.paste(input, {
      clipboardData: { getData: () => "CBTW-74V6" },
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("CBTW-74V6");
  });

  it("keeps modified shortcuts for the browser", async () => {
    const { user, input } = renderView();
    await blurInput(user, input);

    await user.keyboard("{Control>}a{/Control}{Meta>}r{/Meta}");

    expect(input).toHaveValue("");
  });

  it("explains an incomplete code instead of continuing", async () => {
    const { onSubmit, user, input } = renderView();
    await user.type(input, "CBTW");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Enter the 8-character code shown in your terminal."),
    ).toBeInTheDocument();
  });
});

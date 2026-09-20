import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "../index";

/**
 * The server renders this form enabled, so on a slow load a reader can type a
 * username before the page hydrates. react-hook-form assigns `defaultValues`
 * to the DOM node the moment the field's ref registers, which replaced that
 * text with a generated `un_…` name. First Name has no default and was never
 * affected, which is why the loss looked arbitrary.
 *
 * These cases hydrate real server markup over a real react-hook-form, rather
 * than asserting on `defaultValues`, so the ordering under test is the one
 * that actually ran in the browser.
 */

function serverMarkup(defaultUsername: string, hideUsername = false) {
  return renderToString(
    <RegisterForm
      onSubmit={vi.fn()}
      isLoading={false}
      serverError=""
      defaultUsername={defaultUsername}
      hideUsername={hideUsername}
      showSignInLink={false}
    />,
  );
}

/**
 * Serves the form, optionally lets the reader type into it, then hydrates —
 * the same sequence a slow first load produces.
 */
function hydrateAfter(
  typed: string | null,
  { defaultUsername = "un_generated1", hideUsername = false } = {},
) {
  const container = document.createElement("div");
  container.innerHTML = serverMarkup(defaultUsername, hideUsername);
  document.body.appendChild(container);

  const served = container.querySelector<HTMLInputElement>(
    'input[name="username"]',
  );
  if (typed !== null) {
    expect(served, "the server must render the username field").not.toBeNull();
    served!.value = typed;
  }

  render(
    <RegisterForm
      onSubmit={vi.fn()}
      isLoading={false}
      serverError=""
      defaultUsername={defaultUsername}
      hideUsername={hideUsername}
      showSignInLink={false}
    />,
    { container, hydrate: true },
  );

  return { container, served };
}

describe("a username typed before hydration", () => {
  it("survives hydration", () => {
    hydrateAfter("qa_hydration_reader");

    expect(screen.getByLabelText("Username")).toHaveValue(
      "qa_hydration_reader",
    );
  });

  it("is kept on the very node the reader typed into", () => {
    const { served } = hydrateAfter("qa_hydration_reader");

    expect(screen.getByLabelText("Username")).toBe(served);
    expect(served).toHaveValue("qa_hydration_reader");
  });

  it("is not replaced by the generated default", () => {
    hydrateAfter("qa_hydration_reader");

    expect(screen.getByLabelText("Username")).not.toHaveValue("un_generated1");
  });
});

describe("the generated default still applies", () => {
  it("fills an untouched field on hydration", () => {
    hydrateAfter(null);

    expect(screen.getByLabelText("Username")).toHaveValue("un_generated1");
  });

  it("fills a field the reader left empty", () => {
    hydrateAfter("");

    expect(screen.getByLabelText("Username")).toHaveValue("un_generated1");
  });

  it("still hides and keeps the generated name for consent flows", () => {
    const { container } = hydrateAfter(null, { hideUsername: true });

    expect(screen.queryByLabelText("Username")).toBeNull();
    expect(
      container.querySelector<HTMLInputElement>('input[name="username"]')
        ?.value,
    ).toBe("un_generated1");
  });
});

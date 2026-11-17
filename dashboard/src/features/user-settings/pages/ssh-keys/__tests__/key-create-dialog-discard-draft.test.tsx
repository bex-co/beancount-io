import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KeyCreateDialog } from "../key-create-dialog";

const { mutate, deferred } = vi.hoisted(() => {
  const deferred: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  const mutate = vi.fn(
    () => new Promise((resolve, reject) => deferred.push({ resolve, reject })),
  );
  return { mutate, deferred };
});

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mutate, { loading: false }],
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

function renderDialog() {
  return render(
    <>
      <p>Page behind</p>
      <KeyCreateDialog>
        <button type="button">New SSH key</button>
      </KeyCreateDialog>
    </>,
  );
}

const title = () => screen.getByLabelText("Key Title");
const publicKey = () => screen.getByLabelText("Public Key");
const keyDialog = () =>
  screen.queryByRole("dialog", { name: "Create New SSH Key" });
const confirm = () =>
  screen.queryByRole("dialog", { name: "Discard what you typed?" });

async function openAndType(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New SSH key" }));
  await user.type(title(), "laptop");
  await user.type(publicKey(), "ssh-ed25519 AAAAqa");
}

/**
 * A pasted public key vanished on Escape with no question, and Escape during
 * the write dismissed it before the key was added (w2/134).
 */
describe("New SSH key asks before discarding what was typed", () => {
  beforeEach(() => {
    mutate.mockClear();
    deferred.length = 0;
  });

  it("closes an untouched dialog at once", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "New SSH key" }));
    expect(keyDialog()).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(keyDialog()).toBeNull());
    expect(confirm()).toBeNull();
  });

  // Focus goes back to where it was when leaving was asked for.
  it.each([
    [
      "Escape",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard("{Escape}"),
      publicKey,
    ],
    [
      "Close",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: /^close$/i })),
      () => screen.getByRole("button", { name: /^close$/i }),
    ],
    [
      "Cancel",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: "Cancel" })),
      () => screen.getByRole("button", { name: "Cancel" }),
    ],
    [
      "an outside click",
      // Radix dismisses on a pointerdown outside its content; the page
      // behind a modal has pointer-events: none, so dispatch it directly.
      async () => {
        fireEvent.pointerDown(screen.getByText("Page behind"));
      },
      publicKey,
    ],
  ])(
    "asks on %s, and Keep editing keeps the draft",
    async (_exit, leave, focusTarget) => {
      const user = userEvent.setup();
      renderDialog();
      await openAndType(user);

      await leave(user);
      expect(
        await screen.findByRole("dialog", { name: "Discard what you typed?" }),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      await waitFor(() => expect(confirm()).toBeNull());
      expect(title()).toHaveValue("laptop");
      expect(publicKey()).toHaveValue("ssh-ed25519 AAAAqa");
      await waitFor(() => expect(focusTarget()).toHaveFocus());
    },
  );

  it("closes once the reader chooses Discard, and reopens empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await openAndType(user);
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(keyDialog()).toBeNull());

    await user.click(screen.getByRole("button", { name: "New SSH key" }));
    expect(title()).toHaveValue("");
    expect(publicKey()).toHaveValue("");
  });

  it("holds Escape while the key is being added, then closes without asking", async () => {
    const user = userEvent.setup();
    renderDialog();
    await openAndType(user);
    await user.click(screen.getByRole("button", { name: "Create Key" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    // The write is in flight: the draft is locked and stays in front.
    expect(title()).toBeDisabled();
    expect(screen.getByRole("button", { name: /^close$/i })).toBeDisabled();
    await user.keyboard("{Escape}");
    fireEvent.pointerDown(screen.getByText("Page behind"));
    expect(keyDialog()).toBeVisible();
    expect(confirm()).toBeNull();

    // A second submit sends nothing while the first is pending.
    fireEvent.submit(title().closest("form") as HTMLFormElement);
    expect(mutate).toHaveBeenCalledTimes(1);

    deferred[0].resolve({ data: { createPublicKey: { id: "key-1" } } });
    await waitFor(() => expect(keyDialog()).toBeNull());
    expect(confirm()).toBeNull();
  });

  it("keeps the draft with its error when adding the key fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderDialog();
    await openAndType(user);
    await user.click(screen.getByRole("button", { name: "Create Key" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    deferred[0].reject(new Error("Key already in use"));
    expect(await screen.findByText("Key already in use")).toBeVisible();
    expect(title()).toBeEnabled();
    expect(publicKey()).toHaveValue("ssh-ed25519 AAAAqa");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create Key" })).toHaveFocus(),
    );
  });
});

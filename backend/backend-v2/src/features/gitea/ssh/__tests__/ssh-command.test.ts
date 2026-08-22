import { parseGitExecCommand, isWrite } from "../ssh-command";

describe("parseGitExecCommand", () => {
  it.each([
    [
      "git-receive-pack '/alice/ledger.git'",
      "git-receive-pack",
      "alice",
      "ledger",
    ],
    [
      "git-upload-pack '/alice/ledger.git'",
      "git-upload-pack",
      "alice",
      "ledger",
    ],
    ["git-receive-pack '/alice/ledger'", "git-receive-pack", "alice", "ledger"],
    [
      "git-receive-pack /alice/ledger.git",
      "git-receive-pack",
      "alice",
      "ledger",
    ],
    [
      "git-upload-pack 'alice/ledger.git'",
      "git-upload-pack",
      "alice",
      "ledger",
    ],
  ])("parses %s", (command, service, owner, repo) => {
    expect(parseGitExecCommand(command)).toEqual({ service, owner, repo });
  });

  it.each([
    ["bash"],
    ["sh -c 'curl evil.example'"],
    ["scp -t /tmp/x"],
    ["git-upload-archive '/alice/ledger.git'"],
    ["git-receive-pack '/alice/ledger.git'; bash"],
    ["git-receive-pack '/../../etc/passwd'"],
    ["git-receive-pack '/alice/../bob/ledger.git'"],
    ["git-receive-pack"],
    [""],
  ])("refuses %s", (command) => {
    // Anything unparsed is refused, so a shell request, an scp, or a crafted
    // command all land on the same answer without a separate branch each.
    expect(parseGitExecCommand(command)).toBeNull();
  });

  it("marks only receive-pack as a write", () => {
    expect(
      isWrite({ service: "git-receive-pack", owner: "a", repo: "b" }),
    ).toBe(true);
    expect(isWrite({ service: "git-upload-pack", owner: "a", repo: "b" })).toBe(
      false,
    );
  });
});

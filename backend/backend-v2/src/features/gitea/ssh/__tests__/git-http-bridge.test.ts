import {
  readPktLine,
  stripServicePreamble,
  parseGitProtocol,
  findRequestEnd,
} from "../git-http-bridge";

const pkt = (s: string) => (s.length + 4).toString(16).padStart(4, "0") + s;

describe("readPktLine", () => {
  it("reads a payload line", () => {
    const line = readPktLine(Buffer.from(pkt("want abc\n")), 0);
    expect(line?.payload?.toString()).toBe("want abc\n");
  });

  it.each([
    ["0000", "flush"],
    ["0001", "delim"],
    ["0002", "response-end"],
  ])("recognises %s as %s", (bytes, special) => {
    expect(readPktLine(Buffer.from(bytes), 0)?.special).toBe(special);
  });

  it("returns null when the line is not fully buffered yet", () => {
    expect(readPktLine(Buffer.from("0010abc"), 0)).toBeNull();
    expect(readPktLine(Buffer.from("00"), 0)).toBeNull();
  });

  it("returns undefined for bytes that are not a pkt-line", () => {
    // Distinct from null on purpose: "not a pkt-line" must be refused, while
    // "not yet complete" means keep reading. Conflating them would either hang
    // on garbage or forward a body we could not parse.
    expect(readPktLine(Buffer.from("xxxxdata"), 0)).toBeUndefined();
    expect(readPktLine(Buffer.from("0003ab"), 0)).toBeUndefined();
  });
});

describe("stripServicePreamble", () => {
  // Captured from Gitea 1.24.x rather than hand-written, so the test breaks if
  // the real shape ever changes.
  const V0 =
    "001e# service=git-upload-pack\n" +
    "0000" +
    "014c44250678683cd82ac679f619ff396e854d1994d3 HEAD\0multi_ack thin-pack\n" +
    "0000";
  const V2 =
    "001e# service=git-upload-pack\n" +
    "0000" +
    "000eversion 2\n" +
    "001bagent=git/2.49.1-Linux\n" +
    "0013ls-refs=unborn\n" +
    "0000";

  it("removes the preamble and its flush from a v0 advertisement", () => {
    const out = stripServicePreamble(Buffer.from(V0)).toString();
    expect(out.startsWith("014c4425")).toBe(true);
    expect(out).not.toContain("# service=");
  });

  it("removes the preamble from a v2 advertisement too", () => {
    const out = stripServicePreamble(Buffer.from(V2)).toString();
    expect(out.startsWith("000eversion 2")).toBe(true);
  });

  it("leaves an advertisement that has no preamble alone", () => {
    // What SSH itself sends. Passing it through unchanged is what makes this
    // safe to apply unconditionally.
    const ssh =
      "0144ffa97c1e1b06a7712ae6f4d406a4f7d18faac114 HEAD\0multi_ack\n0000";
    expect(stripServicePreamble(Buffer.from(ssh)).toString()).toBe(ssh);
  });

  it("leaves bytes alone when the preamble is not followed by a flush", () => {
    const odd = "001e# service=git-upload-pack\n" + pkt("unexpected\n");
    expect(stripServicePreamble(Buffer.from(odd)).toString()).toBe(odd);
  });
});

describe("parseGitProtocol", () => {
  it.each([
    [undefined, "v0"],
    ["", "v0"],
    ["version=2", "v2"],
    ["version=2:key=value", "v2"],
    ["key=value:version=2", "v2"],
    ["version=1", "v0"],
  ])("reads %s as %s", (value, expected) => {
    expect(parseGitProtocol(value as string | undefined)).toBe(expected);
  });
});

describe("findRequestEnd", () => {
  it("ends a v2 command at its flush", () => {
    const req = pkt("command=ls-refs\n") + pkt("agent=git/2.43\n") + "0000";
    const found = findRequestEnd(Buffer.from(req + "trailing"), "v2", false);
    expect(found).toEqual({ end: req.length, needsNegotiation: false });
  });

  it("carries a fresh v0 clone: wants, flush, then done", () => {
    // The real byte order, which an earlier version of this test got wrong by
    // putting `done` before the flush. That mistake made the test pass while a
    // genuine v0 clone was refused, and only a real Gitea caught it. A fresh
    // clone must be read PAST the flush that ends the want list.
    const req = pkt("want abc\n") + "0000" + pkt("done\n");
    expect(findRequestEnd(Buffer.from(req), "v0", false)).toEqual({
      end: req.length,
      needsNegotiation: false,
    });
  });

  it("keeps reading after the want list's flush rather than stopping there", () => {
    const wantsOnly = pkt("want abc\n") + "0000";
    expect(findRequestEnd(Buffer.from(wantsOnly), "v0", false)).toBeNull();
  });

  it("refuses a v0 fetch the moment it sees a have", () => {
    // Forwarding it as one POST looked like it worked and did not: against a
    // real Gitea the fetch exited 0 and updated nothing, leaving the client
    // silently stale. Refusing is the safe answer.
    const req = pkt("want abc\n") + "0000" + pkt("have dead\n");
    expect(
      findRequestEnd(Buffer.from(req), "v0", false)?.needsNegotiation,
    ).toBe(true);
  });

  it("flags a second v0 flush even with no have in between", () => {
    // Belt and braces: a client that closes a round without saying anything is
    // still waiting for an ACK, and there is no conversation to continue.
    const req = pkt("want abc\n") + "0000" + "0000";
    expect(findRequestEnd(Buffer.from(req), "v0", false)).toEqual({
      end: req.length,
      needsNegotiation: true,
    });
  });

  it("asks for more bytes when the request is incomplete", () => {
    expect(
      findRequestEnd(Buffer.from(pkt("want abc\n")), "v2", false),
    ).toBeNull();
  });

  it("refuses bytes that are not pkt-lines", () => {
    expect(
      findRequestEnd(Buffer.from("not-a-pkt-line"), "v2", false),
    ).toBeUndefined();
  });

  it("carries a v2 command containing a delimiter packet", () => {
    // `0001` separates arguments from capabilities and must not be mistaken for
    // the end of the command.
    const req = pkt("command=fetch\n") + "0001" + pkt("want abc\n") + "0000";
    expect(findRequestEnd(Buffer.from(req), "v2", false)?.end).toBe(req.length);
  });

  it("ends a push at the command list's flush, with the pack still to come", () => {
    // A push is one request and has nothing to negotiate: the flush closes the
    // command list and the pack follows in the same body. Treating that flush
    // like a fetch's would refuse every push.
    const cmds = pkt("old new refs/heads/main\0report-status\n") + "0000";
    const found = findRequestEnd(Buffer.from(cmds + "PACKDATA"), "v0", true);
    expect(found).toEqual({ end: cmds.length, needsNegotiation: false });
  });
});

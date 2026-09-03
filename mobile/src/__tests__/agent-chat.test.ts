import fs from "fs";
import path from "path";
// Relative imports: jest-lite has no @/ alias for value modules.
import {
  classifyAgentError,
  isRetryable,
} from "../screens/agent-screen/agent-errors";
import { stripAgentNotation } from "../screens/agent-screen/agent-notation";
import { AGENT_PRESET_KEYS } from "../screens/agent-screen/presets";
import { messageText } from "../screens/agent-screen/message-text";
import { en } from "../translations/en";

const agentScreenDir = path.join(__dirname, "..", "screens", "agent-screen");

/**
 * Source with comments removed.
 *
 * These suites assert on source text, and every one of these files explains
 * itself at length — so a prose mention of `credentials: "omit"` was enough to
 * satisfy the assertion that the *code* sets it. Deleting the line and keeping
 * the paragraph above it passed. Reading only the code closes that.
 */
const read = (file: string) =>
  fs
    .readFileSync(path.join(agentScreenDir, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("agent error classification", () => {
  // Shapes captured live from the route in w1/m32/t001.
  const QUOTA_BODY =
    'Error: {"ok":false,"error":{"code":"RATE_LIMITED","message":"AI CFO monthly token limit reached"}}';
  const AUTH_BODY =
    'Error: {"ok":false,"error":{"code":"UNAUTHENTICATED","message":"Invalid or expired token"}}';

  it("reads the quota refusal out of the error envelope", () => {
    expect(classifyAgentError(new Error(QUOTA_BODY))).toBe("quota");
  });

  it("reads an auth failure out of the error envelope", () => {
    expect(classifyAgentError(new Error(AUTH_BODY))).toBe("auth");
  });

  it("treats an unrecognised failure as generic", () => {
    expect(classifyAgentError(new Error("Network request failed"))).toBe(
      "generic",
    );
  });

  it("survives a non-Error rejection", () => {
    expect(classifyAgentError(undefined)).toBe("generic");
    expect(classifyAgentError("boom")).toBe("generic");
  });

  it("offers retry only where retrying could succeed", () => {
    // Retrying a quota refusal earns a second refusal, and retrying an expired
    // token cannot mint a new one — only the generic case is worth a button.
    expect(isRetryable(new Error("Network request failed"))).toBeTruthy();
    expect(isRetryable(new Error(QUOTA_BODY))).toBeFalsy();
    expect(isRetryable(new Error(AUTH_BODY))).toBeFalsy();
  });

  it("classifies by status code when the body is absent", () => {
    expect(
      classifyAgentError(new Error("Request failed with status 429")),
    ).toBe("quota");
    expect(
      classifyAgentError(new Error("Request failed with status 401")),
    ).toBe("auth");
  });
});

describe("agent notation (LaTeX the model emits, which markdown will not touch)", () => {
  it("keeps the words out of \\text{} and drops the command", () => {
    // Observed on device: the model showed its arithmetic as display math.
    expect(
      stripAgentNotation(
        "\\[ \\text{Net Worth} = (\\text{Assets Total}) - 2703.29 \\]",
      ),
    ).toBe("Net Worth = (Assets Total) - 2703.29");
  });

  it("turns a LaTeX thin space between a number and its currency into a space", () => {
    // Observed on device: "( 2,754.06\\, USD )".
    expect(stripAgentNotation("Checking: ( 2,754.06\\, USD )")).toBe(
      "Checking: ( 2,754.06 USD )",
    );
  });

  it("reads inline math delimiters as ordinary parentheses", () => {
    expect(stripAgentNotation("= \\(2,754.06 + 855.83\\)")).toBe(
      "= (2,754.06 + 855.83)",
    );
  });

  it("leaves a bracketed label that is not math alone", () => {
    // A markdown link's [label] must survive to reach the renderer intact.
    expect(stripAgentNotation("see [the docs] for details")).toBe(
      "see [the docs] for details",
    );
  });

  it("leaves markdown syntax entirely to the renderer", () => {
    // Emphasis, bullets, headings, code spans and backslash escapes are the
    // library's job now; touching them here would double-process them.
    const markdown =
      "## Net Worth\n\n- **Cash**: `main.bean` 906.58\n\nDone\\!";
    expect(stripAgentNotation(markdown)).toBe(markdown);
  });

  it("does not collapse the newlines that separate blocks", () => {
    // Squeezing runs of whitespace must not eat the blank line between a
    // paragraph and the list under it, or the list stops being a list.
    expect(stripAgentNotation("intro\n\n- one\n- two")).toBe(
      "intro\n\n- one\n- two",
    );
  });

  it("passes ordinary prose through unchanged", () => {
    expect(stripAgentNotation("Your net worth is 906.58 USD.")).toBe(
      "Your net worth is 906.58 USD.",
    );
  });

  it("leaves a half-arrived math block alone until its closing delimiter lands", () => {
    // Known and accepted: mid-stream the opening delimiter has no partner yet,
    // so the block cannot be recognised and the renderer shows the bracket as
    // an escaped character for a moment. Observed on device; it resolves itself
    // on the next delta. Asserted so a future reader knows it is understood
    // rather than missed — and so a "fix" that strips every stray bracket,
    // including a real markdown link's, fails here first.
    expect(stripAgentNotation("\\[ Assets Total = 2754.")).toBe(
      "\\[ Assets Total = 2754.",
    );
  });
});

describe("messageText", () => {
  const message = (...texts: string[]) =>
    ({
      id: "m",
      role: "assistant",
      parts: texts.map((text) => ({ type: "text", text })),
    }) as never;

  it("separates the utterances of separate steps", () => {
    // Observed on device: an answer that spoke, ran a tool, then spoke again
    // rendered as "Let me try again.It seems there is an ongoing issue".
    expect(messageText(message("Let me try again.", "It seems…"))).toBe(
      "Let me try again.\n\nIt seems…",
    );
  });

  it("ignores parts that are only whitespace", () => {
    expect(messageText(message("one", "   ", "two"))).toBe("one\n\ntwo");
  });

  it("returns empty text for a message that has only tool parts", () => {
    expect(
      messageText({
        id: "m",
        role: "assistant",
        parts: [{ type: "tool-runBqlQuery", state: "input-available" }],
      } as never),
    ).toBe("");
  });
});

describe("agent transport", () => {
  const source = read("use-agent-chat.ts");

  it("sends the bearer token as the Authorization header", () => {
    expect(/Authorization: `Bearer \$\{/.test(source)).toBeTruthy();
  });

  it("suppresses cookies so the bearer token is the only credential", () => {
    // The route also accepts an ambient session cookie, which expo/fetch would
    // otherwise attach (proven on device in t001). Without this, a broken auth
    // header would still appear to work until the cookie expired.
    expect(/credentials:\s*"omit"/.test(source)).toBeTruthy();
  });

  it("streams through expo/fetch rather than the global fetch", () => {
    // The global fetch in React Native has no readable response body, so the
    // answer would arrive in one lump after the turn finished.
    expect(source.includes('from "expo/fetch"')).toBeTruthy();
    expect(/fetch:\s*expoFetch/.test(source)).toBeTruthy();
  });

  it("scopes the request to the selected ledger and the chat session", () => {
    expect(/body:\s*\{\s*ledgerId,\s*sessionId\s*\}/.test(source)).toBeTruthy();
  });

  it("mints a new session id for a new chat", () => {
    expect(/setSessionId\(generateSessionId\(\)\)/.test(source)).toBeTruthy();
  });

  it("stops any in-flight stream before starting a new chat", () => {
    // Without this the previous turn keeps streaming into the fresh thread.
    const startNewChat = source.slice(source.indexOf("const startNewChat"));
    const body = startNewChat.slice(0, startNewChat.indexOf("}, ["));
    expect(body.includes("stop()")).toBeTruthy();
  });
});

describe("deep links never auto-submit", () => {
  const source = read("agent-screen.tsx");

  it("puts ?q= into the input instead of sending it", () => {
    // Any app can open beancount:///(app)/agent?q=… with text it chose, so the
    // send has to stay a human act.
    expect(
      /useState\(\(\) => params\.q\?\.trim\(\) \?\? ""\)/.test(source),
    ).toBeTruthy();
  });

  it("has no auto-submit effect keyed on the deep-link parameter", () => {
    expect(/sendMessage\([^)]*params\.q/.test(source)).toBeFalsy();
    expect(/hasAutoSubmitted/.test(source)).toBeFalsy();
  });

  it("applies a second deep link that arrives without a remount", () => {
    // Navigating to a screen already on the stack updates params without
    // re-running the useState initializer, so the question was dropped: the
    // send button stayed disabled and the tap did nothing.
    expect(/appliedQuestionRef/.test(source)).toBeTruthy();
    const effect = source.slice(source.indexOf("appliedQuestionRef"));
    expect(effect.includes("setInput(question)")).toBeTruthy();
    // …but only into the input. Still no send.
    expect(
      /setInput\(question\);\s*\n\s*\}, \[params\.q\]\)/.test(effect),
    ).toBeTruthy();
  });
});

describe("write tools are refused, not approximated", () => {
  const source = read("agent-screen.tsx");

  it("detects the approval-requested pause", () => {
    expect(/state === "approval-requested"/.test(source)).toBeTruthy();
  });

  it("never sends an approval response from mobile", () => {
    // Approving requires showing the real diff, which is ADR002 P2. Until then
    // the app must not answer the request at all.
    expect(source.includes("addToolApprovalResponse")).toBeFalsy();
    expect(source.includes("addToolResult")).toBeFalsy();
  });

  it("replaces the input with the notice so the turn cannot be continued", () => {
    expect(/!awaitingApproval && \(/.test(source)).toBeTruthy();
  });
});

describe("read-only agent mode", () => {
  const screenSource = read("agent-screen.tsx");
  const hookSource = read("use-agent-chat.ts");

  it("derives write access from the selected ledger permissions", () => {
    expect(hookSource.includes("useGetLedgerQuery")).toBeTruthy();
    expect(/permissions\?\.push === true/.test(hookSource)).toBeTruthy();
    expect(/permissions\?\.admin === true/.test(hookSource)).toBeTruthy();
  });

  it("keeps the chat available while showing a read-only notice", () => {
    expect(screenSource.includes("agent-read-only-notice")).toBeTruthy();
    expect(screenSource.includes("agentReadOnlyTitle")).toBeTruthy();
    expect(screenSource.includes("agentReadOnlyBody")).toBeTruthy();
    expect(screenSource.includes('testID="agent-input"')).toBeTruthy();
  });
});

describe("a turn that answers nothing still says something", () => {
  const source = read("agent-screen.tsx");

  it("notices a finished turn that ran tools but produced no text", () => {
    // Seen live: "add a transaction" sent the agent reading ten files, which
    // exhausted the server's step budget before it ever spoke. The screen went
    // silent — activity line, then nothing.
    const guard = source.slice(source.indexOf("const answeredNothing"));
    const body = guard.slice(0, guard.indexOf(";"));
    expect(body.includes("!isStreaming")).toBeTruthy();
    expect(body.includes("!messageText(lastMessage)")).toBeTruthy();
    expect(body.includes("parts.some(isToolUIPart)")).toBeTruthy();
  });

  it("does not fire while the answer is still streaming", () => {
    const guard = source.slice(source.indexOf("const answeredNothing"));
    expect(
      guard.slice(0, guard.indexOf(";")).includes("!isStreaming"),
    ).toBeTruthy();
  });

  it("does not double up with the error or approval notices", () => {
    const guard = source.slice(source.indexOf("const answeredNothing"));
    expect(guard.slice(0, guard.indexOf(";")).includes("!error")).toBeTruthy();
    expect(
      source.includes("answeredNothing && !awaitingApproval"),
    ).toBeTruthy();
  });

  it("offers a way forward rather than only an apology", () => {
    expect(source.includes("agent-no-answer-retry")).toBeTruthy();
  });
});

describe("the feature flag closes the route, not just the card", () => {
  const routeSource = fs
    .readFileSync(
      path.join(__dirname, "..", "..", "app", "(app)", "agent.tsx"),
      "utf8",
    )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("checks the flag before rendering the screen", () => {
    // Hiding only the Home card would leave beancount:///(app)/agent open to
    // anything that can fire a URL scheme — the route is the real switch.
    expect(/config\.features\.agentChat/.test(routeSource)).toBeTruthy();
    expect(
      /if \(!config\.features\.agentChat\)/.test(routeSource),
    ).toBeTruthy();
  });

  it("sends a disabled build somewhere real instead of a blank screen", () => {
    expect(/<Redirect href=/.test(routeSource)).toBeTruthy();
  });
});

describe("agent strings", () => {
  it("declares every preset chip in the English base", () => {
    const keys = en as unknown as Record<string, unknown>;
    for (const key of AGENT_PRESET_KEYS) {
      expect(typeof keys[key]).toBe("string");
    }
  });

  it("asks read-only questions in its presets", () => {
    // A first tap should show the user what the assistant knows, never propose
    // a change they then have to judge.
    const keys = en as unknown as Record<string, string>;
    for (const key of AGENT_PRESET_KEYS) {
      expect(/add|create|delete|remove|insert/i.test(keys[key])).toBeFalsy();
    }
  });
});

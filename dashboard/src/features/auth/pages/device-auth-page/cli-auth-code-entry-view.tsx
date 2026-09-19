import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { DeviceAuthCard } from "./device-auth-card";
import { useTranslations } from "@/common/hooks/use-translations";

interface CliAuthCodeEntryViewProps {
  onSubmit: (userCode: string) => void;
}

/** A code we could have issued is eight characters; hyphen and case optional. */
const USER_CODE_LENGTH = 8;

/** A whole code inside pasted text, such as "Your code: cbtw-74v6". */
const USER_CODE_IN_TEXT =
  /(?:^|[^A-Z0-9])([A-Z0-9]{4})-?([A-Z0-9]{4})(?![A-Z0-9])/;

function normalizeUserCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, USER_CODE_LENGTH);
}

function formatUserCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

/**
 * The first half of the ceremony: the person types the code their own terminal
 * printed.
 *
 * This step is the reason a link cannot authorize anything. The URL that gets
 * here carries no session, no code, and no secret, so a request only becomes
 * approvable once someone reads a code off the device that is actually asking.
 */
export function CliAuthCodeEntryView({ onSubmit }: CliAuthCodeEntryViewProps) {
  const { t } = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState("");

  // Every edit lands here, so a completed code continues on its own however it
  // arrived: typed, pasted, or entered while the field was not focused.
  const updateUserCode = (value: string) => {
    const next = normalizeUserCode(value);
    setUserCode(next);
    setError("");
    if (next.length === USER_CODE_LENGTH) {
      onSubmit(formatUserCode(next));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (userCode.length !== USER_CODE_LENGTH) {
      setError(t("auth.cliAuthCodeInvalid"));
      return;
    }

    onSubmit(formatUserCode(userCode));
  };

  // The page has one job, so keystrokes and pastes anywhere on it go to the
  // code field, and a pasted whole code replaces whatever was typed so far.
  const handleDocumentKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditable(event.target)
    ) {
      return;
    }

    if (/^[a-z0-9]$/i.test(event.key)) {
      event.preventDefault();
      inputRef.current?.focus();
      updateUserCode(userCode + event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      inputRef.current?.focus();
      updateUserCode(userCode.slice(0, -1));
    }
  });

  const handleDocumentPaste = useEffectEvent((event: ClipboardEvent) => {
    const input = inputRef.current;
    if (
      event.defaultPrevented ||
      (event.target !== input && isEditable(event.target))
    ) {
      return;
    }

    const text = event.clipboardData?.getData("text") ?? "";
    const wholeCode = USER_CODE_IN_TEXT.exec(text.toUpperCase());
    if (wholeCode) {
      event.preventDefault();
      input?.focus();
      updateUserCode(wholeCode[1] + wholeCode[2]);
      return;
    }

    // A fragment pasted into the field goes in at the caret like any paste.
    if (event.target === input) return;

    const fragment = normalizeUserCode(text);
    if (!fragment) return;

    event.preventDefault();
    input?.focus();
    updateUserCode(userCode + fragment);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("paste", handleDocumentPaste);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, []);

  return (
    <DeviceAuthCard error={error}>
      {/* These forms are client-rendered, so nothing submits before
          hydration today — `method="post"` keeps it that way if that
          ever changes, since the native default would put every field
          in the URL. */}
      <form
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {t("auth.cliAuthCodeEntryTitle")}
            </CardTitle>
            <CardDescription className="mt-2">
              {t("auth.cliAuthCodeEntryDescription")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="cli-auth-user-code">
            {t("auth.cliAuthCodeLabel")}
          </Label>
          <Input
            ref={inputRef}
            id="cli-auth-user-code"
            value={formatUserCode(userCode)}
            onChange={(event) => updateUserCode(event.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            spellCheck={false}
            className="text-center text-lg tracking-[0.3em] font-mono uppercase"
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            {t("auth.cliAuthCodeContinue")}
          </Button>
        </CardFooter>
      </form>
    </DeviceAuthCard>
  );
}

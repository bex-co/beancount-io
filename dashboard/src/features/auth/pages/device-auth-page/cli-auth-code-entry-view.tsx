import { useState } from "react";
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

/** A code we could have issued: eight characters, hyphen and case optional. */
const USER_CODE_PATTERN = /^[A-Z0-9]{8}$/;

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
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = userCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!USER_CODE_PATTERN.test(normalized)) {
      setError(t("auth.cliAuthCodeInvalid"));
      return;
    }

    setError("");
    onSubmit(`${normalized.slice(0, 4)}-${normalized.slice(4)}`);
  };

  return (
    <DeviceAuthCard error={error}>
      <form onSubmit={handleSubmit}>
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
            id="cli-auth-user-code"
            value={userCode}
            onChange={(event) => setUserCode(event.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            spellCheck={false}
            maxLength={9}
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

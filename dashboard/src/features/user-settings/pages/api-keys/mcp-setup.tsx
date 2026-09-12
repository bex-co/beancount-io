import { ExternalLink } from "lucide-react";
import { CodeBlock } from "@/common/components/code-block";
import { Label } from "@/common/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  claudeCodeCommand,
  clientJson,
  curlCommand,
  KEY_PLACEHOLDER,
  MCP_GUIDE_URL,
  useMcpEndpoint,
} from "./mcp-setup-config";

/**
 * "Use this key" — the setup a newcomer pastes into their MCP client
 * (w2/m29:t001).
 *
 * The mint dialog used to show the plaintext and stop there, which leaves the
 * one screen where the key is ever visible as the one screen that does not say
 * what to do with it. A user who closed it had a secret and no endpoint.
 */

/**
 * @param token the plaintext key, when the caller has one. Omitted on the
 * settings page, where the panel exists so a returning user can find the setup
 * again — the key is unrecoverable by then, and showing a placeholder is
 * honest about that.
 */
/** The clients configured by dropping the same JSON into a different file. */
const JSON_CLIENTS = [
  { value: "cursor", hintKey: "userSettings.apiKeyCursorHint" },
  { value: "claude-desktop", hintKey: "userSettings.apiKeyClaudeDesktopHint" },
] as const;

export function McpSetup({ token }: { token?: string }) {
  const { t } = useTranslations();
  const endpoint = useMcpEndpoint();
  const key = token ?? KEY_PLACEHOLDER;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("userSettings.apiKeyUseThisKey")}</Label>
        <a
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          href={MCP_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t("userSettings.apiKeyMcpGuide")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        {token
          ? t("userSettings.apiKeyUseThisKeyDescription")
          : t("userSettings.apiKeyUseAKeyDescription")}
      </p>
      <Tabs defaultValue="claude-code">
        <TabsList>
          <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="curl">curl</TabsTrigger>
        </TabsList>
        <TabsContent value="claude-code" className="mt-3">
          <CodeBlock language="bash" code={claudeCodeCommand(endpoint, key)} />
        </TabsContent>
        {/* Both take the same JSON; only where it goes differs. */}
        {JSON_CLIENTS.map(({ value, hintKey }) => (
          <TabsContent key={value} value={value} className="mt-3">
            <p className="mb-2 text-sm text-muted-foreground">{t(hintKey)}</p>
            <CodeBlock language="json" code={clientJson(endpoint, key)} />
          </TabsContent>
        ))}
        <TabsContent value="curl" className="mt-3">
          <CodeBlock language="bash" code={curlCommand(endpoint, key)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

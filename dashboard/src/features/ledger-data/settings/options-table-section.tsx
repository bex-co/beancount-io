import { useId } from "react";
import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useTranslations } from "@/common/hooks/use-translations";

export interface OptionEntry {
  name: string;
  value: unknown;
}

/**
 * Renders one option value.
 *
 * The object branch matters for options that carry a structure rather than a
 * scalar; without it those render as "[object Object]". It is a superset of
 * what a scalar-only list needs, so both callers can share it.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value))
    return value.length === 0 ? "[]" : JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * A card listing a ledger's options as name/value rows.
 *
 * The beancount and fava cards were near-identical files differing only in
 * their title, description, documentation link and entries, so every change —
 * including the table's accessible name — had to be made twice. Minting the
 * title id here keeps that name attached to the table by construction.
 */
export function OptionsTableSection({
  title,
  description,
  docUrl,
  entries,
}: {
  title: string;
  description: string;
  docUrl: string;
  entries: OptionEntry[];
}) {
  const { t } = useTranslations();
  const titleId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        <CardDescription>
          {description}{" "}
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            {t("common.learnMore")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-75">{t("common.option")}</TableHead>
                <TableHead>{t("common.value")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell className="font-mono text-sm">
                    {entry.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatValue(entry.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

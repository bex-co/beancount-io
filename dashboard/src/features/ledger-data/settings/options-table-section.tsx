import { useId } from "react";
import { DocLink } from "@/common/components/doc-link";
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
        <CardTitle>
          <h2 id={titleId}>{title}</h2>
        </CardTitle>
        <CardDescription>
          {description} <DocLink href={docUrl}>{t("common.learnMore")}</DocLink>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="overflow-x-auto rounded-md border">
            <Table
              aria-labelledby={titleId}
              className="min-w-[28rem] sm:min-w-full"
            >
              <TableHeader>
                <TableRow>
                  {/* A fixed 300px name column left a narrow screen's values
                      about 9px, one character per line (w4/1051). Below sm
                      the two share the width. */}
                  <TableHead className="w-2/5 sm:w-75 whitespace-nowrap">
                    {t("common.option")}
                  </TableHead>
                  <TableHead className="min-w-[13rem] whitespace-nowrap">
                    {t("common.value")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.name}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {entry.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm break-words">
                      {formatValue(entry.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px end-px w-6 rounded-e-md bg-gradient-to-l from-card to-transparent sm:hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}

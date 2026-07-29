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
import { ExternalLink } from "lucide-react";
import { type GetLedgerQuery } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value))
    return value.length === 0 ? "[]" : JSON.stringify(value);
  return String(value);
}

export function BeancountOptionsSection({
  ledger,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
}) {
  const { t, i18n } = useTranslations();
  const options = ledger.options;

  if (!options) return null;

  const localePrefix = i18n.language === "en" ? "" : `/${i18n.language}`;
  const beancountOptionsDocUrl = `https://beancount.io${localePrefix}/docs/Basics/options-configuration`;

  const optionEntries: { name: string; value: unknown }[] = [
    { name: "title", value: options.title },
    { name: "name_assets", value: options.nameAssets },
    { name: "name_liabilities", value: options.nameLiabilities },
    { name: "name_equity", value: options.nameEquity },
    { name: "name_income", value: options.nameIncome },
    { name: "name_expenses", value: options.nameExpenses },
    {
      name: "account_current_conversions",
      value: options.accountCurrentConversions,
    },
    { name: "account_current_earnings", value: options.accountCurrentEarnings },
    { name: "render_commas", value: options.renderCommas },
    { name: "operating_currency", value: options.operatingCurrency },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.beancountOptions")}</CardTitle>
        <CardDescription>
          {t("page.settings.beancountOptionsDescription")}{" "}
          <a
            href={beancountOptionsDocUrl}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-75">Option</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionEntries.map((entry) => (
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

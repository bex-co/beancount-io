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
  return String(value);
}

export function BcioOptionsSection({
  ledger,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
}) {
  const { t, i18n } = useTranslations();
  const bcioOptions = ledger.bcioOptions;

  if (!bcioOptions) return null;

  const localePrefix = i18n.language === "en" ? "" : `/${i18n.language}`;
  const bcioOptionsDocUrl = `https://beancount.io${localePrefix}/docs/Basics/beancountio-options`;

  const optionEntries = [
    { name: "default_file", value: bcioOptions.defaultFile },
    { name: "transaction_file", value: bcioOptions.transactionFile },
    { name: "account_file", value: bcioOptions.accountFile },
    { name: "price_file", value: bcioOptions.priceFile },
    { name: "balance_file", value: bcioOptions.balanceFile },
    { name: "note_file", value: bcioOptions.noteFile },
    { name: "pad_file", value: bcioOptions.padFile },
  ].filter((entry) => entry.value !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.bcioOptions")}</CardTitle>
        <CardDescription>
          {t("page.settings.bcioOptionsDescription")}{" "}
          <a
            href={bcioOptionsDocUrl}
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

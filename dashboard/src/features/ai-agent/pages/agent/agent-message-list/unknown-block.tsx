import { useTranslations } from "@/common/hooks/use-translations";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function UnknownBlock(_: { block: never }) {
  const { t } = useTranslations();
  return (
    <div className="my-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground/60">
      {t("aiAgent.unknownBlock")}
    </div>
  );
}

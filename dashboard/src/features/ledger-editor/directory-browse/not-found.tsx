import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { BranchNotFound } from "../shared/components/branch-not-found";
import { SUPPORTED_BRANCH } from "../shared/lib/supported-branch";
import { getParentPath } from "../shared/lib/utils";

export function DirectoryNotFoundView({
  ledgerOwner,
  ledgerName,
  dirPath,
}: {
  ledgerOwner: string;
  ledgerName: string;
  dirPath: string;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-lg font-semibold">
        {t("ledgerEditor.folderNotFound", { path: dirPath || "/" })}
      </h1>
      <Button asChild>
        {dirPath ? (
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$"
            params={{
              ledgerOwner,
              ledgerName,
              branch: SUPPORTED_BRANCH,
              _splat: getParentPath(dirPath),
            }}
          >
            {t("ledgerEditor.browseParentDirectory")}
          </Link>
        ) : (
          <Link
            to="/ledger/$ledgerOwner/$ledgerName"
            params={{ ledgerOwner, ledgerName }}
          >
            {t("common.relatedLinks.overview")}
          </Link>
        )}
      </Button>
    </div>
  );
}

export function DirectoryNotFound() {
  const { ledgerOwner, ledgerName, branch, _splat } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
  });
  if (branch !== SUPPORTED_BRANCH) return <BranchNotFound />;
  return (
    <>
      <PageSEO
        titleKey="seo.notFound.title"
        descriptionKey="ledgerEditor.folderNotFound"
        params={{ path: _splat || "/" }}
        noIndex
      />
      <DirectoryNotFoundView
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
        dirPath={_splat ?? ""}
      />
    </>
  );
}

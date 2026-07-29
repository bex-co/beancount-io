import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@apollo/client/react";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Skeleton } from "@/common/components/ui/skeleton";
import { PRMetadata } from "../components/pr-metadata";
import { PRFileList } from "../components/pr-file-list";
import { DiffViewer } from "@/common/components/diff-viewer";
import { PRActions } from "../components/pr-actions";
import { toast } from "sonner";
import {
  GetPullRequestDetailsDocument,
  ApprovePullRequestDocument,
  RejectPullRequestDocument,
} from "@/graphql/definitions";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

export default function PRReviewPage() {
  const { ledgerOwner, ledgerName, prNumber } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/pull/$prNumber",
  });
  const { t } = useTranslations();

  const prNumberInt = parseInt(prNumber, 10);

  const { data, loading, error, refetch } = useQuery(
    GetPullRequestDetailsDocument,
    {
      variables: { ledgerOwner, ledgerName, prNumber: prNumberInt },
    },
  );

  const [approvePR, { loading: approving }] = useMutation(
    ApprovePullRequestDocument,
  );
  const [rejectPR, { loading: rejecting }] = useMutation(
    RejectPullRequestDocument,
  );

  const handleApprove = async () => {
    try {
      const result = await approvePR({
        variables: { ledgerOwner, ledgerName, prNumber: prNumberInt },
      });

      if (result.data?.approvePullRequest.success) {
        toast.success(t("pullRequests.approveSuccess"));
        void refetch();
      } else {
        toast.error(
          result.data?.approvePullRequest.message ||
            t("pullRequests.approveError"),
        );
      }
    } catch {
      toast.error(t("pullRequests.approveError"));
    }
  };

  const handleReject = async () => {
    try {
      const result = await rejectPR({
        variables: { ledgerOwner, ledgerName, prNumber: prNumberInt },
      });

      if (result.data?.rejectPullRequest.success) {
        toast.success(t("pullRequests.rejectSuccess"));
        void refetch();
      } else {
        toast.error(
          result.data?.rejectPullRequest.message ||
            t("pullRequests.rejectError"),
        );
      }
    } catch {
      toast.error(t("pullRequests.rejectError"));
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const pr = data?.getPullRequestDetails;

  if (!pr) {
    return (
      <Alert>
        <AlertDescription>{t("pullRequests.prNotFound")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerPullRequest" params={{ prNumber }} />
      <PRMetadata
        title={pr.title}
        number={pr.number}
        state={pr.state}
        author={pr.author}
        headBranch={pr.headBranch}
        baseBranch={pr.baseBranch}
        description={pr.description}
      />

      <PRFileList files={pr.files} />

      <DiffViewer diff={pr.diff || ""} />

      <PRActions
        state={pr.state}
        onApprove={handleApprove}
        onReject={handleReject}
        approving={approving}
        rejecting={rejecting}
      />
    </div>
  );
}

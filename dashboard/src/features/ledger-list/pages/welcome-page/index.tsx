import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  ListLedgersDocument,
  CreateLedgerDocument,
  type CreateLedgerMutationVariables,
} from "@/graphql/definitions";
import { LedgerForm } from "@/features/ledger-list/components/ledger-form";
import { toast } from "sonner";
import { decodeLedgerId } from "@/common/lib/utils/encode";

import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Welcome content component for users without ledgers
 * Shows welcome message and ledger creation form directly
 */
function WelcomeContent() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();

  const [createLedgerMutation, { loading: createLoading }] = useMutation(
    CreateLedgerDocument,
    {
      refetchQueries: [ListLedgersDocument],
    },
  );

  const handleCreateLedger = async (data: CreateLedgerMutationVariables) => {
    try {
      const result = await createLedgerMutation({ variables: data });
      toast.success(t("page.welcome.ledgerCreatedSuccess"));

      // Navigate to the newly created ledger
      if (result.data?.createLedger) {
        const { ledgerOwner, ledgerName } = decodeLedgerId(
          result.data.createLedger.id,
        );
        void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
      }
    } catch (error) {
      toast.error(formatError(error));
      console.error("Failed to create ledger:", error);
    }
  };

  return (
    <>
      <PageSEO
        titleKey="seo.welcome.title"
        descriptionKey="seo.welcome.description"
        noIndex
      />
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">
              {t("page.welcome.createYourFirstLedger")}
            </CardTitle>
            <CardDescription>
              {t("page.welcome.createNewLedgerDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <LedgerForm
              onSubmit={handleCreateLedger}
              isLoading={createLoading}
              hideLimitIndicator
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/**
 * Welcome page component
 * The route loader handles redirecting to the first ledger if one exists.
 * This component only renders when the user has no ledgers yet.
 */
export default function WelcomePage() {
  return <WelcomeContent />;
}

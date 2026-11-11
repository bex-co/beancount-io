import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import {
  ListLedgersDocument,
  UpdateLedgerDocument,
  type GetLedgerQuery,
  type UpdateLedgerMutation,
  type UpdateLedgerMutationVariables,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import {
  LEDGER_DESCRIPTION_MAX,
  ledgerDescriptionLength,
  ledgerNameIssue,
  slugifyLedgerName,
} from "@/common/lib/beancount/ledger-name";
import { LengthCounter } from "@/common/components/length-counter";

/**
 * The ledger service's two rename refusals worth naming, recognized by its
 * fixed wording (`backend-cluster/ledger/src/shared/ledger-name.ts`, `api/ledgers.ts`).
 */
const NAME_TAKEN_ERROR = /already exists/i;
const NAME_TOO_LONG_ERROR = /too long/i;

export function GeneralSettingsSection({
  ledger,
  ledgerId,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
  ledgerId: string;
}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  // Only admins can save, so only admins get editable fields — anyone else
  // would be typing into a form with no way to submit it.
  const { isAdmin } = useLedgerPermission();
  const [ledgerName, setLedgerName] = useState(ledger.name || "");
  const [ledgerDescription, setLedgerDescription] = useState(
    ledger.description || "",
  );

  const [updateLedger, { loading: updatingLedger }] = useMutation<
    UpdateLedgerMutation,
    UpdateLedgerMutationVariables
  >(UpdateLedgerDocument);

  const previousLedgerNameRef = useRef(ledger.name);
  const previousLedgerDescriptionRef = useRef(ledger.description || "");

  useEffect(() => {
    if (previousLedgerNameRef.current !== ledger.name) {
      previousLedgerNameRef.current = ledger.name;
      queueMicrotask(() => setLedgerName(ledger.name || ""));
    }
  }, [ledger.name]);

  useEffect(() => {
    if (previousLedgerDescriptionRef.current !== ledger.description) {
      previousLedgerDescriptionRef.current = ledger.description || "";
      queueMicrotask(() => setLedgerDescription(ledger.description || ""));
    }
  }, [ledger.description]);

  // The name the server will actually give the ledger, and why it may not.
  const slug = slugifyLedgerName(ledgerName.trim());
  const { ledgerOwner } = decodeLedgerId(ledgerId);
  const { data: ledgersData } = useQuery(ListLedgersDocument);
  const takenNames = useMemo(
    () =>
      new Set(
        (ledgersData?.listLedgers ?? [])
          .filter(
            (other) =>
              other.fullName === `${ledgerOwner}/${other.name}` &&
              other.name !== ledger.name,
          )
          .map((other) => other.name),
      ),
    [ledgersData, ledgerOwner, ledger.name],
  );
  const nameIssue = ledgerNameIssue(ledgerName.trim());
  const nameError = !ledgerName.trim()
    ? null
    : nameIssue === "tooLong"
      ? t("page.dashboard.nameMaxLength")
      : nameIssue
        ? t("page.dashboard.nameInvalid")
        : takenNames.has(slug)
          ? t("page.settings.ledgerNameTaken", { name: slug })
          : null;
  const descriptionLength = ledgerDescriptionLength(ledgerDescription);
  const descriptionError =
    descriptionLength > LEDGER_DESCRIPTION_MAX
      ? t("page.dashboard.descriptionMaxLength")
      : null;

  const handleUpdateGeneral = async () => {
    if (!ledgerId || nameError || descriptionError) return;

    const variables: {
      ledgerId: string;
      name?: string;
      description?: string | null;
    } = { ledgerId };

    const hasNameChanges = slug !== "" && slug !== ledger.name;
    const hasDescriptionChanges =
      ledgerDescription !== (ledger.description || "");

    if (hasNameChanges) {
      variables.name = slug;
    }

    if (hasDescriptionChanges) {
      variables.description = ledgerDescription.trim() || null;
    }

    if (!hasNameChanges && !hasDescriptionChanges) {
      return;
    }

    try {
      const result = await updateLedger({ variables });

      if (hasNameChanges && result.data?.updateLedger) {
        const newLedgerId = result.data.updateLedger.id;
        const { ledgerOwner, ledgerName: newLedgerName } =
          decodeLedgerId(newLedgerId);
        void navigate({
          to: `/ledger/$ledgerOwner/$ledgerName/settings`,
          params: { ledgerOwner, ledgerName: newLedgerName },
          replace: true,
        });
      } else {
        toast.success(t("page.settings.settingsUpdated"));
      }

      if (result.data?.updateLedger) {
        previousLedgerNameRef.current = result.data.updateLedger.name;
        previousLedgerDescriptionRef.current =
          result.data.updateLedger.description || "";
      }
    } catch (error) {
      toast.error(renameErrorMessage(error));
    }
  };

  /** Name the refusals a user can act on; anything else stays generic. */
  const renameErrorMessage = (error: unknown) => {
    const refusal = CombinedGraphQLErrors.is(error)
      ? error.errors.find(
          (gqlError) => gqlError.extensions?.code === "BAD_USER_INPUT",
        )?.message
      : undefined;
    if (refusal && NAME_TAKEN_ERROR.test(refusal)) {
      return t("page.settings.ledgerNameTaken", { name: slug });
    }
    if (refusal && NAME_TOO_LONG_ERROR.test(refusal)) {
      return t("page.dashboard.nameMaxLength");
    }
    return formatError(error);
  };

  const hasNameChanges = slug !== "" && slug !== ledger.name;
  const hasDescriptionChanges =
    ledgerDescription !== (ledger.description || "");
  const hasChanges = hasNameChanges || hasDescriptionChanges;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.generalSettings")}</CardTitle>
        <CardDescription>
          {isAdmin
            ? t("page.settings.generalSettingsDescription")
            : t("page.settings.generalSettingsDescriptionReadOnly")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ledger-name">{t("page.dashboard.ledgerName")}</Label>
          <Input
            id="ledger-name"
            value={ledgerName}
            onChange={(e) => setLedgerName(e.target.value)}
            readOnly={!isAdmin}
            placeholder={
              isAdmin ? t("page.dashboard.enterLedgerName") : undefined
            }
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "ledger-name-error" : undefined}
          />
          {isAdmin && slug && slug !== ledgerName.trim() && (
            <p className="text-sm text-muted-foreground">
              {t("page.dashboard.repositoryName")}:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {slug}
              </code>
            </p>
          )}
          {nameError && (
            <p id="ledger-name-error" className="text-sm text-destructive">
              {nameError}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("page.settings.ledgerNameDescription")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ledger-description">
            {t("page.settings.description")}
          </Label>
          <Textarea
            id="ledger-description"
            placeholder={
              isAdmin
                ? t("page.settings.ledgerDescriptionPlaceholder")
                : undefined
            }
            value={ledgerDescription}
            onChange={(e) => setLedgerDescription(e.target.value)}
            readOnly={!isAdmin}
            maxLength={LEDGER_DESCRIPTION_MAX}
            rows={3}
            className="resize-none"
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={
              descriptionError ? "ledger-description-error" : undefined
            }
          />
          {isAdmin && (
            <LengthCounter
              length={descriptionLength}
              max={LEDGER_DESCRIPTION_MAX}
            />
          )}
          {descriptionError && (
            <p
              id="ledger-description-error"
              className="text-sm text-destructive"
            >
              {descriptionError}
            </p>
          )}
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              {t("page.settings.ledgerDescriptionDescription")}
            </p>
          )}
        </div>

        <LedgerAdminPermission>
          <div className="flex justify-end">
            <Button
              onClick={handleUpdateGeneral}
              disabled={
                !hasChanges ||
                updatingLedger ||
                !ledgerName.trim() ||
                nameError !== null ||
                descriptionError !== null
              }
            >
              {updatingLedger ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save")}
                </>
              )}
            </Button>
          </div>
        </LedgerAdminPermission>
      </CardContent>
    </Card>
  );
}

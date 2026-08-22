import { type AppConfig } from "@/config/config";
import {
  FavaLedgerPublic,
  mapFavaPermission,
} from "@/features/ledger/types/fava-api.types";
import { generateGiteaUrl } from "@/shared/gitea-utils";
import {
  LedgerData,
  LedgerFileData,
} from "@/features/ledger/workflow/ledger-workflow.types";
import { LedgerFileContentPublic } from "@/foundation/fava/Api";

/**
 * Maps a Fava API LedgerFileContentPublic response to a GraphQL LedgerFileContent object.
 * This function handles the transformation of snake_case API fields to camelCase GraphQL fields.
 *
 * @param data - The file content data from the Fava API
 * @returns A LedgerFileContent object ready for GraphQL response
 */
export function mapToLedgerFileContent(
  data: LedgerFileContentPublic,
): LedgerFileData {
  return {
    name: data.name,
    path: data.path,
    type: data.type,
    sha: data.sha,
    size: data.size,
    content: data.content || undefined,
    encoding: data.encoding || undefined,
    lastCommitSha: data.last_commit_sha || undefined,
    lastCommitterDate: data.last_committer_date || undefined,
    lastAuthorDate: data.last_author_date || undefined,
  };
}

/**
 * Maps a Fava API FavaLedgerPublic response to a GraphQL Ledger object.
 * This function handles the transformation of snake_case API fields to camelCase GraphQL fields,
 * generates Gitea URLs, and encodes the ledger ID.
 *
 * @param ledger - The ledger data from the Fava API
 * @param gitea - The Gitea config slice used to build repo URLs
 * @returns A Ledger object ready for GraphQL response
 */
export function mapToLedger(
  ledger: FavaLedgerPublic,
  gitea: AppConfig["gitea"],
): LedgerData {
  const giteaUrl = generateGiteaUrl(gitea, ledger.full_name);
  return {
    id: ledger.full_name,
    name: ledger.name,
    fullName: ledger.full_name,
    sshUrl: giteaUrl.sshUrl,
    httpUrl: giteaUrl.httpUrl,
    empty: ledger.empty,
    private: ledger.private,
    createdAt: ledger.created_at,
    updatedAt: ledger.updated_at,
    size: ledger.size,
    permissions: mapFavaPermission(ledger.permissions),
    description: ledger.description,
  };
}

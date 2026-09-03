import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import { InternalServerError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";

export type ShellQueryResult = {
  resultType: "table" | "text";
  table?: {
    types: { name: string; dtype: string }[];
    rows: (string | number | boolean | null | Record<string, unknown>)[][];
    t?: string;
  };
  text?: {
    contents: string;
    t?: string;
  };
};

export type ShellTextResult = { text: string };

export interface ILedgerShellService {
  queryShell(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: string;
  }): Promise<ShellQueryResult>;

  queryShellText(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: string;
  }): Promise<ShellTextResult>;
}

export class LedgerShellService
  extends AuthorizedLedgerService
  implements ILedgerShellService
{
  async queryShell(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: string;
  }): Promise<ShellQueryResult> {
    const { ledgerId, identity, query } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
      this.authDeps,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );

    const queryResult = await unwrapFavaResponse(
      favaApiClient.shell.queryShell(ledgerOwner, ledgerName, { query }),
      "execute shell query",
    );
    const result = queryResult.result;

    if ("types" in result && "rows" in result) {
      return {
        resultType: "table",
        table: {
          types: result.types.map((col) => ({
            name: col.name,
            dtype: col.dtype,
          })),
          rows: result.rows.map((row) => row.map((cell) => cell ?? "")),
          t: result.t,
        },
      };
    } else if ("contents" in result) {
      return {
        resultType: "text",
        text: { contents: result.contents, t: result.t },
      };
    } else {
      throw new InternalServerError("Unknown query result format");
    }
  }

  async queryShellText(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: string;
  }): Promise<ShellTextResult> {
    const { ledgerId, identity, query } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
      this.authDeps,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.shell.queryShellText(ledgerOwner, ledgerName, { query }),
      "execute shell query",
    );
    return { text: data.text };
  }
}

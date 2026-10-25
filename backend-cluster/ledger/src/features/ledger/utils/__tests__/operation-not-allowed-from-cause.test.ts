import { giteaWriteErrorFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import {
  ConflictError,
  NotFoundError,
  OperationNotAllowedError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
} from "@/shared/errors";

/** A generated-client HttpResponse rejection: status + parsed error body. */
const giteaError = (status: number, message: string) =>
  Object.assign(new Error(`HTTP ${status}`), {
    status,
    error: { message },
  });

describe("giteaWriteErrorFromCause", () => {
  // w23/m1: a commit-step Gitea 500 the conflict matchers do not recognize
  // (a ref lock with a new signature, an outage) is a retryable
  // unavailability — never "not allowed" for an authorized credential.
  it.each([500, 502, 504])(
    "maps an unrecognized Gitea %i to ServiceUnavailableError",
    (status) => {
      const error = giteaWriteErrorFromCause(
        "commit ledger files",
        giteaError(status, "internal error"),
      );
      expect(error).toBeInstanceOf(ServiceUnavailableError);
    },
  );

  it("keeps a hook-declined push an OperationNotAllowedError", () => {
    const error = giteaWriteErrorFromCause(
      "commit ledger files",
      giteaError(
        500,
        "PushRejected Error: exit status 1 - remote: pre-receive hook declined",
      ),
    );
    expect(error).toBeInstanceOf(OperationNotAllowedError);
  });

  it("still maps 404, conflicts, and quota rejections as before", () => {
    expect(
      giteaWriteErrorFromCause("commit ledger files", giteaError(404, "nope")),
    ).toBeInstanceOf(NotFoundError);
    expect(
      giteaWriteErrorFromCause("commit ledger files", giteaError(409, "stale")),
    ).toBeInstanceOf(ConflictError);
    expect(
      giteaWriteErrorFromCause(
        "commit ledger files",
        giteaError(500, "remote: repository size limit exceeded"),
      ),
    ).toBeInstanceOf(ResourceLimitReachedError);
  });
});

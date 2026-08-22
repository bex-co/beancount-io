import { DomainError, ErrorCategory } from "@/shared/errors";

/** 404 carrying a verbatim Python `HTTPException.detail` (no message rewriting). */
export class NotFoundDetailError extends DomainError {
  constructor(detail: string) {
    super(ErrorCategory.NOT_FOUND, detail);
  }
}

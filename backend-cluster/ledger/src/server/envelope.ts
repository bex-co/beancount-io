/**
 * The Python service's wire envelope (`app/schemas/response.py` +
 * `app/core/response.py`), reproduced field-for-field:
 *
 * - success: `{"success": true, "data": <T>}` (the `error` field is excluded
 *   from serialization by pydantic `Field(exclude=True)`)
 * - error:   `{"success": false, "error": "<msg>", "code": <str|null>,
 *   "details": <obj|null>}` (`data` excluded; `code`/`details` present even
 *   when null — pydantic `model_dump()` includes defaulted fields)
 */

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  error: string;
  code: string | null;
  details: Record<string, number | string> | null;
}

export function successResponse<T>(data: T): SuccessEnvelope<T> {
  return { success: true, data };
}

export function errorResponse(
  error: string,
  code: string | null = null,
  details: Record<string, number | string> | null = null,
): ErrorEnvelope {
  return { success: false, error, code, details };
}

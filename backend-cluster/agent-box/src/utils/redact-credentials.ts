/**
 * Redacts credentials from strings to prevent exposure in logs/errors
 *
 * Patterns redacted:
 * - URLs with credentials: https://user:pass@domain → https://***@domain
 * - Tokens in URLs: https://token@domain → https://***@domain
 * - Bearer tokens: Bearer xyz123 → Bearer ***
 * - API keys: apikey=xyz123 → apikey=*** (gitleaks:allow — doc example, not a credential)
 */
export function redactCredentials(text: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact credentials in URLs (HTTP/HTTPS)
  // Matches: https://user:pass@domain or https://token@domain
  redacted = redacted.replace(
    /(https?:\/\/)([^@\s]+)@([^/\s]+)/gi,
    '$1***@$3'
  );

  // Redact Bearer tokens
  redacted = redacted.replace(
    /Bearer\s+[A-Za-z0-9_\-.]+/gi,
    'Bearer ***'
  );

  // Redact API key patterns
  redacted = redacted.replace(
    /(apikey|api_key|token|password|secret)([=:])\s*[^\s&]+/gi,
    '$1$2***'
  );

  // Redact Authorization headers (but not Bearer tokens which are already handled)
  // Only match Basic auth and other non-Bearer authorization types
  redacted = redacted.replace(
    /Authorization:\s+(?!Bearer\s+\*\*\*)([^\n]+)/gi,
    'Authorization: ***'
  );

  return redacted;
}

/**
 * Redacts credentials from objects (for structured logging)
 */
export function redactObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return redactCredentials(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }

  if (obj && typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys entirely
      if (/password|token|secret|apikey|authorization/i.test(key)) {
        redacted[key] = '***';
      } else {
        redacted[key] = redactObject(value);
      }
    }
    return redacted as T;
  }

  return obj;
}

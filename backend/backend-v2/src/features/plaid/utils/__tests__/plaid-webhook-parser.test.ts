import { safeParseWebhookEvent } from "../plaid-webhook-parser";

describe("safeParseWebhookEvent", () => {
  it("should parse a valid webhook body successfully", () => {
    const body = {
      webhook_type: "TRANSACTIONS",
      webhook_code: "SYNC_UPDATES_AVAILABLE",
      item_id: "item-abc123",
    };

    const result = safeParseWebhookEvent(body);

    expect(result).toEqual({
      webhookType: "TRANSACTIONS",
      webhookCode: "SYNC_UPDATES_AVAILABLE",
      itemId: "item-abc123",
    });
  });

  it("should return unknown values for null body", () => {
    const result = safeParseWebhookEvent(null);

    expect(result).toEqual({
      webhookType: "unknown",
      webhookCode: "unknown",
      itemId: "unknown",
    });
  });

  it("should return unknown values for undefined body", () => {
    const result = safeParseWebhookEvent(undefined);

    expect(result).toEqual({
      webhookType: "unknown",
      webhookCode: "unknown",
      itemId: "unknown",
    });
  });

  it("should return unknown values for empty object", () => {
    const result = safeParseWebhookEvent({});

    expect(result).toEqual({
      webhookType: "unknown",
      webhookCode: "unknown",
      itemId: "unknown",
    });
  });

  it("should extract fields even when schema validation fails (extra field missing)", () => {
    // Missing rawBody is fine since it's optional, but this body has invalid types
    const body = {
      webhook_type: "TRANSACTIONS",
      webhook_code: "DEFAULT_UPDATE",
      item_id: "item-xyz789",
      extra_field: "extra",
    };

    const result = safeParseWebhookEvent(body);

    expect(result.webhookType).toBe("TRANSACTIONS");
    expect(result.webhookCode).toBe("DEFAULT_UPDATE");
    expect(result.itemId).toBe("item-xyz789");
  });

  it("should use unknown for fields with non-string values", () => {
    const body = {
      webhook_type: 123,
      webhook_code: true,
      item_id: { nested: "value" },
    };

    const result = safeParseWebhookEvent(body);

    expect(result.webhookType).toBe("unknown");
    expect(result.webhookCode).toBe("unknown");
    expect(result.itemId).toBe("unknown");
  });

  it("should handle body with only some string fields", () => {
    const body = {
      webhook_type: "ITEM",
      webhook_code: 999,
      item_id: "item-partial",
    };

    const result = safeParseWebhookEvent(body);

    expect(result.webhookType).toBe("ITEM");
    expect(result.webhookCode).toBe("unknown");
    expect(result.itemId).toBe("item-partial");
  });

  it("should handle string body (not an object)", () => {
    const result = safeParseWebhookEvent("not an object");

    expect(result).toEqual({
      webhookType: "unknown",
      webhookCode: "unknown",
      itemId: "unknown",
    });
  });

  it("should handle number body", () => {
    const result = safeParseWebhookEvent(42);

    expect(result).toEqual({
      webhookType: "unknown",
      webhookCode: "unknown",
      itemId: "unknown",
    });
  });
});

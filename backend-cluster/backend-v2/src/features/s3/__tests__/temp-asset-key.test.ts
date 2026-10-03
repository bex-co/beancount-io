import { assertTempAssetKey, isTempAssetOwnedBy } from "../temp-asset-key";
import { BadUserInputError } from "@/shared/errors";

describe("assertTempAssetKey", () => {
  it.each(["", " ", "\t\n"])(
    "refuses the blank key %j, naming the argument",
    (key) => {
      expect(() => assertTempAssetKey(key, "receiptObjectKey")).toThrow(
        BadUserInputError,
      );
      expect(() => assertTempAssetKey(key, "receiptObjectKey")).toThrow(
        /receiptObjectKey must not be empty/,
      );
    },
  );

  it("refuses a value that is not a string at all", () => {
    expect(() =>
      assertTempAssetKey(undefined as unknown as string, "objectKey"),
    ).toThrow(BadUserInputError);
  });

  it("leaves ownership to the authorization check", () => {
    // Shape and ownership are not this function's question: someone else's
    // key passes here and is refused where the relationship is evaluated.
    expect(() =>
      assertTempAssetKey("tmp/usr_other/receipt.pdf", "objectKey"),
    ).not.toThrow();
    expect(isTempAssetOwnedBy("tmp/usr_other/receipt.pdf", "usr_alice")).toBe(
      false,
    );
  });
});

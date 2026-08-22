import {
  isFavaSuccessResponse,
  mapFavaPermission,
  FavaApiResponse,
  FavaPermission,
  FavaSuccessResponse,
  FavaErrorResponse,
} from "../fava-api.types";

describe("fava-api.types", () => {
  describe("isFavaSuccessResponse", () => {
    it("should return true for a success response", () => {
      const successResponse: FavaSuccessResponse<string> = {
        success: true,
        data: "test data",
      };

      expect(isFavaSuccessResponse(successResponse)).toBe(true);
    });

    it("should return false for an error response", () => {
      const errorResponse: FavaErrorResponse = {
        success: false,
        error: "Something went wrong",
      };

      expect(isFavaSuccessResponse(errorResponse)).toBe(false);
    });

    it("should work with complex data types", () => {
      const response: FavaApiResponse<{ id: number; name: string }> = {
        success: true,
        data: { id: 1, name: "Test" },
      };

      expect(isFavaSuccessResponse(response)).toBe(true);
      if (isFavaSuccessResponse(response)) {
        expect(response.data.id).toBe(1);
        expect(response.data.name).toBe("Test");
      }
    });

    it("should work with array data types", () => {
      const response: FavaApiResponse<number[]> = {
        success: true,
        data: [1, 2, 3],
      };

      expect(isFavaSuccessResponse(response)).toBe(true);
      if (isFavaSuccessResponse(response)) {
        expect(response.data).toEqual([1, 2, 3]);
      }
    });

    it("should work with null data", () => {
      const response: FavaApiResponse<null> = {
        success: true,
        data: null,
      };

      expect(isFavaSuccessResponse(response)).toBe(true);
    });
  });

  describe("mapFavaPermission", () => {
    it("should map permission object with all true values", () => {
      const permission: FavaPermission = {
        admin: true,
        pull: true,
        push: true,
      };

      const result = mapFavaPermission(permission);

      expect(result).toEqual({
        admin: true,
        pull: true,
        push: true,
      });
    });

    it("should map permission object with all false values", () => {
      const permission: FavaPermission = {
        admin: false,
        pull: false,
        push: false,
      };

      const result = mapFavaPermission(permission);

      expect(result).toEqual({
        admin: false,
        pull: false,
        push: false,
      });
    });

    it("should map permission object with mixed values", () => {
      const permission: FavaPermission = {
        admin: false,
        pull: true,
        push: false,
      };

      const result = mapFavaPermission(permission);

      expect(result).toEqual({
        admin: false,
        pull: true,
        push: false,
      });
    });

    it("should convert null values to false", () => {
      const permission: FavaPermission = {
        admin: null,
        pull: null,
        push: null,
      };

      const result = mapFavaPermission(permission);

      expect(result).toEqual({
        admin: false,
        pull: false,
        push: false,
      });
    });

    it("should handle mixed null and boolean values", () => {
      const permission: FavaPermission = {
        admin: true,
        pull: null,
        push: false,
      };

      const result = mapFavaPermission(permission);

      expect(result).toEqual({
        admin: true,
        pull: false,
        push: false,
      });
    });

    it("should return undefined for null permission", () => {
      const result = mapFavaPermission(null);

      expect(result).toBeUndefined();
    });

    it("should return undefined for undefined permission", () => {
      const result = mapFavaPermission(undefined);

      expect(result).toBeUndefined();
    });
  });
});

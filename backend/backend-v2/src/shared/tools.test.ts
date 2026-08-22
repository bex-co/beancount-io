import {
  makeGravatar,
  filterNullish,
  md5,
  toCamelCase,
  convertKeysToCamelCase,
} from "./tools";

describe("tools utilities", () => {
  describe("makeGravatar", () => {
    it("should generate a gravatar URL from an email", () => {
      const email = "test@example.com";
      const result = makeGravatar(email);

      expect(result).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\//);
      expect(result).toContain("?size=48");
    });

    it("should generate consistent URLs for the same input", () => {
      const input = "test@example.com";
      const result1 = makeGravatar(input);
      const result2 = makeGravatar(input);

      expect(result1).toBe(result2);
    });

    it("should generate different URLs for different inputs", () => {
      const result1 = makeGravatar("test1@example.com");
      const result2 = makeGravatar("test2@example.com");

      expect(result1).not.toBe(result2);
    });
  });

  describe("md5", () => {
    it("should generate MD5 hash", () => {
      const result = md5("hello");

      expect(result).toBe("5d41402abc4b2a76b9719d911017c592");
    });

    it("should generate consistent hashes", () => {
      const input = "test string";
      const result1 = md5(input);
      const result2 = md5(input);

      expect(result1).toBe(result2);
    });

    it("should handle empty string", () => {
      const result = md5("");

      expect(result).toBe("d41d8cd98f00b204e9800998ecf8427e");
    });

    it("should be case-sensitive", () => {
      const result1 = md5("Hello");
      const result2 = md5("hello");

      expect(result1).not.toBe(result2);
    });
  });

  describe("filterNullish", () => {
    it("should remove null values", () => {
      const obj = {
        a: "value",
        b: null,
        c: "another",
      };

      const result = filterNullish(obj);

      expect(result).toEqual({
        a: "value",
        c: "another",
      });
    });

    it("should remove undefined values", () => {
      const obj = {
        a: "value",
        b: undefined,
        c: "another",
      };

      const result = filterNullish(obj);

      expect(result).toEqual({
        a: "value",
        c: "another",
      });
    });

    it("should keep false values", () => {
      const obj = {
        a: false,
        b: null,
        c: true,
      };

      const result = filterNullish(obj);

      expect(result).toEqual({
        a: false,
        c: true,
      });
    });

    it("should keep zero values", () => {
      const obj = {
        a: 0,
        b: null,
        c: 42,
      };

      const result = filterNullish(obj);

      expect(result).toEqual({
        a: 0,
        c: 42,
      });
    });

    it("should keep empty string values", () => {
      const obj = {
        a: "",
        b: null,
        c: "text",
      };

      const result = filterNullish(obj);

      expect(result).toEqual({
        a: "",
        c: "text",
      });
    });

    it("should handle empty object", () => {
      const result = filterNullish({});

      expect(result).toEqual({});
    });

    it("should handle object with all nullish values", () => {
      const obj = {
        a: null,
        b: undefined,
      };

      const result = filterNullish(obj);

      expect(result).toEqual({});
    });
  });

  describe("toCamelCase", () => {
    it("should convert snake_case to camelCase", () => {
      expect(toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("should handle multiple underscores", () => {
      expect(toCamelCase("first_name_last_name")).toBe("firstNameLastName");
    });

    it("should handle string without underscores", () => {
      expect(toCamelCase("hello")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(toCamelCase("")).toBe("");
    });

    it("should handle uppercase letters after underscore", () => {
      // The regex only matches lowercase letters, so uppercase stays as-is
      expect(toCamelCase("hello_World")).toBe("hello_World");
    });

    it("should only convert lowercase letters after underscore", () => {
      // The regex only matches lowercase letters after underscore
      expect(toCamelCase("test_A_value")).toBe("test_AValue");
    });

    it("should handle consecutive underscores", () => {
      // With consecutive underscores, second one is followed by 'v' which gets converted
      expect(toCamelCase("test__value")).toBe("test_Value");
    });
  });

  describe("convertKeysToCamelCase", () => {
    it("should convert object keys from snake_case to camelCase", () => {
      const input = {
        first_name: "John",
        last_name: "Doe",
      };

      const result = convertKeysToCamelCase(input);

      expect(result).toEqual({
        firstName: "John",
        lastName: "Doe",
      });
    });

    it("should handle nested objects", () => {
      const input = {
        user_info: {
          first_name: "John",
          email_address: "john@example.com",
        },
      };

      const result = convertKeysToCamelCase(input);

      expect(result).toEqual({
        userInfo: {
          firstName: "John",
          emailAddress: "john@example.com",
        },
      });
    });

    it("should handle arrays", () => {
      const input = {
        user_list: [{ first_name: "John" }, { first_name: "Jane" }],
      };

      const result = convertKeysToCamelCase(input);

      expect(result).toEqual({
        userList: [{ firstName: "John" }, { firstName: "Jane" }],
      });
    });

    it("should handle null values", () => {
      const result = convertKeysToCamelCase(null);

      expect(result).toBeNull();
    });

    it("should handle undefined values", () => {
      const result = convertKeysToCamelCase(undefined);

      expect(result).toBeUndefined();
    });

    it("should handle primitive values", () => {
      expect(convertKeysToCamelCase("string")).toBe("string");
      expect(convertKeysToCamelCase(123)).toBe(123);
      expect(convertKeysToCamelCase(true)).toBe(true);
    });

    it("should handle empty object", () => {
      const result = convertKeysToCamelCase({});

      expect(result).toEqual({});
    });

    it("should handle deeply nested structures", () => {
      const input = {
        level_one: {
          level_two: {
            level_three: {
              deep_value: "test",
            },
          },
        },
      };

      const result = convertKeysToCamelCase(input);

      expect(result).toEqual({
        levelOne: {
          levelTwo: {
            levelThree: {
              deepValue: "test",
            },
          },
        },
      });
    });

    it("should handle mixed case keys", () => {
      const input = {
        alreadyCamel: "value1",
        snake_case: "value2",
        UPPERCASE: "value3",
      };

      const result = convertKeysToCamelCase(input);

      expect(result).toEqual({
        alreadyCamel: "value1",
        snakeCase: "value2",
        UPPERCASE: "value3",
      });
    });
  });
});

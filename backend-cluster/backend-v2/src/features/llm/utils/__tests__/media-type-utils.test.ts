import { classifyFile } from "../media-type-utils";

describe("classifyFile", () => {
  describe("format fallback (no mediaType)", () => {
    it("should return text for csv, ofx, qfx, txt, json, xml", () => {
      expect(classifyFile("csv")).toBe("text");
      expect(classifyFile("ofx")).toBe("text");
      expect(classifyFile("qfx")).toBe("text");
      expect(classifyFile("txt")).toBe("text");
      expect(classifyFile("json")).toBe("text");
      expect(classifyFile("xml")).toBe("text");
    });

    it("should return image for jpg, jpeg, png, gif, webp, image", () => {
      expect(classifyFile("jpg")).toBe("image");
      expect(classifyFile("jpeg")).toBe("image");
      expect(classifyFile("png")).toBe("image");
      expect(classifyFile("gif")).toBe("image");
      expect(classifyFile("webp")).toBe("image");
      expect(classifyFile("image")).toBe("image");
    });

    it("should return file for pdf", () => {
      expect(classifyFile("pdf")).toBe("file");
    });

    it("should return file for xlsx, xls", () => {
      expect(classifyFile("xlsx")).toBe("file");
      expect(classifyFile("xls")).toBe("file");
    });

    it("should be case-insensitive", () => {
      expect(classifyFile("CSV")).toBe("text");
      expect(classifyFile("PNG")).toBe("image");
    });
  });

  describe("mediaType takes precedence", () => {
    it("should return image when mediaType starts with image/", () => {
      expect(classifyFile("unknown", "image/jpeg")).toBe("image");
      expect(classifyFile("unknown", "image/png")).toBe("image");
    });

    it("should return text for text/* media types", () => {
      expect(classifyFile("unknown", "text/plain")).toBe("text");
      expect(classifyFile("unknown", "text/csv")).toBe("text");
    });

    it("should return text for application/json, application/xml, application/x-ofx", () => {
      expect(classifyFile("unknown", "application/json")).toBe("text");
      expect(classifyFile("unknown", "application/xml")).toBe("text");
      expect(classifyFile("unknown", "application/x-ofx")).toBe("text");
    });

    it("should return file for application/pdf", () => {
      expect(classifyFile("unknown", "application/pdf")).toBe("file");
    });

    it("should ignore application/octet-stream and fall back to format", () => {
      expect(classifyFile("csv", "application/octet-stream")).toBe("text");
      expect(classifyFile("png", "application/octet-stream")).toBe("image");
      expect(classifyFile("pdf", "application/octet-stream")).toBe("file");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  detectFileFormat,
  getFormatDisplayName,
  isSupportedFormat,
  getMimeType,
  type FileFormat,
} from "../file-format-detector";

/**
 * Helper to create a File-like object for testing.
 */
function makeFile(name: string, type: string): File {
  return new File([""], name, { type });
}

describe("file-format-detector", () => {
  describe("detectFileFormat", () => {
    it("should detect CSV by extension", () => {
      const file = makeFile("transactions.csv", "");
      expect(detectFileFormat(file)).toBe("csv");
    });

    it("should detect CSV by MIME type", () => {
      const file = makeFile("data.txt", "text/csv");
      expect(detectFileFormat(file)).toBe("csv");
    });

    it("should detect PDF by extension", () => {
      const file = makeFile("statement.pdf", "");
      expect(detectFileFormat(file)).toBe("pdf");
    });

    it("should detect PDF by MIME type", () => {
      const file = makeFile("document", "application/pdf");
      expect(detectFileFormat(file)).toBe("pdf");
    });

    it("should detect OFX by extension", () => {
      const file = makeFile("bank.ofx", "");
      expect(detectFileFormat(file)).toBe("ofx");
    });

    it("should detect QFX by extension", () => {
      const file = makeFile("bank.qfx", "");
      expect(detectFileFormat(file)).toBe("ofx");
    });

    it("should detect PNG image by extension", () => {
      const file = makeFile("receipt.png", "");
      expect(detectFileFormat(file)).toBe("image");
    });

    it("should detect JPEG image by extension (jpg)", () => {
      const file = makeFile("receipt.jpg", "");
      expect(detectFileFormat(file)).toBe("image");
    });

    it("should detect JPEG image by extension (jpeg)", () => {
      const file = makeFile("receipt.jpeg", "");
      expect(detectFileFormat(file)).toBe("image");
    });

    it("should detect image by MIME type", () => {
      const file = makeFile("photo.webp", "image/webp");
      expect(detectFileFormat(file)).toBe("image");
    });

    it("should return 'unknown' for unsupported formats", () => {
      const file = makeFile("data.xlsx", "application/vnd.ms-excel");
      expect(detectFileFormat(file)).toBe("unknown");
    });

    it("should be case-insensitive for extensions", () => {
      const file = makeFile("TRANSACTIONS.CSV", "");
      expect(detectFileFormat(file)).toBe("csv");
    });

    it("should return 'unknown' when no extension and no known MIME type", () => {
      const file = makeFile("noextension", "");
      expect(detectFileFormat(file)).toBe("unknown");
    });
  });

  describe("getFormatDisplayName", () => {
    it("should return 'CSV' for csv format", () => {
      expect(getFormatDisplayName("csv")).toBe("CSV");
    });

    it("should return 'PDF' for pdf format", () => {
      expect(getFormatDisplayName("pdf")).toBe("PDF");
    });

    it("should return 'OFX' for ofx format", () => {
      expect(getFormatDisplayName("ofx")).toBe("OFX");
    });

    it("should return 'Image' for image format", () => {
      expect(getFormatDisplayName("image")).toBe("Image");
    });

    it("should return 'Unknown' for unknown format", () => {
      expect(getFormatDisplayName("unknown")).toBe("Unknown");
    });
  });

  describe("isSupportedFormat", () => {
    const supportedFormats: FileFormat[] = ["csv", "pdf", "ofx", "image"];

    supportedFormats.forEach((format) => {
      it(`should return true for supported format: ${format}`, () => {
        expect(isSupportedFormat(format)).toBe(true);
      });
    });

    it("should return false for 'unknown' format", () => {
      expect(isSupportedFormat("unknown")).toBe(false);
    });
  });

  describe("getMimeType", () => {
    it("should return 'application/pdf' for pdf format", () => {
      expect(getMimeType("file.pdf", "pdf")).toBe("application/pdf");
    });

    it("should return 'text/csv' for csv format", () => {
      expect(getMimeType("data.csv", "csv")).toBe("text/csv");
    });

    it("should return 'application/x-ofx' for ofx format", () => {
      expect(getMimeType("bank.ofx", "ofx")).toBe("application/x-ofx");
    });

    it("should return 'image/png' for png image", () => {
      expect(getMimeType("receipt.png", "image")).toBe("image/png");
    });

    it("should return 'image/jpeg' for jpg image", () => {
      expect(getMimeType("receipt.jpg", "image")).toBe("image/jpeg");
    });

    it("should return 'image/jpeg' for jpeg image", () => {
      expect(getMimeType("receipt.jpeg", "image")).toBe("image/jpeg");
    });

    it("should return 'image/png' as default for image without recognised extension", () => {
      expect(getMimeType("photo.webp", "image")).toBe("image/png");
    });

    it("should return 'application/octet-stream' for unknown format", () => {
      expect(getMimeType("data.bin", "unknown")).toBe(
        "application/octet-stream",
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getParentPath,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isTextFile,
  isPDFFile,
  getFileLanguage,
  getFilename,
  getMimeTypeFromExtension,
  getFileType,
  downloadFile,
} from "../utils";

describe("Files Utility", () => {
  describe("getParentPath", () => {
    it("should return parent path for nested file", () => {
      const result = getParentPath("folder/subfolder/file.txt");
      expect(result).toBe("folder/subfolder");
    });

    it("should return parent path for single level file", () => {
      const result = getParentPath("folder/file.txt");
      expect(result).toBe("folder");
    });

    it("should return empty string for root level file", () => {
      const result = getParentPath("file.txt");
      expect(result).toBe("");
    });

    it("should handle paths with multiple levels", () => {
      const result = getParentPath("a/b/c/d/e/file.txt");
      expect(result).toBe("a/b/c/d/e");
    });

    it("should handle directory paths (ending with /)", () => {
      const result = getParentPath("folder/subfolder/");
      expect(result).toBe("folder/subfolder");
    });

    it("should handle empty string", () => {
      const result = getParentPath("");
      expect(result).toBe("");
    });

    it("should handle paths with spaces", () => {
      const result = getParentPath("my folder/my file.txt");
      expect(result).toBe("my folder");
    });

    it("should handle paths with dots in folder names", () => {
      const result = getParentPath("folder.name/file.txt");
      expect(result).toBe("folder.name");
    });

    it("should handle paths with special characters", () => {
      const result = getParentPath("folder-name/sub_folder/file.txt");
      expect(result).toBe("folder-name/sub_folder");
    });
  });

  describe("formatFileSize", () => {
    it("should format 0 bytes", () => {
      const result = formatFileSize(0);
      expect(result).toBe("0 B");
    });

    it("should format bytes (less than 1 KB)", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 2)).toBe("2 MB");
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatFileSize(1024 * 1024 * 1024 * 2)).toBe("2 GB");
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe("1.5 GB");
    });

    it("should round to 2 decimal places", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1234)).toBe("1.21 KB");
      expect(formatFileSize(1234567)).toBe("1.18 MB");
    });

    it("should handle edge case at KB boundary", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1025)).toBe("1 KB");
    });

    it("should handle edge case at MB boundary", () => {
      const oneMB = 1024 * 1024;
      expect(formatFileSize(oneMB - 1)).toBe("1024 KB");
      expect(formatFileSize(oneMB)).toBe("1 MB");
      expect(formatFileSize(oneMB + 1)).toBe("1 MB");
    });

    it("should handle edge case at GB boundary", () => {
      const oneGB = 1024 * 1024 * 1024;
      expect(formatFileSize(oneGB - 1)).toBe("1024 MB");
      expect(formatFileSize(oneGB)).toBe("1 GB");
      expect(formatFileSize(oneGB + 1)).toBe("1 GB");
    });

    it("should handle fractional kilobytes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2560)).toBe("2.5 KB");
    });

    it("should handle fractional megabytes", () => {
      expect(formatFileSize(1024 * 1024 * 2.75)).toBe("2.75 MB");
    });

    it("should handle large file sizes", () => {
      const result = formatFileSize(1024 * 1024 * 1024 * 10);
      expect(result).toBe("10 GB");
    });

    it("should handle very small non-zero values", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(10)).toBe("10 B");
      expect(formatFileSize(100)).toBe("100 B");
    });

    it("should handle values just under size boundaries", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1024 * 1024 - 1)).toBe("1024 KB");
      expect(formatFileSize(1024 * 1024 * 1024 - 1)).toBe("1024 MB");
    });
  });

  describe("getFileExtension", () => {
    it("should return lowercase file extension", () => {
      expect(getFileExtension("file.txt")).toBe("txt");
      expect(getFileExtension("document.PDF")).toBe("pdf");
      expect(getFileExtension("image.PNG")).toBe("png");
    });

    it("should handle multiple dots in filename", () => {
      expect(getFileExtension("archive.tar.gz")).toBe("gz");
      expect(getFileExtension("file.backup.txt")).toBe("txt");
    });

    it("should return empty string for files without extension", () => {
      expect(getFileExtension("Makefile")).toBe("");
      expect(getFileExtension("README")).toBe("");
    });

    it("should handle paths with directories", () => {
      expect(getFileExtension("folder/file.txt")).toBe("txt");
      expect(getFileExtension("a/b/c/file.json")).toBe("json");
    });

    it("should return empty string for empty input", () => {
      expect(getFileExtension("")).toBe("");
    });

    it("should handle special characters in extension", () => {
      expect(getFileExtension("file.Bean")).toBe("bean");
      expect(getFileExtension("file.BEANCOUNT")).toBe("beancount");
    });
  });

  describe("isImageFile", () => {
    it("should return true for common image formats", () => {
      expect(isImageFile("image.jpg")).toBe(true);
      expect(isImageFile("image.jpeg")).toBe(true);
      expect(isImageFile("image.png")).toBe(true);
      expect(isImageFile("image.gif")).toBe(true);
      expect(isImageFile("image.bmp")).toBe(true);
      expect(isImageFile("image.svg")).toBe(true);
      expect(isImageFile("image.webp")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isImageFile("image.JPG")).toBe(true);
      expect(isImageFile("image.PNG")).toBe(true);
      expect(isImageFile("image.SVG")).toBe(true);
    });

    it("should return false for non-image files", () => {
      expect(isImageFile("document.pdf")).toBe(false);
      expect(isImageFile("script.js")).toBe(false);
      expect(isImageFile("style.css")).toBe(false);
      expect(isImageFile("data.beancount")).toBe(false);
    });

    it("should handle paths with directories", () => {
      expect(isImageFile("images/photo.jpg")).toBe(true);
      expect(isImageFile("docs/file.txt")).toBe(false);
    });

    it("should return false for empty filename", () => {
      expect(isImageFile("")).toBe(false);
    });
  });

  describe("isTextFile", () => {
    it("should return true for common text formats", () => {
      expect(isTextFile("readme.txt")).toBe(true);
      expect(isTextFile("readme.md")).toBe(true);
      expect(isTextFile("config.json")).toBe(true);
      expect(isTextFile("config.yaml")).toBe(true);
      expect(isTextFile("config.yml")).toBe(true);
    });

    it("should return true for code files", () => {
      expect(isTextFile("script.js")).toBe(true);
      expect(isTextFile("app.ts")).toBe(true);
      expect(isTextFile("component.tsx")).toBe(true);
      expect(isTextFile("component.jsx")).toBe(true);
      expect(isTextFile("main.py")).toBe(true);
      expect(isTextFile("Main.java")).toBe(true);
      expect(isTextFile("main.cpp")).toBe(true);
      expect(isTextFile("main.c")).toBe(true);
      expect(isTextFile("header.h")).toBe(true);
    });

    it("should return true for markup and style files", () => {
      expect(isTextFile("index.html")).toBe(true);
      expect(isTextFile("style.css")).toBe(true);
      expect(isTextFile("data.xml")).toBe(true);
    });

    it("should return true for beancount files", () => {
      expect(isTextFile("ledger.beancount")).toBe(true);
      expect(isTextFile("ledger.bean")).toBe(true);
    });

    it("should return true for shell scripts", () => {
      expect(isTextFile("script.sh")).toBe(true);
      expect(isTextFile("script.bash")).toBe(true);
    });

    it("should return true for SQL files", () => {
      expect(isTextFile("query.sql")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isTextFile("FILE.TXT")).toBe(true);
      expect(isTextFile("README.MD")).toBe(true);
      expect(isTextFile("SCRIPT.SH")).toBe(true);
    });

    it("should return false for binary files", () => {
      expect(isTextFile("image.png")).toBe(false);
      expect(isTextFile("document.pdf")).toBe(false);
      expect(isTextFile("archive.zip")).toBe(false);
      expect(isTextFile("app.exe")).toBe(false);
    });

    it("should return false for empty filename", () => {
      expect(isTextFile("")).toBe(false);
    });

    it("should return true for well-known extensionless text basenames", () => {
      expect(isTextFile("LICENSE")).toBe(true);
      expect(isTextFile("LICENCE")).toBe(true);
      expect(isTextFile("COPYING")).toBe(true);
      expect(isTextFile("Makefile")).toBe(true);
      expect(isTextFile("Dockerfile")).toBe(true);
      expect(isTextFile("CONTRIBUTING")).toBe(true);
      expect(isTextFile("CODE_OF_CONDUCT")).toBe(true);
      expect(isTextFile("CHANGELOG")).toBe(true);
      expect(isTextFile("README")).toBe(true);
    });

    it("should return true for dotfiles", () => {
      expect(isTextFile(".gitignore")).toBe(true);
      expect(isTextFile(".gitattributes")).toBe(true);
      expect(isTextFile(".editorconfig")).toBe(true);
      expect(isTextFile(".env.example")).toBe(true);
    });

    it("should be case-insensitive for basenames", () => {
      expect(isTextFile("license")).toBe(true);
      expect(isTextFile("License")).toBe(true);
      expect(isTextFile("MAKEFILE")).toBe(true);
      expect(isTextFile("dockerfile")).toBe(true);
      expect(isTextFile(".GITIGNORE")).toBe(true);
    });

    it("should handle paths with directories for basenames", () => {
      expect(isTextFile("a/b/LICENSE")).toBe(true);
      expect(isTextFile("src/Makefile")).toBe(true);
      expect(isTextFile("deep/nested/.gitignore")).toBe(true);
    });

    it("should return false for unknown extensionless files", () => {
      expect(isTextFile("archive.zip")).toBe(false);
      expect(isTextFile("binary")).toBe(false);
      expect(isTextFile("file.unknown")).toBe(false);
    });
  });

  describe("isPDFFile", () => {
    it("should return true for PDF files", () => {
      expect(isPDFFile("document.pdf")).toBe(true);
      expect(isPDFFile("report.PDF")).toBe(true);
      expect(isPDFFile("invoice.Pdf")).toBe(true);
    });

    it("should return false for non-PDF files", () => {
      expect(isPDFFile("document.txt")).toBe(false);
      expect(isPDFFile("image.png")).toBe(false);
      expect(isPDFFile("file.beancount")).toBe(false);
    });

    it("should handle paths with directories", () => {
      expect(isPDFFile("docs/document.pdf")).toBe(true);
      expect(isPDFFile("reports/2023/annual.PDF")).toBe(true);
    });

    it("should return false for empty filename", () => {
      expect(isPDFFile("")).toBe(false);
    });

    it("should not match files with pdf in the name but different extension", () => {
      expect(isPDFFile("pdf-file.txt")).toBe(false);
      expect(isPDFFile("mypdf.doc")).toBe(false);
    });
  });

  describe("getFileLanguage", () => {
    it("should return javascript for js and jsx files", () => {
      expect(getFileLanguage("script.js")).toBe("javascript");
      expect(getFileLanguage("component.jsx")).toBe("javascript");
    });

    it("should return typescript for ts and tsx files", () => {
      expect(getFileLanguage("module.ts")).toBe("typescript");
      expect(getFileLanguage("component.tsx")).toBe("typescript");
    });

    it("should return json for json files", () => {
      expect(getFileLanguage("config.json")).toBe("json");
      expect(getFileLanguage("package.JSON")).toBe("json");
    });

    it("should return html for html files", () => {
      expect(getFileLanguage("index.html")).toBe("html");
    });

    it("should return css for css files", () => {
      expect(getFileLanguage("style.css")).toBe("css");
    });

    it("should return python for py files", () => {
      expect(getFileLanguage("script.py")).toBe("python");
    });

    it("should return markdown for md files", () => {
      expect(getFileLanguage("readme.md")).toBe("markdown");
      expect(getFileLanguage("CHANGELOG.MD")).toBe("markdown");
    });

    it("should return sql for sql files", () => {
      expect(getFileLanguage("query.sql")).toBe("sql");
    });

    it("should return yaml for yaml and yml files", () => {
      expect(getFileLanguage("config.yaml")).toBe("yaml");
      expect(getFileLanguage("config.yml")).toBe("yaml");
    });

    it("should return xml for xml files", () => {
      expect(getFileLanguage("data.xml")).toBe("xml");
    });

    it("should return shell for sh and bash files", () => {
      expect(getFileLanguage("script.sh")).toBe("shell");
      expect(getFileLanguage("script.bash")).toBe("shell");
    });

    it("should return beancount for bean and beancount files", () => {
      expect(getFileLanguage("ledger.bean")).toBe("beancount");
      expect(getFileLanguage("ledger.beancount")).toBe("beancount");
    });

    it("should return plaintext for unknown extensions", () => {
      expect(getFileLanguage("file.unknown")).toBe("plaintext");
      expect(getFileLanguage("file.xyz")).toBe("plaintext");
      expect(getFileLanguage("file")).toBe("plaintext");
    });

    it("should be case insensitive", () => {
      expect(getFileLanguage("FILE.JS")).toBe("javascript");
      expect(getFileLanguage("CONFIG.YAML")).toBe("yaml");
      expect(getFileLanguage("LEDGER.BEANCOUNT")).toBe("beancount");
    });

    it("should handle paths with directories", () => {
      expect(getFileLanguage("src/components/App.tsx")).toBe("typescript");
      expect(getFileLanguage("ledger/main.beancount")).toBe("beancount");
    });

    it("should return plaintext for empty filename", () => {
      expect(getFileLanguage("")).toBe("plaintext");
    });

    it("should return makefile for Makefile and GNUmakefile", () => {
      expect(getFileLanguage("Makefile")).toBe("makefile");
      expect(getFileLanguage("GNUmakefile")).toBe("makefile");
      expect(getFileLanguage("makefile")).toBe("makefile");
      expect(getFileLanguage("src/Makefile")).toBe("makefile");
    });

    it("should return dockerfile for Dockerfile and Containerfile", () => {
      expect(getFileLanguage("Dockerfile")).toBe("dockerfile");
      expect(getFileLanguage("Containerfile")).toBe("dockerfile");
      expect(getFileLanguage("dockerfile")).toBe("dockerfile");
    });

    it("should return markdown for extensionless README", () => {
      expect(getFileLanguage("README")).toBe("markdown");
      expect(getFileLanguage("readme")).toBe("markdown");
      expect(getFileLanguage("a/b/README")).toBe("markdown");
    });

    it("should return plaintext for LICENSE and other text basenames", () => {
      expect(getFileLanguage("LICENSE")).toBe("plaintext");
      expect(getFileLanguage(".gitignore")).toBe("plaintext");
    });
  });

  describe("getFilename", () => {
    it("should return the filename from a simple path", () => {
      expect(getFilename("folder/file.txt")).toBe("file.txt");
    });

    it("should return the filename from a nested path", () => {
      expect(getFilename("a/b/c/d/file.beancount")).toBe("file.beancount");
    });

    it("should return the filename itself when there is no directory", () => {
      expect(getFilename("file.txt")).toBe("file.txt");
    });

    it("should return empty string for empty path", () => {
      expect(getFilename("")).toBe("");
    });

    it("should return empty string for path ending with slash", () => {
      expect(getFilename("folder/")).toBe("");
    });

    it("should handle filenames with multiple dots", () => {
      expect(getFilename("folder/archive.tar.gz")).toBe("archive.tar.gz");
    });
  });

  describe("getMimeTypeFromExtension", () => {
    it("should return text/plain for text-based extensions", () => {
      expect(getMimeTypeFromExtension("file.txt")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.md")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.json")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.yaml")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.yml")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.xml")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.html")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.css")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.js")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.ts")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.tsx")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.jsx")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.py")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.java")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.cpp")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.c")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.h")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.sql")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.sh")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.bash")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.beancount")).toBe("text/plain");
      expect(getMimeTypeFromExtension("file.bean")).toBe("text/plain");
    });

    it("should return image/svg+xml for svg files", () => {
      expect(getMimeTypeFromExtension("icon.svg")).toBe("image/svg+xml");
    });

    it("should return image/png for png files", () => {
      expect(getMimeTypeFromExtension("image.png")).toBe("image/png");
    });

    it("should return image/jpeg for jpg and jpeg files", () => {
      expect(getMimeTypeFromExtension("photo.jpg")).toBe("image/jpeg");
      expect(getMimeTypeFromExtension("photo.jpeg")).toBe("image/jpeg");
    });

    it("should return image/gif for gif files", () => {
      expect(getMimeTypeFromExtension("animation.gif")).toBe("image/gif");
    });

    it("should return image/webp for webp files", () => {
      expect(getMimeTypeFromExtension("image.webp")).toBe("image/webp");
    });

    it("should return application/octet-stream for unknown extensions", () => {
      expect(getMimeTypeFromExtension("file.xyz")).toBe(
        "application/octet-stream",
      );
      expect(getMimeTypeFromExtension("file.unknown")).toBe(
        "application/octet-stream",
      );
      expect(getMimeTypeFromExtension("file")).toBe("application/octet-stream");
    });

    it("should return text/plain for well-known basenames", () => {
      expect(getMimeTypeFromExtension("LICENSE")).toBe("text/plain");
      expect(getMimeTypeFromExtension("Makefile")).toBe("text/plain");
      expect(getMimeTypeFromExtension(".gitignore")).toBe("text/plain");
      expect(getMimeTypeFromExtension("a/b/Dockerfile")).toBe("text/plain");
    });
  });

  describe("getFileType", () => {
    it("should return 'image' for image files", () => {
      expect(getFileType("photo.jpg")).toBe("image");
      expect(getFileType("photo.jpeg")).toBe("image");
      expect(getFileType("image.png")).toBe("image");
      expect(getFileType("animation.gif")).toBe("image");
      expect(getFileType("icon.svg")).toBe("image");
      expect(getFileType("image.webp")).toBe("image");
      expect(getFileType("image.bmp")).toBe("image");
    });

    it("should return 'pdf' for PDF files", () => {
      expect(getFileType("document.pdf")).toBe("pdf");
      expect(getFileType("report.PDF")).toBe("pdf");
    });

    it("should return 'text' for text-based files", () => {
      expect(getFileType("file.txt")).toBe("text");
      expect(getFileType("readme.md")).toBe("text");
      expect(getFileType("ledger.beancount")).toBe("text");
      expect(getFileType("ledger.bean")).toBe("text");
      expect(getFileType("config.json")).toBe("text");
      expect(getFileType("script.ts")).toBe("text");
    });

    it("should return 'unknown' for unrecognized files", () => {
      expect(getFileType("file.xyz")).toBe("unknown");
      expect(getFileType("archive.zip")).toBe("unknown");
      expect(getFileType("file")).toBe("unknown");
    });

    it("should return 'text' for well-known extensionless files", () => {
      expect(getFileType("LICENSE")).toBe("text");
      expect(getFileType("Makefile")).toBe("text");
      expect(getFileType("Dockerfile")).toBe("text");
      expect(getFileType(".gitignore")).toBe("text");
      expect(getFileType("a/b/CONTRIBUTING")).toBe("text");
      expect(getFileType("README")).toBe("text");
    });

    it("should return 'unknown' for truly unknown extensionless binaries", () => {
      expect(getFileType("binary")).toBe("unknown");
      expect(getFileType("randomfile")).toBe("unknown");
    });
  });

  describe("downloadFile", () => {
    let mockLink: HTMLAnchorElement;
    let appendChildSpy: ReturnType<typeof vi.fn>;
    let removeSpy: ReturnType<typeof vi.fn>;
    let clickSpy: ReturnType<typeof vi.fn>;
    let createElementSpy: ReturnType<typeof vi.fn>;
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      clickSpy = vi.fn();
      removeSpy = vi.fn();
      mockLink = {
        href: "",
        download: "",
        click: clickSpy,
        remove: removeSpy,
      } as unknown as HTMLAnchorElement;

      createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue(mockLink);
      appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockReturnValue(mockLink);
      createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
      revokeObjectURLSpy = vi.fn();
      global.URL.createObjectURL = createObjectURLSpy;
      global.URL.revokeObjectURL = revokeObjectURLSpy;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should do nothing when base64Content is empty", () => {
      downloadFile("file.txt", "");
      expect(createElementSpy).not.toHaveBeenCalled();
    });

    it("should create a download link for image files with correct href", () => {
      downloadFile("photo.png", "base64encodedcontent");
      expect(mockLink.href).toBe("data:image/png;base64,base64encodedcontent");
      expect(mockLink.download).toBe("photo.png");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it("should create a download link for text files using a Blob", () => {
      downloadFile("ledger.beancount", btoa('2024-01-01 * "Test"'));
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.href).toBe("blob:mock-url");
      expect(mockLink.download).toBe("ledger.beancount");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should create a download link for unknown files as binary", () => {
      downloadFile("archive.bin", "base64encodedcontent");
      expect(mockLink.href).toBe(
        "data:application/octet-stream;base64,base64encodedcontent",
      );
      expect(mockLink.download).toBe("archive.bin");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it("should use correct MIME type for SVG image files", () => {
      downloadFile("icon.svg", "base64encodedsvg");
      expect(mockLink.href).toBe("data:image/svg+xml;base64,base64encodedsvg");
    });

    it("should use correct MIME type for JPEG image files", () => {
      downloadFile("photo.jpg", "base64encodedjpeg");
      expect(mockLink.href).toBe("data:image/jpeg;base64,base64encodedjpeg");
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "../text";

describe("shared text download", () => {
  afterEach(() => vi.restoreAllMocks());

  it("downloads the requested MIME type and always revokes the object URL", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:markdown");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    let clickedDownload: string | undefined;
    let clickedHref: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function captureClick() {
        clickedDownload = this.download;
        clickedHref = this.href;
      },
    );

    downloadText("# Statement", "statement.md", "text/markdown;charset=utf-8");

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(clickedDownload).toBe("statement.md");
    expect(clickedHref).toBe("blob:markdown");
    expect(document.querySelector('a[download="statement.md"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:markdown");
  });
});

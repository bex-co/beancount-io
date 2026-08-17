/** Download UTF-8 plain text with a caller-supplied text MIME type. */
export function downloadText(
  content: string,
  filename: string,
  mimeType: string = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  let appended = false;
  try {
    document.body.appendChild(link);
    appended = true;
    link.click();
  } finally {
    try {
      if (appended) document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

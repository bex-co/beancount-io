import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { homedir } from "os";

function browserBinary(): string {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = path.join(
    homedir(),
    process.platform === "darwin"
      ? "Library/Caches/ms-playwright"
      : ".cache/ms-playwright",
  );
  if (fs.existsSync(cache)) {
    const installs = fs
      .readdirSync(cache)
      .filter((name) => name.startsWith("chromium_headless_shell-"))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const install of installs) {
      const directory = path.join(cache, install);
      for (const folder of fs.readdirSync(directory)) {
        for (const name of ["chrome-headless-shell", "headless_shell"]) {
          const candidate = path.join(directory, folder, name);
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  }
  return process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "chromium";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function imageData(file: string): string {
  const mime = path.extname(file) === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

// Chromium supplies Unicode shaping and bidi layout, including Persian. Assets
// are embedded so rendering cannot depend on a network resource or live ledger.
export function renderStoreHtml(
  html: string,
  output: string,
  width: number,
  height: number,
): void {
  const scratch = path.resolve("tmp/store-artwork-browser");
  fs.mkdirSync(scratch, { recursive: true });
  const input = path.join(scratch, "artwork.html");
  const raw = path.join(scratch, "artwork.png");
  fs.writeFileSync(
    input,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}*{box-sizing:border-box}</style>${html}`,
  );
  const chrome = browserBinary();
  try {
    execFileSync(
      chrome,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--disable-background-networking",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${path.join(scratch, "profile")}`,
        "--force-device-scale-factor=1",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=1000",
        `--window-size=${width},${height}`,
        `--screenshot=${raw}`,
        `file://${input}`,
      ],
      { stdio: "pipe", timeout: 60_000 },
    );
    execFileSync("magick", [
      raw,
      "-background",
      "#10160e",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      "-strip",
      `PNG24:${output}`,
    ]);
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(raw, { force: true });
  }
}

export function renderPlayArtwork(
  source: string,
  caption: string,
  output: string,
  width: number,
  height: number,
  feature: boolean,
  rtl: boolean,
): void {
  const icon = feature
    ? imageData(path.resolve("src/assets/images/icon.png"))
    : undefined;
  const common = `font-family:Arial,'Noto Sans','Noto Sans Arabic','Arial Unicode MS',sans-serif;color:#f4f2eb;background:#10160e;`;
  const content = feature
    ? `<main style="${common}width:100%;height:100%;display:flex;align-items:center;padding:64px;gap:48px" dir="${rtl ? "rtl" : "ltr"}"><img src="${icon}" style="width:200px;height:200px;border-radius:40px"><section style="flex:1"><div style="font-size:40px;margin-bottom:24px" dir="ltr">Beancount.io</div><div style="font-size:42px;line-height:1.35">${escapeHtml(caption)}</div></section></main>`
    : `<main style="${common}width:100%;height:100%;display:flex;flex-direction:column;align-items:center;padding-top:32px"><div dir="${rtl ? "rtl" : "ltr"}" style="height:320px;width:960px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:60px;line-height:1.25;padding:24px">${escapeHtml(caption)}</div><img src="${imageData(source)}" style="height:${height - 352}px;max-width:100%;object-fit:contain"></main>`;
  renderStoreHtml(content, output, width, height);
}

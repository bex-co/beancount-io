import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileAppCss, parseRules } from "./tailwind";

/**
 * WCAG contrast of Tailwind text on a Tailwind background, measured from the
 * app's own theme tokens the way a browser composites them. For tests that
 * pin a contrast floor, which a class-name check alone cannot show (w2/107).
 */

type Rgb = [number, number, number];
export type Theme = ":root" | ".dark";

/** OKLCH to linear sRGB (Björn Ottosson's matrices), clamped to gamut. */
function oklchToLinearSrgb(l: number, c: number, h: number): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((value) => value ** 3);
  return [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ].map((value) => Math.min(1, Math.max(0, value))) as Rgb;
}

const encode = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const decode = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function token(theme: Theme, name: string): Rgb {
  const stylesheet = readFileSync(resolve("src/style.css"), "utf8");
  const block = new RegExp(
    `^${theme.replace(".", "\\.")} \\{([^}]*)\\}`,
    "m",
  ).exec(stylesheet)?.[1];
  const value = new RegExp(
    `--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`,
  ).exec(block ?? "");
  if (!value) throw new Error(`${theme} has no oklch --${name}`);
  return oklchToLinearSrgb(
    Number(value[1]),
    Number(value[2]),
    Number(value[3]),
  );
}

/** The token and opacity a compiled rule's `color` paints with. */
function paint(rule: string): { token: string; alpha: number } {
  // The last declaration wins where `color-mix` is supported.
  const value =
    [...rule.matchAll(/(?<![-\w])color:\s*([^;]+);/g)].at(-1)?.[1] ?? "";
  const mix =
    /color-mix\(in \w+, var\(--([\w-]+)\) ([\d.]+)%, transparent\)/.exec(value);
  if (mix) return { token: mix[1], alpha: Number(mix[2]) / 100 };
  const plain = /^var\(--([\w-]+)\)$/.exec(value.trim());
  if (plain) return { token: plain[1], alpha: 1 };
  throw new Error(`unrecognized color: ${value}`);
}

/**
 * Contrast of the text `textClass` paints over the opaque background that
 * one of `backgroundClasses` sets, in `theme`.
 */
export async function textContrast(
  textClass: string,
  backgroundClasses: string[],
  theme: Theme,
): Promise<number> {
  const rules = parseRules(
    await compileAppCss([textClass, ...backgroundClasses]),
  );
  const text = paint(rules.get(textClass) ?? "");
  const background = /background-color:\s*var\(--([\w-]+)\)/.exec(
    backgroundClasses.map((name) => rules.get(name) ?? "").join("\n"),
  )?.[1];
  if (!background) throw new Error("no background token");

  const fg = token(theme, text.token);
  const bg = token(theme, background);
  const mixed = fg.map((value, i) =>
    decode(text.alpha * encode(value) + (1 - text.alpha) * encode(bg[i])),
  ) as Rgb;
  const [high, low] = [luminance(mixed), luminance(bg)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

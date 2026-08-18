/**
 * Which way the app lays out, and everything that has to agree with it.
 *
 * Persian is fully translated as of `w1/m30`, but translation is only half of
 * a locale: until this module existed the app called nothing on `I18nManager`,
 * so Persian text rendered inside a left-to-right shell — drawer on the wrong
 * edge, disclosure chevrons pointing away from the content they open.
 *
 * ## Why the direction lives here and not at the call sites
 *
 * Five places need the answer — boot, the language picker, the icon helper,
 * the drawer, the charts — and the cheap version of each is a local
 * `I18nManager.isRTL`. That is the shape that ends up correct in four places
 * and wrong in the fifth after the next feature lands. One predicate, one set
 * of RTL locales, one place to change when a second RTL language ships.
 *
 * ## The restart is not incidental
 *
 * `I18nManager.forceRTL` does not re-lay-out a running app; the native side
 * reads the flag at startup. So `applyLayoutDirection` reports whether it
 * actually moved the flag, and a `true` means the caller must restart before
 * anything on screen can be trusted. Callers that ignore the return value get
 * an app where half the tree believes one direction and half the other.
 *
 * Imports `react-native` only — the unit tests intercept that one module, the
 * way `haptics.ts` and its test do for `expo-haptics`.
 */
import { I18nManager } from "react-native";

/**
 * The locales whose layout mirrors. `fa` is the only one the app ships today.
 *
 * This is the single place a locale gets classified, which is what lets
 * `rtl.test.ts` assert over the whole of `SUPPORTED_LOCALES`: adding a
 * fourteenth locale without deciding its direction fails a test instead of
 * quietly shipping a screen that reads backwards.
 */
const RTL_LOCALES = ["fa"];

/**
 * Bare language code, so a regional tag (`fa-IR`) classifies like its base
 * language. `getLocale()` in `src/translations/index.ts` already narrows to a
 * `languageCode`, but a persisted value from an older build need not have.
 */
const languageOf = (locale: string): string => locale.split("-")[0];

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(languageOf(locale));
}

/**
 * Whether moving from `from` to `to` crosses the direction boundary.
 *
 * The language picker needs this rather than `to === "fa"`: `de` → `fr` must
 * stay instant, and only a crossing costs the user a restart.
 */
export function layoutDirectionChanges(from: string, to: string): boolean {
  return isRtlLocale(from) !== isRtlLocale(to);
}

/**
 * Point the native layout engine at the direction `locale` reads in.
 *
 * Returns whether the flag actually moved — `false` on the overwhelmingly
 * common launch, where it already agrees and nothing needs to happen. A `true`
 * obliges the caller to restart.
 *
 * `allowRTL` is set alongside `forceRTL` rather than pinned to `true`: the app
 * language is chosen in the app, so an English app on a Persian device must
 * lay out left-to-right. Allowing RTL while forcing it off leaves that to the
 * platform's judgement; denying it outright does not.
 */
export function applyLayoutDirection(locale: string): boolean {
  const shouldBeRtl = isRtlLocale(locale);
  // React Native ships `doLeftAndRightSwapInRTL` **on**, which quietly turns
  // every `left` and `right` into `start` and `end` under RTL. That is the
  // wrong default for this codebase now that the sites which *mean* leading
  // and trailing say `start` / `end` outright: with the swap on, the sites
  // that are deliberately physical get mirrored too, and those are exactly the
  // ones coupled to geometry React Native does *not* mirror — `translateX`,
  // an `onLayout` x, a `shadowOffset`.
  //
  // It cost a real defect before it was turned off. The time-range pills place
  // their sliding fill at `left: 0` and drive it with a measured `translateX`;
  // the swap moved the origin to the right edge while the measurement stayed
  // on the left, and the selected pill's fill left the screen entirely.
  //
  // Only checked when the app is actually going right-to-left, so the twelve
  // left-to-right locales never take a restart for a flag that cannot affect
  // them.
  const swapIsWrong = shouldBeRtl && I18nManager.doLeftAndRightSwapInRTL;
  if (I18nManager.isRTL === shouldBeRtl && !swapIsWrong) {
    return false;
  }
  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  I18nManager.swapLeftAndRightInRTL(false);
  return true;
}

/**
 * `-1` in right-to-left layout, `1` otherwise.
 *
 * For the geometry Yoga does *not* mirror: `transform: translateX`, a gesture's
 * `translationX` / `velocityX`, a shadow offset. All three stay in physical
 * screen coordinates in both directions, so anything that means "toward the
 * trailing edge" has to carry the sign itself.
 */
export function layoutDirectionFactor(): 1 | -1 {
  return isRtlLayout() ? -1 : 1;
}

/** Whether the app is laid out right-to-left right now. */
export function isRtlLayout(): boolean {
  return I18nManager.isRTL;
}

/**
 * `textAlign` for text that must follow the **layout's** leading edge rather
 * than its own content's direction.
 *
 * `"left"` is not a mistake and must not be "fixed" to `"auto"`, `"right"`, or
 * an `isRTL` branch. React Native's `textAlign` is already direction-aware:
 * iOS swaps left and right whenever the layout is right-to-left
 * (`RCTTextAttributes.mm`), so `"left"` renders at the leading edge in both
 * directions. Branching on `isRTL` here double-flips it and lands the text on
 * the wrong side.
 *
 * What is *not* direction-aware is the default, `natural`, which resolves from
 * the string's own first strong character. That is fine for UI copy, which is
 * in the app's language — and wrong for anything holding ledger data, because
 * account names, payees and amounts are Latin. Left to `natural`, an account
 * name inside a Persian row aligns itself left while the row around it mirrors
 * right, and the account tree's indentation stops reading as indentation at
 * all: every depth starts at the same edge.
 *
 * So: UI copy needs nothing; a `Text` that holds ledger data and is wider than
 * its content needs this.
 */
export const LEADING_TEXT_ALIGN = "left" as const;

/**
 * Pins a subtree to left-to-right, whatever the app's direction.
 *
 * For plots only. Time on a financial axis runs earliest-to-latest
 * left-to-right in Persian interfaces as in every other, so mirroring one would
 * invert the meaning of every trend line in the app. An SVG's own coordinates
 * never mirror, so without this the axis gutter and the plot would swap sides
 * while the drawing inside them stayed put — the worst of both directions.
 *
 * Scope it to the plot: the header and legend around it are text, and they
 * mirror like the rest of the app.
 */
export const LTR_PLOT = { direction: "ltr" } as const;

/**
 * Glyphs that point along the reading direction, paired with their mirror.
 *
 * Ionicons' names read logically — `chevron-forward`, `arrow-back` — which is
 * the trap: they describe navigation intent, but the glyphs are physically
 * right- and left-pointing and nothing in React Native mirrors them. Swapping
 * the name (rather than `scaleX: -1`) is right here because Ionicons draws
 * both members of each pair as proper mirror images, with the optical weight
 * on the correct side of the stroke.
 *
 * Vertical chevrons are deliberately absent: `chevron-down` on a collapsed
 * section means the same thing in both directions.
 */
const MIRRORED_ICONS = {
  "chevron-forward": "chevron-back",
  "chevron-back": "chevron-forward",
  "arrow-forward": "arrow-back",
  "arrow-back": "arrow-forward",
} as const;

type MirrorableIcon = keyof typeof MIRRORED_ICONS;

/** The name itself, or its mirror — so call sites stay typed against Ionicons. */
type Mirrored<T extends string> = T extends MirrorableIcon
  ? T | (typeof MIRRORED_ICONS)[T]
  : T;

/**
 * The icon name to render for `name` in the current layout direction.
 *
 * Unmapped names pass through untouched, so this is safe to reach for without
 * first checking whether a glyph is directional.
 */
export function directionalIcon<T extends string>(name: T): Mirrored<T> {
  if (!isRtlLayout()) {
    return name as Mirrored<T>;
  }
  const mirrored = (MIRRORED_ICONS as Record<string, string>)[name];
  return (mirrored ?? name) as Mirrored<T>;
}

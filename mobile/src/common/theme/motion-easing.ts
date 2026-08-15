/**
 * Reanimated `Easing` curves materialized from the bezier control points in
 * `motion.ts`.
 *
 * These live apart from the tokens for one reason: `motion.ts` is import-free
 * so worklets and the unit-test runner can both read it, and importing
 * Reanimated there would break that. Anything in React code should import from
 * here; anything running on the UI thread or under test reads the raw control
 * points instead.
 */
import { Easing } from "react-native-reanimated";
import { easings } from "./motion";

/** Entrances — decelerates into place. */
export const easeDecelerate = Easing.bezier(...easings.decelerate);

/** Transitions between two on-screen states. */
export const easeStandard = Easing.bezier(...easings.standard);

/** Exits — accelerates away. */
export const easeAccelerate = Easing.bezier(...easings.accelerate);

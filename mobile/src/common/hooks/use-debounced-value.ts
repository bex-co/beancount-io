import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay` ms, so keystrokes don't each become a request.
 *
 * The first value is adopted immediately; every later change restarts the
 * timer, and unmounting or a new change clears the pending one.
 *
 * @param value - The value to trail
 * @param delay - Quiet period in milliseconds before the value is adopted
 * @returns The last value that stayed put for `delay` ms
 */
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, debounced]);

  return debounced;
};

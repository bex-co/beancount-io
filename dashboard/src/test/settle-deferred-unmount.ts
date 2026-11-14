/**
 * Lets the timers Radix queues while unmounting fire before the test
 * environment is torn down.
 *
 * `FocusScope` (every Dialog, Popover, Select and Dropdown) returns focus in a
 * `setTimeout(..., 0)` queued by its unmount cleanup. React Testing Library
 * unmounts in the last test's `afterEach`, so a file that ends with one open
 * still has that timer pending when Vitest tears jsdom down. Teardown puts
 * Node's own `CustomEvent` back in place of jsdom's, and the late timer then
 * dispatches it on a jsdom element:
 *
 *   TypeError: Failed to execute 'dispatchEvent' on 'EventTarget':
 *   parameter 1 is not of type 'Event'.
 *
 * That is an unhandled error, so `vitest run` exits 1 although every test
 * passed, and only when the timer loses the race, which is why it came and went.
 * A timer queued after Radix's fires after it, so one turn of the event loop is
 * enough.
 */
export function settleDeferredUnmount(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

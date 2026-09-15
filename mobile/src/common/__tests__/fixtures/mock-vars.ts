/** Stand-in for `@/common/vars`: callable vars with the reactive-var shape. */
function reactiveVar<T>(initial: T) {
  let current = initial;
  return function value(next?: T): T {
    if (next !== undefined) current = next;
    return current;
  };
}

export const sessionVar = reactiveVar<{ userId: string } | null>(null);
export const localeVar = reactiveVar<string>("en");

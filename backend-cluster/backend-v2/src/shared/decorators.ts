/**
 * Lazy property initialization decorator.
 *
 * Applies to getter methods — the getter runs once on first access,
 * then the result is cached directly on the instance, bypassing the getter
 * on all subsequent reads (O(1) lookup, no extra call overhead).
 *
 * Requirements:
 * - `experimentalDecorators: true` in tsconfig (already enabled)
 * - Only valid on accessor descriptors (getters), not plain properties
 *
 * @example
 * ```typescript
 * class ReportService {
 *   constructor(private readonly db: Database) {}
 *
 *   @lazy
 *   get expensiveReport(): Report {
 *     return buildReport(this.db); // called exactly once per instance
 *   }
 * }
 *
 * const svc = new ReportService(db);
 * svc.expensiveReport; // calls buildReport
 * svc.expensiveReport; // returns cached value, no call
 * ```
 *
 * @example With class fields that depend on constructor args:
 * ```typescript
 * class FavaApiContext {
 *   constructor(private readonly config: Config) {}
 *
 *   @lazy
 *   get client(): FavaClient {
 *     return new FavaClient(this.config.favaUrl);
 *   }
 * }
 * ```
 */
export function lazy(
  _target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const getter = descriptor.get;

  if (!getter) {
    throw new Error(
      `@lazy can only decorate getter properties (no getter found on "${String(propertyKey)}")`,
    );
  }

  return {
    configurable: true,
    enumerable: descriptor.enumerable,
    get(this: object): unknown {
      const value: unknown = getter.call(this);

      // Replace the prototype getter with a plain own-property on the instance.
      // After this, property lookup finds the own property first and never
      // reaches the prototype getter again.
      Object.defineProperty(this, propertyKey, {
        configurable: true,
        enumerable: descriptor.enumerable,
        writable: false,
        value,
      });

      return value;
    },
  };
}

import { lazy } from "./decorators";

describe("@lazy", () => {
  it("calls the getter once and caches the value", () => {
    const factory = jest.fn().mockReturnValue(42);

    class Foo {
      @lazy
      get value(): number {
        return factory();
      }
    }

    const foo = new Foo();
    expect(foo.value).toBe(42);
    expect(foo.value).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("caches per instance independently", () => {
    let counter = 0;

    class Foo {
      @lazy
      get id(): number {
        counter += 1;
        return counter;
      }
    }

    const a = new Foo();
    const b = new Foo();

    expect(a.id).toBe(1);
    expect(a.id).toBe(1); // cached
    expect(b.id).toBe(2);
    expect(b.id).toBe(2); // cached
    expect(counter).toBe(2);
  });

  it("can access constructor arguments inside the getter", () => {
    class Greeter {
      constructor(private readonly name: string) {}

      @lazy
      get greeting(): string {
        return `Hello, ${this.name}!`;
      }
    }

    const g = new Greeter("World");
    expect(g.greeting).toBe("Hello, World!");
    expect(g.greeting).toBe("Hello, World!");
  });

  it("throws when applied to a plain property (no getter)", () => {
    expect(() => {
      // Manually call the decorator with a data descriptor to simulate misuse
      lazy({}, "prop", { value: 1, writable: true, configurable: true });
    }).toThrow("@lazy can only decorate getter properties");
  });
});

// This file runs BEFORE the test framework is installed
// Used to mock modules that have ESM issues

jest.mock("nanoid", () => {
  // Also oidc-provider's own alphabet (lib/helpers/nanoid.js imports this same
  // named export from "nanoid") — oidc-provider and this app's own nanoid usage
  // both resolve to this one mocked module, so both must be satisfied here.
  const urlAlphabet =
    "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

  function customAlphabet(alphabet, size) {
    return function () {
      let id = "";
      for (let i = 0; i < size; i++) {
        id += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      return id;
    };
  }

  function nanoid(size = 21) {
    let id = "";
    for (let i = 0; i < size; i++) {
      id += urlAlphabet[Math.floor(Math.random() * urlAlphabet.length)];
    }
    return id;
  }

  return {
    customAlphabet,
    nanoid,
    urlAlphabet,
  };
});

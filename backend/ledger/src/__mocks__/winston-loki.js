/* global module */

// Stub for winston-loki transport — not needed in tests
class LokiTransport {
  constructor() {}
  on() {}
  log(_info, callback) {
    if (callback) callback();
  }
}

module.exports = LokiTransport;
module.exports.default = LokiTransport;

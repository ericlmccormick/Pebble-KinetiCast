// Regression test: the HTTP factory must instantiate XMLHttpRequest, not call itself.
// Run with: node tests/weather-xhr.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js', 'utf8');
const match = source.match(/function weatherXHR\(\)\s*\{[\s\S]*?\n\}/);
assert.ok(match, 'weatherXHR factory must exist');
let constructors = 0;
function MockXHR() { constructors++; }
const sandbox = { XMLHttpRequest: MockXHR, weatherFinished: function () {}, weatherGeneration: 1, weatherRequests: [], weatherInFlight: true, activeWeatherGeneration: function() { return true; } };
vm.runInNewContext(match[0], sandbox, { timeout: 1000 });
const xhr = sandbox.weatherXHR();
assert.ok(xhr instanceof MockXHR, 'weatherXHR must return an XMLHttpRequest');
assert.equal(constructors, 1, 'weatherXHR must instantiate exactly one request');
assert.equal(xhr.timeout, 15000, 'HTTP timeout must be configured');
assert.equal(typeof xhr.onerror, 'function');
assert.equal(typeof xhr.ontimeout, 'function');
console.log('weatherXHR constructor regression test passed');

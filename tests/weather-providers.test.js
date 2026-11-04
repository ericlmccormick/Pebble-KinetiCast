// Ensure provider choices and automatic fallback match Timeline WX.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('src/pkjs/index.js', 'utf8');
const start = code.indexOf('function fetchNamedProvider(');
const end = code.indexOf('function getWeather(', start);
assert.ok(start >= 0 && end > start, 'Provider router not found');
const requests = [];
const context = {
  weatherAutoFallback: null,
  armWeatherWatchdog: function() {},
  fetchOpenWeather: () => requests.push('openweathermap'),
  fetchOpenMeteo: () => requests.push('openmeteo'),
  fetchMetNo: () => requests.push('metno'),
  fetchNWS: () => requests.push('nws')
};
vm.createContext(context);
vm.runInContext(code.slice(start, end), context, {timeout:1000});
context.executeProviderFetch(39,-77,'metric',{WEATHER_PROVIDER:'auto'});
assert.deepEqual(Array.from(context.weatherAutoFallback.providers),['openmeteo','nws','metno']);
assert.deepEqual(requests,['openmeteo']);
requests.length=0;
context.executeProviderFetch(48,11,'metric',{WEATHER_PROVIDER:'auto'});
assert.deepEqual(Array.from(context.weatherAutoFallback.providers),['openmeteo','metno']);
assert.deepEqual(requests,['openmeteo']);
requests.length=0;
for (const p of ['openmeteo','nws','metno','openweathermap']) {
  context.executeProviderFetch(39,-77,'metric',{WEATHER_PROVIDER:p});
  assert.equal(requests.pop(),p);
  assert.equal(context.weatherAutoFallback,null);
}
console.log('Provider selection and automatic fallback regression tests passed');

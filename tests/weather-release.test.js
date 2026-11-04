// Integration regressions for KinetiCast provider routing and data validity.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const events = {};
const requests = [];
const sent = [];
const timers = new Map();
let timerId = 0;
function FakeXHR() {
  this.status = 0;
  this.responseText = '';
  this.headers = {};
  this.aborted = false;
}
FakeXHR.prototype.open = function(method, url) { this.url = url; };
FakeXHR.prototype.setRequestHeader = function(k,v) { this.headers[k] = v; };
FakeXHR.prototype.send = function() { requests.push(this); };
FakeXHR.prototype.abort = function() { this.aborted = true; };
FakeXHR.prototype.respond = function(status, value) {
  this.status = status;
  this.responseText = typeof value === 'string' ? value : JSON.stringify(value);
  if(this.onload) this.onload();
};
const config = { TEMP_UNIT:'F', DISTANCE_UNIT:'mi', UPDATE_FREQ:30, WEATHER_PROVIDER:'nws', USE_GPS:false };
const context = {
  console: {log(){}}, Date, Intl, Math, JSON, isFinite, parseInt, Number, Object,
  require: function(key) { if(key === 'pebble-clay') return function(){}; return function(){}; },
  XMLHttpRequest: FakeXHR,
  localStorage: {getItem: () => JSON.stringify(config), setItem(){}},
  Pebble: {
    addEventListener: (name, fn) => { events[name] = fn; },
    sendAppMessage: (data, ok) => { sent.push(data); if(ok) ok(); },
    openURL(){}
  },
  navigator: {geolocation:{}},
  setTimeout: (fn) => { let id = ++timerId; timers.set(id,fn); return id; },
  clearTimeout: id => timers.delete(id)
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/pkjs/index.js','utf8'),context,{timeout:2000});

// Exact time zone and day rollover, including an hour that belongs to the previous local date.
assert.equal(context.locationDateParts('2026-11-05T01:00:00Z','America/New_York').day, '2026-11-04');
assert.equal(context.locationDateParts('2026-11-05T18:00:00Z','America/New_York').day, '2026-11-05');
assert.throws(() => context.completeDayArray({'2026-11-04':{max:24,min:11}},'2026-11-04'));

// Missing/null values cannot become fabricated 0 C before conversion.
context.weatherInFlight = true;
context.weatherGeneration = 1;
context.sendWeatherData({TEMP_CURRENT:null,TEMP_HIGH:20,TEMP_LOW:10});
assert.equal(sent.length,0);
context.weatherInFlight = true;
context.weatherGeneration = 20;
context.weatherAutoFallback = null;
context.weatherFailures = 3; // no scheduled retry for fixture checks

// Four local days of NWS hourly forecasts, beginning at night.
// Unlike the old day/night pairing logic, these records must retain their actual calendar day.
const dates = ['2026-11-04','2026-11-05','2026-11-06','2026-11-07'];
const periods = [];
dates.forEach((day,idx) => {
  [0,8,14,23].forEach((hour,j) => periods.push({
    startTime:day+'T'+('0'+hour).slice(-2)+':00:00-05:00',
    temperature:40 + idx*10 + j*3,
    temperatureUnit:'F',shortForecast: j===2?'Sunny':'Cloudy',isDaytime:j===1||j===2
  }));
});
const point = {properties:{timeZone:'America/New_York',
  forecastHourly:'https://example.invalid/nws/hourly',
  observationStations:'https://example.invalid/nws/stations'}};
const stationList={observationStations:['https://example.invalid/stations/TEST']};
const latest={properties:{temperature:{value:21}}};

// Align the forecast test with a fixed local day by mocking locationDateParts for "now".
const actualParts=context.locationDateParts;
context.locationDateParts=function(value,zone) {
  if(typeof value==='number') return {day:'2026-11-04',hour:12};
  return actualParts(value,zone);
};
context.weatherInFlight = true;
context.weatherGeneration = 21;
context.weatherFailures = 0;
context.executeProviderFetch(39,-77,'metric',{WEATHER_PROVIDER:'nws',TEMP_UNIT:'F'});
assert.equal(requests.length,1);
requests.shift().respond(200,point);
assert.equal(requests.length,1);
requests.shift().respond(200,{properties:{periods}});
assert.equal(requests.length,1);
requests.shift().respond(200,stationList);
assert.equal(requests.length,1);
requests.shift().respond(200,latest);
assert.equal(sent.length,1);
assert.equal(sent[0].TEMP_CURRENT,70); // 21 Celsius observed, not first forecast period
assert.equal(sent[0].TEMP_HIGH,49);
assert.equal(sent[0].TEMP_LOW,40);
assert.equal(sent[0].DAY1_HIGH,59);
assert.equal(sent[0].DAY1_LOW,50);

// An earlier provider's callback must not overwrite a later successful source.
context.weatherInFlight = true;
context.weatherGeneration = 30;
context.weatherFailures = 0;
context.executeProviderFetch(39,-77,'metric',{WEATHER_PROVIDER:'auto'});
const meteo = requests.shift();
meteo.respond(503,{error:true});
assert.equal(requests.length,1); // automatic NWS fallback
const oldNws = requests.shift();
oldNws.respond(503,{error:true});
assert.equal(requests.length,1); // automatic Met.no fallback
const before = sent.length;
const metno = requests.shift();
// Simulate late response after this attempt was invalidated; it must be ignored.
oldNws.respond(200,point);
assert.equal(requests.length,0);
assert.equal(sent.length,before);
metno.respond(503,{error:true});
console.log('NWS observed temperature, local-date grouping, missing values, and stale response tests passed');

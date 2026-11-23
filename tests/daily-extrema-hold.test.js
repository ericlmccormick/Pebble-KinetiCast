// Stable morning high/low across phone restarts, provider changes, unit changes
// and nearby GPS movement. Reset at midnight in forecast location or 40km travel.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const s=fs.readFileSync('src/pkjs/index.js','utf8');
const start=s.indexOf('var DAILY_EXTREMA_HOLD_KEY=');
const end=s.indexOf('function sendWeatherData(dict)',start);
assert.ok(start>=0&&end>start);
let time=Date.parse('2026-11-22T17:00:00Z');
class FakeDate extends Date{static now(){return time;}}
const cache=new Map(),storage={
  getItem:k=>cache.get(k)||null,
  setItem:(k,v)=>cache.set(k,v)
};
function create() {
 const context={Date:FakeDate,Math,JSON,Number,isFinite,localStorage:storage,
   locationDateParts:()=>({day:'2026-11-22'})};
 vm.createContext(context);
 vm.runInContext(s.slice(start,end),context);
 return context;
}
let ctx=create();
ctx.weatherRequestLocation={lat:21.4,lon:-157.8};
let a={TEMP_HIGH:30,TEMP_LOW:19,_LOCAL_DAY:'2026-11-22'};
ctx.holdDailyExtrema(a);
assert.equal(a.TEMP_LOW,19);
assert.ok(!('_LOCAL_DAY' in a),'Private date metadata never reaches Pebble message');
const saved=JSON.parse(cache.get('kineticast.dailyExtremaHold.v1'));
assert.equal(saved.low,19);
assert.equal(saved.high,30);
let b={TEMP_HIGH:34,TEMP_LOW:24,_LOCAL_DAY:'2026-11-22'};
ctx.holdDailyExtrema(b);
assert.equal(b.TEMP_LOW,19,'Updated forecast cannot replace pinned low');
assert.equal(b.TEMP_HIGH,30,'Updated forecast cannot replace pinned high');
ctx=create(); // JS VM reload/phone restart
ctx.weatherRequestLocation={lat:21.43,lon:-157.81};
const c={TEMP_HIGH:33,TEMP_LOW:23,_LOCAL_DAY:'2026-11-22'};
ctx.holdDailyExtrema(c);
assert.equal(c.TEMP_LOW,19,'Restart and short GPS walk preserve baseline');
assert.equal(c.TEMP_HIGH,30);
ctx.weatherRequestLocation={lat:22,lon:-157.8}; // ~67 km
const d={TEMP_HIGH:31,TEMP_LOW:22,_LOCAL_DAY:'2026-11-22'};
ctx.holdDailyExtrema(d);
assert.equal(d.TEMP_LOW,22,'Travel more than 40km resets baseline');
assert.equal(d.TEMP_HIGH,31);
const same={TEMP_HIGH:35,TEMP_LOW:25,_LOCAL_DAY:'2026-11-22'};
ctx.holdDailyExtrema(same);
assert.equal(same.TEMP_LOW,22,'New location baseline is then held');
time=Date.parse('2026-11-23T16:00:00Z');
const next={TEMP_HIGH:29,TEMP_LOW:17,_LOCAL_DAY:'2026-11-23'};
ctx.holdDailyExtrema(next);
assert.equal(next.TEMP_LOW,17,'Next local day captures fresh forecast');
assert.equal(next.TEMP_HIGH,29);
assert.equal(ctx.localDateAtForecastLocation(null,-36000),'2026-11-23',
  'Day key follows forecast offset, not phone system timezone');
ctx.weatherRequestLocation={lat:0,lon:0};
const invalid={TEMP_HIGH:null,TEMP_LOW:0,_LOCAL_DAY:'2026-11-23'};
ctx.holdDailyExtrema(invalid);
assert.equal(invalid.TEMP_HIGH,null,'Incomplete forecast cannot create new baseline');
assert.match(s,/dict\._LOCAL_DAY=json\.daily\.time&&json\.daily\.time\[0\]/);
assert.match(s,/dict\._LOCAL_DAY=daily\.time\[0\]/);
assert.match(s,/holdDailyExtrema\(dict\); \/\/ Lock Celsius before converting/);
assert.match(s,/weatherRequestLocation=\{lat:lat,lon:lon\}/);
console.log('Morning extrema hold, restart, local day, distance, and Celsius cache tests passed');

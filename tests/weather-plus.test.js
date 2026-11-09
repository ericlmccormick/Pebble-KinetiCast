// Weather+ integration: existing settings, full-day daily fields and invalid-response safety.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('src/pkjs/index.js','utf8');
const start=code.indexOf('var WEATHER_PLUS_UUID =');
const end=code.indexOf('function getWeather()',start);
assert.ok(start>=0&&end>start);
let config={WEATHER_PROVIDER:'weatherplus',DISTANCE_UNIT:'mi'};
let sent=[];
const context={
  Date,Math,JSON,Number,isFinite,parseInt,console:{log(){}},
  readSettings:()=>config,desiredDistanceUnit:(s)=>s.DISTANCE_UNIT||'mi',
  settingEnabled:(v,f)=>v==null?f:!!v,
  temperatureUnitId:u=>['F','C','K','R'].indexOf(u),
  getWmoIcon:(n,d)=>n===0?(d?'01d':'01n'):'04d',
  Pebble:{sendAppMessage:(d,ok)=>{sent.push(d);if(ok)ok();}},
  setTimeout:()=>1,clearTimeout:()=>{},getWeather:()=>{},
  lastWeatherSuccess:0,
  activityCounters:{calendarReads:0,calendarMessages:0,weatherMessages:0}
};
vm.createContext(context);
vm.runInContext(code.slice(start,end),context);
assert.equal(context.chosenWeatherSource({WEATHER_PROVIDER:'nws'}),'nws');
assert.equal(context.chosenWeatherSource({API_KEY:'key'}),'openweathermap');
assert.equal(context.chosenWeatherSource({}),'weatherplus');
const now=Math.floor(Date.now()/1000);
const offset=-300;
const midnight=Math.floor((now+offset*60)/86400)*86400-offset*60;
const scalar=(v,u='°C')=>({numericValue:{value:v,unit:u}});
const series=(v,u='°C')=>({series:{start:midnight,stepSec:86400,numericValue:{values:v,unit:u}}});
const props={
  temperature:scalar(22),
  daily_high:series([26,25,24,23,22,21,20]),
  daily_low:series([8,9,10,11,12,13,14]),
  daily_weather_code:series([0,0,0,0,0,0,0],''),
  utc_offset:scalar(offset,'min'),
  hourly_is_day:{series:{numericValue:{values:[1]}}},
  updated_at:{timestamp:{value:now}}
};
const packet=()=>({instances:[{properties:props}]});
context.applyWeatherPlus(packet());
assert.equal(sent.length,1);
assert.equal(sent[0].TEMP_HIGH,26);
assert.equal(sent[0].TEMP_LOW,8);
assert.equal(sent[0].DAY1_HIGH,25);
assert.equal(sent[0].DAY3_LOW,11);
assert.equal(sent[0].TEMP_UNIT,1);
props.daily_high.series.numericValue.values[0]=null;
context.applyWeatherPlus(packet());
assert.equal(sent.length,1,'Missing values must not replace valid forecast');
props.daily_high.series.numericValue.values[0]=26;
props.daily_high.series.start+=86400;
context.applyWeatherPlus(packet());
assert.equal(sent.length,1,'Misaligned days must not shift forecast');
config.WEATHER_PROVIDER='nws';
props.daily_high.series.start-=86400;
context.applyWeatherPlus(packet());
assert.equal(sent.length,1,'Plugin callback cannot overwrite built-in selection');
console.log('Weather+ daily highs/lows and backward-compatible settings tests passed');

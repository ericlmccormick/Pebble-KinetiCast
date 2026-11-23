// NWS/MET Norway's hourly feed starts now; daily low must include midnight
// through midnight in the location timezone, never only the remaining hours.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/pkjs/index.js','utf8');
const start=source.indexOf('function locationDateParts(');
const end=source.indexOf('function fetchMetNo(',start);
assert.ok(start>0&&end>start,'Local-date helper and full-day extrema fetch exist');
const snippet=source.slice(start,end);
let timestamp=Date.parse('2026-11-22T17:00:00Z');
class Clock extends Date {static now(){return timestamp;}}
let requests=[],published=[],errors=[];
const context={Date:Clock,Intl,Math,Number,isFinite,JSON,Error,
 weatherXHR(){const x={open(method,url){this.url=url;},send(){requests.push(this);}};return x;},
 guardWeatherLoad(){},sendWeatherData:dict=>published.push({...dict}),
 weatherFinished:(ok,message)=>errors.push(message)};
vm.createContext(context);
vm.runInContext(snippet,context,{timeout:1000});
const days=['2026-11-22','2026-11-23','2026-11-24','2026-11-25'];
const reply=(min=[12,13,14,15],max=[25,26,27,28],dates=days)=>({
 timezone:'America/Los_Angeles',
 daily:{time:dates,temperature_2m_max:max,temperature_2m_min:min}
});
const first={TEMP_LOW:22,TEMP_HIGH:24,DAY1_LOW:19,DAY1_HIGH:26};
context.sendWeatherWithFullDayExtrema(first,39,-77);
assert.equal(published.length,0,'Never send a future-only hourly low');
assert.equal(requests.length,1);
assert.match(requests[0].url,/daily=temperature_2m_max,temperature_2m_min/);
assert.match(requests[0].url,/timezone=auto/);
requests.shift().onload.call({responseText:JSON.stringify(reply())});
assert.equal(published[0].TEMP_LOW,12);
assert.equal(published[0].TEMP_HIGH,25);
assert.equal(published[0].DAY1_LOW,13);
assert.equal(published[0].DAY3_LOW,15);
timestamp=Date.parse('2026-11-23T06:30:00Z'); // 22:30 PST, same local day
context.sendWeatherWithFullDayExtrema({...first,TEMP_LOW:25},39,-77);
requests.shift().onload.call({responseText:JSON.stringify(reply())});
assert.equal(published.at(-1).TEMP_LOW,12,
 'Later forecast hours may change; full-day low must not lose the night');
context.sendWeatherWithFullDayExtrema({...first},39,-77);
requests.shift().onload.call({responseText:JSON.stringify(reply(
 [12,13,14,15],[25,26,27,28],days.map(d=>d.replace('22','23'))))});
assert.equal(published.length,2,'Misaligned local dates must never replace the day low');
assert.match(errors.at(-1),/misaligned/);
context.sendWeatherWithFullDayExtrema({...first},39,-77);
requests.shift().onload.call({responseText:JSON.stringify(reply(
 [null,13,14,15],[25,26,27,28]))});
assert.equal(published.length,2,'Null official low must be rejected instead of zero');
console.log('Full-calendar-day direct NWS/MET fallback, timezone and invalid source checks passed');

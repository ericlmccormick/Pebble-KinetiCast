// Regression: each configurable watch-side setting must be present in the
// actual phone-to-watch dictionary, not just in the Clay configuration UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js','utf8');
const watch = fs.readFileSync('src/c/main.c','utf8');
const manifest = require('../package.json');
assert.equal(manifest.version, '2.4.3');
const keys = [
  'PERSISTENT_CALENDAR_ENABLE', 'PERSISTENT_CALENDAR_MINUTES',
  'WEATHER_UPDATES_ENABLED', 'HEALTH_LIVE_UPDATES', 'GESTURE_POWER_MODE'
];
const start = source.indexOf('var appDict = {');
const end = source.indexOf('Pebble.sendAppMessage(appDict,', start);
assert.ok(start > 0 && end > start, 'settings AppMessage packet is present');
const packetSource = source.slice(start,end);
for (const key of keys) {
  assert.ok(packetSource.includes("'"+key+"':"), key+' must be delivered to watch');
  assert.ok(manifest.pebble.messageKeys[key] > 0, key+' needs AppMessage key');
  assert.ok(watch.includes('MESSAGE_KEY_'+key), key+' must be handled by watch');
}
const save = source.indexOf("localStorage.setItem('clay-settings', JSON.stringify(syncLegacyPreferences(settings)))");
const transmit = source.indexOf('Pebble.sendAppMessage(appDict,',save);
const sync = source.indexOf('syncCalendarConfiguration(previousSettings, settings)',transmit);
assert.ok(save>0 && transmit>save && sync>transmit,
  'calendar subscription must be synchronized after settings send');
const marker = source.indexOf('Pebble.sendAppMessage(appDict, function() {');
assert.ok(marker>0 && sync>marker && sync < source.indexOf('var weatherChanged =',marker),
  'calendar synchronization belongs in the successful settings-send callback');
const settings = {
 PERSISTENT_CALENDAR_ENABLE:true, PERSISTENT_CALENDAR_MINUTES:'20',
 WEATHER_UPDATES_ENABLED:false, HEALTH_LIVE_UPDATES:false,
 GESTURE_POWER_MODE:'1', DEFAULT_VIEW:'0', SHAKE_ACTION:'0'
};
const helpers = {
 settings,
 desiredDistanceUnit:()=> 'mi',desiredTempUnit:()=> 'F',
 temperatureUnitId:()=>0,normalizeShakeThreshold:()=>300,
 persistentCalendarMinutes:v=>Number(v),
 settingEnabled:(v,def)=>v==null?def:[true,1,'1','true'].includes(v),
 weatherUpdatesEnabled:s=>s.WEATHER_UPDATES_ENABLED !== false
};
const dictionary = vm.runInNewContext(packetSource+';appDict',helpers);
assert.equal(dictionary.PERSISTENT_CALENDAR_ENABLE,1);
assert.equal(dictionary.PERSISTENT_CALENDAR_MINUTES,20);
assert.equal(dictionary.WEATHER_UPDATES_ENABLED,0);
assert.equal(dictionary.HEALTH_LIVE_UPDATES,0);
assert.equal(dictionary.GESTURE_POWER_MODE,1);
settings.PERSISTENT_CALENDAR_ENABLE=false;
settings.PERSISTENT_CALENDAR_MINUTES='5';
settings.WEATHER_UPDATES_ENABLED=true;
settings.GESTURE_POWER_MODE='0';
const off=vm.runInNewContext(packetSource+';appDict',helpers);
assert.equal(off.PERSISTENT_CALENDAR_ENABLE,0);
assert.equal(off.PERSISTENT_CALENDAR_MINUTES,5);
assert.equal(off.WEATHER_UPDATES_ENABLED,1);
assert.equal(off.GESTURE_POWER_MODE,0);
console.log('Phone-to-watch settings propagation regressions passed');

// Settings layout guarantees: concise task-based grouping without breaking values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js','utf8');
const manifest = require('../package.json');
assert.equal(manifest.version,'2.4.4');
const begin=source.indexOf('var clayConfig =');
const end=source.indexOf('var clay = new Clay',begin);
assert.ok(begin>=0 && end>begin);
const config=vm.runInNewContext(source.slice(begin,end)+'\nclayConfig',{});
const groups=config.filter(x=>x.type==='section');
const names=groups.map(g=>g.items.find(x=>x.type==='heading').defaultValue);
assert.deepEqual(Array.from(names),[
  'Watchface','Weather','Calendar','Wrist Gestures','Health & Sleep','Power & Diagnostics'
]);
const settings=groups.flatMap(g=>g.items.filter(x=>x.messageKey));
const byKey=Object.fromEntries(settings.map(x=>[x.messageKey,x]));
assert.equal(settings.length,new Set(settings.map(x=>x.messageKey)).size,'No duplicate controls');
const expected = [
  'DEFAULT_VIEW','THEME_MODE','WEATHER_UPDATES_ENABLED','WEATHER_PROVIDER',
  'API_KEY','USE_GPS','MANUAL_LOCATION','TEMP_UNIT','UPDATE_FREQ',
  'CALENDAR_FILTER','PERSISTENT_CALENDAR_ENABLE','PERSISTENT_CALENDAR_MINUTES',
  'SHAKE_ACTION','GESTURE_POWER_MODE','SHAKE_SENSITIVITY','SHAKE_LENGTH',
  'DISTANCE_UNIT','HR_GRAPH_WINDOW','HEALTH_LIVE_UPDATES','SHOW_SLEEP',
  'SLEEP_BRIEF_SECONDS'
];
assert.deepEqual(Array.from(settings.map(x=>x.messageKey)),expected,'Settings follow workflow order');
for(const key of expected) assert.ok(byKey[key],key);
function values(key) {return Array.from(byKey[key].options.map(x=>String(x.value)));}
assert.deepEqual(values('DEFAULT_VIEW'),['0','1','2']);
assert.deepEqual(values('THEME_MODE'),['0','1','2']);
assert.deepEqual(values('SHAKE_ACTION'),['0','3','1','4','2']);
assert.deepEqual(values('GESTURE_POWER_MODE'),['0','1']);
assert.deepEqual(values('SHAKE_LENGTH'),['0','1','2']);
assert.deepEqual(values('PERSISTENT_CALENDAR_MINUTES'),['5','10','15','20','25','30']);
assert.deepEqual(values('SLEEP_BRIEF_SECONDS'),['0','15','30','60']);
assert.deepEqual(values('WEATHER_PROVIDER'),[
  'weatherplus','auto','openmeteo','metno','nws','openweathermap'
]);
assert.deepEqual(values('TEMP_UNIT'),['F','C','K','R']);
assert.deepEqual(values('DISTANCE_UNIT'),['mi','km']);
assert.deepEqual(values('HR_GRAPH_WINDOW'),['20','30','60']);
assert.deepEqual(values('CALENDAR_FILTER'),['__all__']);
assert.equal(byKey.SHAKE_SENSITIVITY.min,100);
assert.equal(byKey.SHAKE_SENSITIVITY.max,2600);
assert.equal(byKey.SHAKE_SENSITIVITY.step,50);
for(const key of ['DEFAULT_VIEW','THEME_MODE','SHAKE_ACTION','SHAKE_LENGTH',
  'PERSISTENT_CALENDAR_ENABLE','PERSISTENT_CALENDAR_MINUTES']) {
  assert.ok(manifest.pebble.messageKeys[key] != null, key+' wire mapping');
}
const clay=fs.readFileSync('src/pkjs/custom-clay.js','utf8');
for(const key of ['WEATHER_UPDATES_ENABLED','WEATHER_PROVIDER','USE_GPS',
  'DEFAULT_VIEW','SHAKE_ACTION','PERSISTENT_CALENDAR_ENABLE','SHOW_SLEEP']) {
  assert.ok(clay.includes(key),key+' conditional visibility');
}
console.log('Task-based settings layout, option ordering and saved values passed');

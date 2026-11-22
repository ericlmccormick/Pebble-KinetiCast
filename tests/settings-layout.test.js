// Settings layout guarantees: concise task-based grouping without breaking values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js','utf8');
const manifest = require('../package.json');
const cornerCatalog = require('../src/pkjs/corner-catalog');
assert.match(manifest.version,/^[0-9]+[.][0-9]+[.][0-9]+$/);
const begin=source.indexOf('var clayConfig =');
const end=source.indexOf('var clay = new Clay',begin);
assert.ok(begin>=0 && end>begin);
const config=vm.runInNewContext(source.slice(begin,end)+'\nclayConfig',{cornerCatalog});
const groups=config.filter(x=>x.type==='section');
const names=groups.map(g=>g.items.find(x=>x.type==='heading').defaultValue);
assert.deepEqual(Array.from(names),[
  'Appearance','Complications','Weather','Health & Sleep','Calendar','Wrist Gestures','Power & Diagnostics'
]);
const settings=groups.flatMap(g=>g.items.filter(x=>x.messageKey));
const byKey=Object.fromEntries(settings.map(x=>[x.messageKey,x]));
assert.equal(settings.length,new Set(settings.map(x=>x.messageKey)).size,'No duplicate controls');
const expected = [
  'THEME_MODE','CENTER_VIEW','WEATHER_PROVIDER','API_KEY','USE_GPS',
  'MANUAL_LOCATION','TEMP_UNIT','UPDATE_FREQ','DISTANCE_UNIT',
  'HR_GRAPH_WINDOW','HEALTH_LIVE_UPDATES','SHOW_SLEEP','SLEEP_BRIEF_SECONDS',
  'CALENDAR_FILTER','PERSISTENT_CALENDAR_ENABLE','PERSISTENT_CALENDAR_MINUTES',
  'SHAKE_ACTION','GESTURE_POWER_MODE','SHAKE_SENSITIVITY','SHAKE_LENGTH'
];
assert.deepEqual(Array.from(settings.filter(x=>!x.messageKey.startsWith('CORNER_')&&
  !x.messageKey.startsWith('BATTERY_')).map(x=>x.messageKey)),expected,
  'Only relevant settings remain in workflow order');
for(const key of expected) assert.ok(byKey[key],key);
function values(key) {return Array.from(byKey[key].options.map(x=>String(x.value)));}
assert.deepEqual(values('CENTER_VIEW'),['0','1','2','3']);
assert.ok(!byKey.DEFAULT_VIEW,'Remove the defunct bottom panel');
assert.ok(!byKey.CORNER_MODE,'One configurable layout without presets');
assert.ok(!byKey.WEATHER_UPDATES_ENABLED,'Weather automatically follows complications');
assert.deepEqual(values('THEME_MODE'),['0','1','2']);
assert.deepEqual(Array.from(byKey.THEME_MODE.options, o => o.label), ['Day','Night','Auto']);
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
for(const key of ['CENTER_VIEW','THEME_MODE','SHAKE_ACTION','SHAKE_LENGTH',
  'PERSISTENT_CALENDAR_ENABLE','PERSISTENT_CALENDAR_MINUTES']) {
  assert.ok(manifest.pebble.messageKeys[key] != null, key+' wire mapping');
}
const clay=fs.readFileSync('src/pkjs/custom-clay.js','utf8');
for(const key of ['WEATHER_PROVIDER','USE_GPS','CENTER_VIEW',
  'SHAKE_ACTION','PERSISTENT_CALENDAR_ENABLE','SHOW_SLEEP']) {
  assert.ok(clay.includes(key),key+' conditional visibility');
}
assert.ok(clay.includes('healthNeeded()'));
assert.ok(clay.includes('weatherNeeded()'));
assert.ok(clay.includes('calendarNeeded()'));
console.log('Single-layout settings, center, conditional groups and saved values passed');

for(const slot of cornerCatalog.slots) {
  for(const key of ['GROUP','PLUGIN_SPEC','INDEX']) {
    assert.ok(byKey['CORNER_'+slot+'_'+key],'Missing '+slot+' '+key);
  }
  for(const group of Object.keys(cornerCatalog.groups))
    assert.ok(byKey['CORNER_'+slot+'_'+group.toUpperCase()]);
  assert.equal(cornerCatalog.validMetric('health',30),true);
}
assert.deepEqual(Array.from(byKey.BATTERY_BAR_STYLE.options,o=>o.value),['0','1','2','3']);
console.log('Corner complication catalog controls and legacy defaults passed');

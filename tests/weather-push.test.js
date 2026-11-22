// Selective event-driven weather push, display projection, retry and reconnect.
const assert=require('node:assert/strict');
const push=require('../src/pkjs/weather-push');
const deliver=require('../src/pkjs/weather-delivery');
const catalog=require('../src/pkjs/corner-catalog');
const fs=require('node:fs');
function config(){
  return {CORNER_MODE:1,
    CORNER_TL_GROUP:'weather',CORNER_TL_WEATHER:'3',
    CORNER_TR_GROUP:'weather',CORNER_TR_WEATHER:'14',
    CORNER_BL_GROUP:'health',CORNER_BL_HEALTH:'30',
    CORNER_BR_GROUP:'health',CORNER_BR_HEALTH:'37'};
}
let cfg=config();
assert.deepEqual(push.metricIds(cfg,catalog),[3,14,30,37]);
assert.deepEqual(push.watchedKeys(cfg,catalog),['TEMP_CURRENT','UV_INDEX','TEMP_UNIT']);
assert.ok(push.properties(cfg,catalog).includes('temperature'));
assert.ok(!push.properties(cfg,catalog).includes('hourly_humidity'),
  'Unselected data must not be subscribed');
assert.equal(push.requiresWeather(cfg,catalog),true);
cfg.CORNER_TR_GROUP='health';cfg.CORNER_TR_HEALTH='32';
assert.deepEqual(push.watchedKeys(cfg,catalog),['TEMP_CURRENT','TEMP_UNIT']);
assert.equal(push.requiresWeather({...cfg,CORNER_TL_GROUP:'health',CORNER_TL_HEALTH:'32'},catalog),false);
assert.ok(push.watchedKeys({CORNER_MODE:0},catalog).includes('DAY3_HIGH'),
  'Classic still feeds legacy three-day forecast');
assert.ok(push.properties({CORNER_MODE:1,
  CORNER_TL_GROUP:'astronomy',CORNER_TL_ASTRONOMY:'70'},catalog).includes('daily_sunrise'),
  'Astronomy selected without weather corners must request sunrise');
const rainCfg={CORNER_MODE:1,CORNER_TL_GROUP:'weather',CORNER_TL_WEATHER:'16'};
assert.ok(push.properties(rainCfg,catalog).includes('hourly_precipitation'));
assert.ok(push.watchedKeys(rainCfg,catalog).includes('WX_RAIN_ETA'));
assert.ok(!push.watchedKeys(rainCfg,catalog).includes('WX_HUMIDITY'));

// Changes to non-displayed fields are suppressed, and only changed selected
// values are sent. Watch refresh on reconnect forces a full selected snapshot.
const sent=[];
let failNext=false;
let retryFn;
const originalSetTimeout=global.setTimeout;
const originalClearTimeout=global.clearTimeout;
global.setTimeout=fn=>{retryFn=fn;return 12;};
global.clearTimeout=()=>{retryFn=null;};
try {
  const pebble={sendAppMessage:(dict,ok,fail)=>{
    sent.push({...dict});
    if(failNext){failNext=false;fail('test transport failure');}
    else ok();
  }};
  const transport=deliver.create(pebble,push);
  const keys=push.watchedKeys(config(),catalog);
  const first={TEMP_CURRENT:74,UV_INDEX:5,TEMP_UNIT:0,
    WX_HUMIDITY:62,DAY3_HIGH:80};
  transport.submit(first,keys,false);
  assert.deepEqual(sent.at(-1),{TEMP_CURRENT:74,UV_INDEX:5,TEMP_UNIT:0});
  const original=sent.length;
  transport.submit({...first,WX_HUMIDITY:70,DAY3_HIGH:91},keys,false);
  assert.equal(sent.length,original,'Irrelevant plugin changes generate no message');
  transport.submit({...first,UV_INDEX:6},keys,false);
  assert.deepEqual(sent.at(-1),{UV_INDEX:6},'Only new displayed value is sent');
  failNext=true;
  transport.submit({...first,TEMP_CURRENT:75,UV_INDEX:6},keys,false);
  assert.deepEqual(sent.at(-1),{TEMP_CURRENT:75});
  assert.equal(transport.snapshot().TEMP_CURRENT,74,'Failed push is not acknowledged');
  assert.equal(typeof retryFn,'function','A failed push schedules retry');
  const retry=retryFn;retry();
  assert.deepEqual(sent.at(-1),{TEMP_CURRENT:75},'Failed key retries');
  assert.equal(transport.snapshot().TEMP_CURRENT,75);
  transport.submit({...first,TEMP_CURRENT:75,UV_INDEX:6},keys,true);
  assert.deepEqual(sent.at(-1),{TEMP_CURRENT:75,UV_INDEX:6,TEMP_UNIT:0},
    'Reconnect forces a full displayed snapshot despite no changes');
  transport.submit({...first,TEMP_CURRENT:75,UV_INDEX:6},keys,false);
  assert.deepEqual(transport.snapshot(),{TEMP_CURRENT:75,UV_INDEX:6,TEMP_UNIT:0});
} finally {
  global.setTimeout=originalSetTimeout;
  global.clearTimeout=originalClearTimeout;
}

const native=fs.readFileSync('src/c/main.c','utf8');
const tick=native.slice(native.indexOf('static void update_time('),
  native.indexOf('static void update_time(')+4400);
assert.ok(!tick.includes('request_weather();'),
  'Minute tick must never request weather over Bluetooth');
assert.match(native,/bluetooth_callback\(bool connected\)[\s\S]*?request_weather\(\);/,
  'Watch requests an initial snapshot on connect');
const js=fs.readFileSync('src/pkjs/index.js','utf8');
assert.ok(js.includes('configureWeatherRecovery()'));
assert.ok(js.includes('weatherPlusCachedPacket'));
assert.ok(js.includes('queueSelectedWeather(dict,settings,false'));
assert.ok(js.includes('forceWeatherSnapshot()'));
console.log('Selective phone push, retry, reconnect and no watch polling passed');

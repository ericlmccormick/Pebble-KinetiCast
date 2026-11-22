// Four-slot complication catalog and Weather+ conversion regression tests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const catalog=require('../src/pkjs/corner-catalog');
const weather=require('../src/pkjs/corner-weather');
const plugins=require('../src/pkjs/corner-plugins');
const manifest=require('../package.json');
assert.equal(manifest.pebble.uuid,'f714c3de-9a38-4c4f-9486-2290af72e3b5','Preview must never overwrite the production watchface');
assert.equal(manifest.pebble.displayName,'KinetiCast Preview');
assert.equal(catalog.slots.length,4);
assert.ok(Object.keys(catalog.groups).length>=9);
assert.ok(catalog.groups.health.some(x=>x[0]===30&&/Original dual/.test(x[1])));
assert.ok(catalog.groups.system.some(x=>x[0]===80));
const all=Object.values(catalog.groups).flat().map(x=>x[0]);
assert.equal(new Set(all).size,all.length,'all complication IDs must be globally unique');
for(const slot of catalog.slots) {
  assert.ok(manifest.pebble.messageKeys['CORNER_'+slot]>0);
  assert.ok(manifest.pebble.messageKeys['CORNER_'+slot+'_VALUE']>0);
  assert.ok(manifest.pebble.messageKeys['CORNER_'+slot+'_LABEL']>0);
}
assert.deepEqual(catalog.slots.map(x=>catalog.chosenMetric({},x)),[1,2,30,38],
  'Classic custom defaults recreate the original corner choices');
assert.equal(catalog.chosenMetric({CORNER_TL_GROUP:'system',CORNER_TL_SYSTEM:'80'},'TL'),80);
assert.equal(catalog.chosenMetric({CORNER_TL_GROUP:'system',CORNER_TL_SYSTEM:'9000'},'TL'),80);
assert.equal(catalog.usesWeather({CORNER_MODE:1,CORNER_TL_GROUP:'weather'}),true);
assert.equal(catalog.usesCalendar({CORNER_MODE:1,CORNER_BL_GROUP:'calendar'}),true);
assert.equal(catalog.usesPlugins({CORNER_MODE:1,CORNER_BR_GROUP:'plugin'}),true);
assert.equal(catalog.usesWeather({CORNER_TL_GROUP:'weather'}),true);
assert.equal(catalog.centerView({}),0,'Original clock+date is default');
assert.equal(catalog.centerView({CENTER_VIEW:'3'}),3);
assert.ok(catalog.groups.clock.some(function(x){return x[0]===66&&/time/i.test(x[1]);}),
  'Time is a selectable corner complication');
function numeric(value,unit=''){return {numericValue:{value,unit}};}
function seq(values,now,unit=''){
  return {series:{start:now,stepSec:3600,numericValue:{values,unit}}};
}
const now=1800000000-nowModulo(1800000000,3600);
function nowModulo(a,b){return a%b;}
const props={
  feels_like:numeric(18,'°C'),humidity:numeric(0,'%'),wind_speed:numeric(5,'m/s'),
  hourly_precipitation:seq([10,40,65,20,0],now,'%'),
  hourly_temperature:seq([18,19,20,24,21],now,'°C'),
  sunrise:{timestamp:{value:now-3600}},sunset:{timestamp:{value:now+3600}},
  alert_count:numeric(0)
};
const out=weather.augment({},props,now);
assert.equal(out.WX_FEELS,18);
assert.equal(out.WX_HUMIDITY,0,'zero is not missing');
assert.equal(out.WX_WIND_SPEED,11);
assert.equal(out.WX_RAIN_CHANCE,10);
assert.equal(out.WX_RAIN_ETA,now+7200,'watch receives absolute rain arrival timestamp');
assert.equal(out.WX_RAIN_TREND,65);
assert.equal(out.WX_TEMP_TREND,6);
assert.equal(out.WX_AQI,weather.MISSING);
assert.equal(out.WX_SUNRISE,now-3600);
assert.equal(out.WX_ALERT,'No alerts');
const p=plugins.catalogEntries({enumeratePlugins:()=>[
 {uuid:'test-uuid',name:'Example',sources:[{category:'agent',
  items:['entity'],properties:{temperature:['numericValue'],invalid:['series.numericValue']}}]}
]});
assert.equal(p.length,1);
assert.match(p[0].label,/temperature/);
assert.deepEqual(plugins.parseSpec('uuid|agent|entity|value'),
  {uuid:'uuid',category:'agent',item:'entity',property:'value'});
assert.equal(plugins.textOf({boolean:{value:false}}),'Off');
const code=fs.readFileSync('src/c/main.c','utf8');
const render=fs.readFileSync('src/c/corner_render.inc','utf8');
for(const key of ['CORNER_MODE','CENTER_VIEW','BATTERY_BAR_STYLE','CORNER_TL','CORNER_TR',
 'CORNER_BL','CORNER_BR','WX_RAIN_ETA','WX_SUNRISE'])assert.ok(code.includes('MESSAGE_KEY_'+key));
assert.ok(render.includes('corner_rings(ctx,b,metric==30)'));
assert.ok(render.includes('corner_apply_visibility'));
assert.ok(render.includes('center_draw_proc'));
assert.ok(render.includes('layer_set_frame(s_goals_canvas,GRect(15,16-rise,72,72))'),
  'Original health ring canvas size and placement are preserved');
assert.ok(render.includes('layer_set_frame(text_layer_get_layer(s_date_layer),GRect(0,52,200,30))'),
  'Original date position is preserved');
assert.ok(render.includes('center==1?GRect(0,74,200,60):GRect(0,76,200,60)'),
  'Original time position is preserved by default');
assert.ok(!render.includes('const int preset[3][4]'),'Remove all layout presets');
assert.ok(code.includes('layer_set_hidden(s_battery_layer,s_battery_style==0)')||
  render.includes('layer_set_hidden(s_battery_layer,s_battery_style==0)'));
console.log('Complication catalog, weather conversion, plugin discovery and watch wiring passed');

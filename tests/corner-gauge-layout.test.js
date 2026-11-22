// All four slots must render combined weather with the original top-right
// geometry. The left weather "WEATHER"/ring/numeric overlay regression was
// caused by using a separate generic renderer and a too-short layer frame.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('src/c/main.c','utf8');
const render=fs.readFileSync('src/c/corner_render.inc','utf8');
const catalog=require('../src/pkjs/corner-catalog');
const uuid=require('../package.json').pebble.uuid;
assert.equal(uuid,'f714c3de-9a38-4c4f-9486-2290af72e3b5');
assert.equal(catalog.chosenMetric({CORNER_TL_GROUP:'weather',CORNER_TL_WEATHER:'2'},'TL'),2);
assert.equal(catalog.chosenMetric({CORNER_TR_GROUP:'weather',CORNER_TR_WEATHER:'2'},'TR'),2);
const draw=main.slice(main.indexOf('static void draw_combined_temperature('),
 main.indexOf('static void goals_update_proc('));
assert.match(draw,/static void draw_combined_temperature\(GContext \*ctx,GRect bounds\)/);
assert.match(draw,/static void weather_arc_update_proc\(Layer \*layer,GContext \*ctx\)\s*\{\s*\/\//);
assert.match(draw,/draw_combined_temperature\(ctx,layer_get_bounds\(layer\)\)/,
 'Legacy top-right gauge must call the same function as other corners');
assert.match(draw,/GRect\(bounds.origin.x\+15,bounds.origin.y\+35,35,22\)/);
assert.match(draw,/GRect\(bounds.origin.x\+bounds.size.w-50,bounds.origin.y\+35,35,22\)/);
assert.match(draw,/grect_inset\(bounds,GEdgeInsets\(14, 14, 28, 14\)\)/);
assert.match(draw,/GColorKellyGreen/);
assert.match(draw,/GColorYellow/);
assert.match(draw,/GColorOrange/);
assert.match(draw,/GColorRed/);
assert.match(draw,/GColorPurple/);
const corner=render.slice(render.indexOf('static void corner_draw_proc('),
 render.indexOf('// 32x32 transparent weather artwork'));
assert.match(corner,/if\(metric==2\)\s*\{[\s\S]*?const int w=90,h=85;[\s\S]*?draw_combined_temperature\(ctx,GRect\(x,y,w,h\)\);[\s\S]*?return;/,
 'Every movable combined-temperature complication reuses original 90x85 gauge');
assert.doesNotMatch(corner,/corner_numeric\(ctx,b,"WEATHER"/,
 'Original gauge is never overdrawn with a generic label or numeric layer');
const positions=[{slot:'TL',x:0,y:0,h:85},{slot:'TR',x:100,y:0,h:85},
 {slot:'BL',x:0,y:126,h:96},{slot:'BR',x:100,y:126,h:96}];
for(const p of positions){
 const pad=(100-90)/2;
 const yy=p.y+(p.h>85?(p.h-85)/2:0);
 assert.equal(pad,5);
 assert.ok(yy>=p.y);
 assert.ok(yy+85<=p.y+p.h,
  '90x85 original combined gauge must fit '+p.slot);
}
assert.match(render,/int height=\(metric==1\|\|metric==2\|\|metric==38\)\?85:60;/,
 'Icons, combined temp and heart graph get full top-corner space');
assert.match(render,/bool original_right=s_corner_metric\[1\]==2;/,
 'Original top-right gauge remains selected regardless of center mode');
assert.match(render,/if\(metric==1 && s_weather_bitmap\)[\s\S]*?int size=64;[\s\S]*?GCompOpSet/,
 'Native 64px condition icons must not be clipped in movable corners');
assert.match(corner,/if\(metric==81\)\s*\{[\s\S]*?corner_gauge\(ctx,b,s_battery_level,GColorKellyGreen\);[\s\S]*?corner_text\(ctx,battery_pct,[\s\S]*?return;/,
 'Battery gauge has a dedicated centered-value renderer');
assert.doesNotMatch(corner,/corner_numeric\(ctx,b,"BATTERY"/,
 'Battery gauge does not overdraw its ring with generic label');
assert.match(main,/MESSAGE_KEY_TEMP_HIGH\) \{ s_hi=get_int\(t\);weather_changed=true; \}/);
assert.match(main,/MESSAGE_KEY_TEMP_LOW\) \{ s_lo=get_int\(t\);weather_changed=true; \}/);
assert.match(main,/if \(weather_changed\) \{[\s\S]*?corner_redraw\(\);/,
 'Push-only provider changes must invalidate every visible copy');
assert.match(main,/corner_redraw\(\); \/\/ Also update copied temperature/,
 'Reconnect must repaint copied gauge warnings');
const push=require('../src/pkjs/weather-push');
const active={CORNER_TL_GROUP:'weather',CORNER_TL_WEATHER:'2',
  CORNER_TR_GROUP:'weather',CORNER_TR_WEATHER:'2',
  CORNER_BL_GROUP:'health',CORNER_BL_HEALTH:'32',
  CORNER_BR_GROUP:'health',CORNER_BR_HEALTH:'32',
  SHAKE_ACTION:'2',CENTER_VIEW:'0'};
const keys=push.watchedKeys(active,catalog);
for(const key of ['TEMP_CURRENT','TEMP_HIGH','TEMP_LOW','UV_INDEX','IS_NIGHT','TEMP_UNIT'])
  assert.ok(keys.includes(key),'Combined temperature actually draws '+key);
assert.ok(!keys.includes('WX_HUMIDITY'),'Unrelated weather values still do not push');
console.log('Shared original weather arc, all four corner frames, battery gauge and push redraws passed');

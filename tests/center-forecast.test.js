// Regression for center layout transitions and 32px forecast assets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('src/c/main.c','utf8');
const render=fs.readFileSync('src/c/corner_render.inc','utf8');
const catalog=require('../src/pkjs/corner-catalog');
const manifest=require('../package.json');
assert.deepEqual([0,1,2,3].map(n=>catalog.centerView({CENTER_VIEW:n})),[0,1,2,3]);
const visibility=render.slice(render.indexOf('static void corner_apply_visibility(void) {'));
assert.match(visibility,/bool original_center=center==0;/);
assert.match(visibility,/bool show_time=center==0\|\|center==1;/);
assert.match(visibility,/layer_set_hidden\(text_layer_get_layer\(s_date_layer\),!original_center\);/);
assert.match(visibility,/layer_set_hidden\(text_layer_get_layer\(s_time_layer\),!show_time\);/);
assert.match(visibility,/layer_set_hidden\(s_center_layer,center<2\);/);
const callback=main.slice(main.indexOf('static void inbox_received_callback(DictionaryIterator *iter, void *ctx) {'),
  main.indexOf('static void init() {'));
assert.match(callback,/MESSAGE_KEY_CENTER_VIEW/);
assert.match(callback,/if \(layout_changed\) \{[\s\S]*?execute_panel_transition\(false\);[\s\S]*?corner_apply_visibility\(\);/,
 'Changing center modes must explicitly reapply clock/date visibility, not only slide panel');
const flick=main.slice(main.indexOf('static void execute_panel_transition(bool alternate_view) {'),
  main.indexOf('static bool calendar_takeover_due_at'));
assert.doesNotMatch(flick,/corner_apply_visibility\(/,'Wrist flick must not change clock or corners');
assert.match(render,/GRect\(0,52,200,30\)/,'Date retains original frame');
assert.match(render,/GRect\(0,76,200,60\)/,'Time retains original frame');

const atlasMeta=manifest.pebble.resources.media.find(m=>m.name==='COMPACT_WEATHER_ATLAS');
assert.ok(atlasMeta,'The compact icons are bundled as a Pebble bitmap');
const atlas=fs.readFileSync('resources/'+atlasMeta.file);
assert.equal(atlas.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Valid PNG resource');
assert.equal(atlas.readUInt32BE(16),96,'Three columns of 32 pixels');
assert.equal(atlas.readUInt32BE(20),96,'Three rows of 32 pixels');
assert.equal(atlas[25],6,'RGBA PNG with alpha channel');
assert.match(render,/s_compact_atlas,GRect\(\(i%3\)\*32,\(i\/3\)\*32,32,32\)/);
assert.match(render,/draw_compact_forecast_icon\(ctx,icons\[i\],x\+17,18\)/);
assert.match(render,/graphics_context_set_compositing_mode\(ctx,GCompOpSet\)/,
 'The default bitmap composition ignores transparency');
assert.match(render,/graphics_context_set_compositing_mode\(ctx,GCompOpAssign\)/,
 'Restore default mode after compositing weather artwork');
console.log('Center Time/Date transition and 32px RGBA weather atlas regressions passed');

// Regression for temporary panels: they must slide up over the bottom only,
// leave clock and top weather intact, and use actually small 24px icons.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('src/c/main.c','utf8');
const renderer=fs.readFileSync('src/c/corner_render.inc','utf8');
const manifest=require('../package.json');
assert.equal(manifest.pebble.uuid,'f714c3de-9a38-4c4f-9486-2290af72e3b5');
const flick=main.slice(main.indexOf('static void execute_panel_transition(bool alternate_view) {'),
 main.indexOf('static bool calendar_takeover_due_at'));
assert.match(flick,/s_view_is_swapped=alternate_view/);
assert.match(flick,/move_panel\(s_forecast_container,show_weather\?126:228\);/);
assert.match(flick,/move_panel\(s_calendar_container,show_calendar\?126:228\);/);
assert.doesNotMatch(flick,/corner_apply_visibility\(|layer_set_hidden\(s_weather_arc_layer|s_center_view=/,
 'Wrist flick must not mutate normal layout or the original top-right weather');
assert.match(main,/animation_set_duration\(\(Animation \*\)animation, 300\)/);
assert.match(main,/s_view_swap_timer = app_timer_register\(7000, timer_callback, NULL\)/);
assert.match(main,/s_panel_override = -1;\s*execute_panel_transition\(false\);/);
assert.match(main,/layer_set_update_proc\(s_forecast_container,forecast_slide_draw_proc\);/);
assert.match(main,/layer_set_update_proc\(s_calendar_container,calendar_slide_draw_proc\);/);
assert.match(main,/layer_remove_from_parent\(s_forecast_container\);\s*layer_add_child\(w_layer,s_forecast_container\);/,
 'Slide panel must stack on top of old health rings and bottom complications');
assert.match(main,/layer_remove_from_parent\(text_layer_get_layer\(s_time_layer\)\)/,
 'Clock should remain above any edge-overlapping panel');
assert.match(renderer,/static int active_center_view\(void\) \{[\s\S]*?return s_center_view;/);
assert.doesNotMatch(renderer,/if\(s_view_is_swapped\)return s_panel_override/,
 'Temporary panel must not be treated as a change to center selection');
assert.match(renderer,/static void slide_panel_background\(/,
 'Overlay needs an opaque background above bottom complications');
assert.match(renderer,/draw_compact_forecast_icon\(ctx,icons\[i\],x\+21,18\)/);
assert.match(main,/layer_set_hidden\(bitmap_layer_get_layer\(s_f_icon1_layer\),false\)/,
  'The flick panel reuses original 64px image layers');
assert.doesNotMatch(renderer,/graphics_draw_bitmap_in_rect\(ctx,icons\[i\]/,
 'Large bitmaps get cropped, NOT rescaled by Pebble graphics_draw_bitmap_in_rect');
assert.match(renderer,/gbitmap_create_as_sub_bitmap/,'24px center icons use pre-scaled artwork');
assert.match(main,/compact_icons_init\(\)/,'Atlas is loaded once');
assert.match(main,/compact_icons_deinit\(\)/,'Atlas is freed on unload');
assert.ok(manifest.pebble.resources.media.some(item=>item.name==='COMPACT_WEATHER_ATLAS'));
assert.match(renderer,/layer_set_hidden\(s_forecast_container,false\)/,
 'Do not hide overlay until slide-down is complete');
assert.match(renderer,/layer_set_hidden\(s_weather_arc_layer,!original_right\)/);
console.log('Wrist flick uses original 64px icons in bottom slide; center uses real 24px artwork');

#include <pebble.h>

// ==============================================================================
// SECTION: CONSTANTS, IDENTIFIERS & STORAGE KEYS
// ==============================================================================

#define PERSIST_KEY_CUR 10 
#define PERSIST_KEY_HI 11  
#define PERSIST_KEY_LO 12  
#define PERSIST_KEY_ICON 13 
#define PERSIST_KEY_UV 14   
#define PERSIST_KEY_IS_NIGHT 15 
#define PERSIST_KEY_LAST_SLEEP_SEC 16 
#define PERSIST_KEY_SHOW_SLEEP 17 
#define PERSIST_KEY_THEME_MODE 18 
#define PERSIST_KEY_DEFAULT_VIEW 19 

#define PERSIST_KEY_D1_HI 20
#define PERSIST_KEY_D1_LO 21
#define PERSIST_KEY_D1_IC 22
#define PERSIST_KEY_D2_HI 23
#define PERSIST_KEY_D2_LO 24
#define PERSIST_KEY_D2_IC 25
#define PERSIST_KEY_D3_HI 26
#define PERSIST_KEY_D3_LO 27
#define PERSIST_KEY_D3_IC 28
#define PERSIST_KEY_WEATHER_TIME 29
#define PERSIST_KEY_HR_WINDOW 30
#define PERSIST_KEY_SLEEP_DURATION 31
#define PERSIST_KEY_TEMP_UNIT 32
#define PERSIST_KEY_DISTANCE_UNIT 33

#define HR_HISTORY_SIZE 60 

// ==============================================================================
// SECTION: STATE VARIABLES & UI POINTERS
// ==============================================================================

static Window *s_main_window; 
static TextLayer *s_time_layer, *s_date_layer, *s_hr_layer, *s_dist_layer; 
static Layer *s_weather_arc_layer, *s_goals_canvas; 
static BitmapLayer *s_weather_icon_layer, *s_heart_layer; 
static GBitmap *s_weather_bitmap = NULL, *s_heart_bitmap = NULL; 
static Layer *s_battery_layer, *s_sleep_layer, *s_hr_graph_layer; 

static Layer *s_health_container, *s_forecast_container; 
static TextLayer *s_f_day1_layer, *s_f_day2_layer, *s_f_day3_layer; 
static TextLayer *s_f_temp1_layer, *s_f_temp2_layer, *s_f_temp3_layer; 
static BitmapLayer *s_f_icon1_layer, *s_f_icon2_layer, *s_f_icon3_layer; 
static GBitmap *s_f_bmp1 = NULL, *s_f_bmp2 = NULL, *s_f_bmp3 = NULL; 
static AppTimer *s_view_swap_timer = NULL;
static AppTimer *s_sleep_dismiss_timer = NULL;
static int s_sleep_duration = 0; // 0: require tap; otherwise auto-dismiss seconds 

static int s_cur = 0, s_hi = 0, s_lo = 0, s_uv = 0; 
static int s_update_freq = 30, s_battery_level = 100;
static int s_hr_window = 20; 
static int s_step_goal = 10000, s_active_goal = 30; 
static bool s_connected = true, s_use_metric = false, s_is_night = false, s_show_sleep = true;
static int s_temp_unit = 0; // F=0, C=1, K=2, R=3 
static int s_theme_mode = 0, s_default_view = 0; 
static bool s_view_is_swapped = false; 

static int s_d1_hi = 0, s_d1_lo = 0, s_d2_hi = 0, s_d2_lo = 0, s_d3_hi = 0, s_d3_lo = 0; 
static char s_d1_ic[4] = "01d", s_d2_ic[4] = "01d", s_d3_ic[4] = "01d"; 

static int s_last_sleep_sec = 0; 
static char s_time_buf[10], s_cur_buf[8], s_hi_buf[8], s_lo_buf[8], s_hr_buf[8], s_dist_buf[16], s_sleep_buf[32] = ""; 
static char s_icon_code[4] = "01d"; 
static time_t s_last_weather_request = 0;
static time_t s_last_weather_success = 0;
static bool s_has_weather = false; 
static int s_hr_history[HR_HISTORY_SIZE]; 

// ==============================================================================
// SECTION: FORWARD DECLARATIONS
// ==============================================================================

static void animate_sleep_layer(bool slide_up); 
static void set_weather_icon(char *icon_code);  
static void update_health(); 
static void update_theme_colors(); 
static void execute_panel_transition(bool alternate_view); 
static void generate_forecast_bitmaps(); 

// ==============================================================================
// SECTION: UTILITY & HELPER FUNCTIONS
// ==============================================================================

static int get_int(Tuple *t) {
  if (t) { 
    if (t->type == TUPLE_INT) { 
      if (t->length == 1) return t->value->int8; 
      if (t->length == 2) return t->value->int16; 
      if (t->length == 4) return t->value->int32; 
    } else if (t->type == TUPLE_UINT) { 
      if (t->length == 1) return t->value->uint8; 
      if (t->length == 2) return t->value->uint16; 
      if (t->length == 4) return t->value->uint32; 
    } else if (t->type == TUPLE_CSTRING) { 
      return atoi(t->value->cstring); 
    }
  }
  return 0; 
}

static bool is_dark_theme() {
  return (s_theme_mode == 1) || (s_theme_mode == 2 && s_is_night);
}

static void request_weather() {
  time_t now = time(NULL);
  if (!s_connected || (s_last_weather_request && now - s_last_weather_request < 60)) return;
  int interval = s_update_freq < 10 ? 10 : (s_update_freq > 120 ? 120 : s_update_freq);
  // Reduce radio use automatically at critically low battery.
  if (s_battery_level <= 15) interval *= 2;
  if (s_has_weather && now - s_last_weather_success < interval * 60) return;
  
  DictionaryIterator *iter; 
  if (app_message_outbox_begin(&iter) == APP_MSG_OK) { 
    dict_write_uint8(iter, MESSAGE_KEY_REQUEST_WEATHER, 1); 
    if (app_message_outbox_send() == APP_MSG_OK) s_last_weather_request = now; 
  }
}

static void timer_callback(void *data) {
  s_view_swap_timer = NULL; 
  execute_panel_transition(false); 
}

static void save_weather_data() {
  persist_write_int(PERSIST_KEY_CUR, s_cur); 
  persist_write_int(PERSIST_KEY_HI, s_hi); 
  persist_write_int(PERSIST_KEY_LO, s_lo); 
  persist_write_string(PERSIST_KEY_ICON, s_icon_code); 
  persist_write_int(PERSIST_KEY_UV, s_uv); 
  persist_write_bool(PERSIST_KEY_IS_NIGHT, s_is_night);
  if (s_has_weather) persist_write_int(PERSIST_KEY_WEATHER_TIME, (int)s_last_weather_success); 
  persist_write_bool(PERSIST_KEY_SHOW_SLEEP, s_show_sleep); 
  persist_write_int(PERSIST_KEY_THEME_MODE, s_theme_mode); 
  persist_write_int(PERSIST_KEY_DEFAULT_VIEW, s_default_view);
  persist_write_int(PERSIST_KEY_HR_WINDOW, s_hr_window);
  persist_write_int(PERSIST_KEY_SLEEP_DURATION, s_sleep_duration);
  persist_write_int(PERSIST_KEY_TEMP_UNIT, s_temp_unit);
  persist_write_bool(PERSIST_KEY_DISTANCE_UNIT, s_use_metric); 
  
  persist_write_int(PERSIST_KEY_D1_HI, s_d1_hi);
  persist_write_int(PERSIST_KEY_D1_LO, s_d1_lo);
  persist_write_string(PERSIST_KEY_D1_IC, s_d1_ic);
  persist_write_int(PERSIST_KEY_D2_HI, s_d2_hi);
  persist_write_int(PERSIST_KEY_D2_LO, s_d2_lo);
  persist_write_string(PERSIST_KEY_D2_IC, s_d2_ic);
  persist_write_int(PERSIST_KEY_D3_HI, s_d3_hi);
  persist_write_int(PERSIST_KEY_D3_LO, s_d3_lo);
  persist_write_string(PERSIST_KEY_D3_IC, s_d3_ic);
}

static void load_weather_data() {
  if (persist_exists(PERSIST_KEY_CUR)) { 
    s_has_weather = true;
    s_last_weather_success = persist_exists(PERSIST_KEY_WEATHER_TIME) ? persist_read_int(PERSIST_KEY_WEATHER_TIME) : 0;
    s_cur = persist_read_int(PERSIST_KEY_CUR); 
    s_hi = persist_read_int(PERSIST_KEY_HI); 
    s_lo = persist_read_int(PERSIST_KEY_LO); 
    persist_read_string(PERSIST_KEY_ICON, s_icon_code, sizeof(s_icon_code)); 
    if (persist_exists(PERSIST_KEY_UV)) s_uv = persist_read_int(PERSIST_KEY_UV); 
    if (persist_exists(PERSIST_KEY_IS_NIGHT)) s_is_night = persist_read_bool(PERSIST_KEY_IS_NIGHT); 
  }
  if (persist_exists(PERSIST_KEY_LAST_SLEEP_SEC)) s_last_sleep_sec = persist_read_int(PERSIST_KEY_LAST_SLEEP_SEC);
  if (persist_exists(PERSIST_KEY_SHOW_SLEEP)) s_show_sleep = persist_read_bool(PERSIST_KEY_SHOW_SLEEP);
  if (persist_exists(PERSIST_KEY_TEMP_UNIT)) {
    int unit = persist_read_int(PERSIST_KEY_TEMP_UNIT);
    s_temp_unit = (unit >= 0 && unit <= 3) ? unit : 0;
  }
  if (persist_exists(PERSIST_KEY_DISTANCE_UNIT)) s_use_metric = persist_read_bool(PERSIST_KEY_DISTANCE_UNIT);
  if (persist_exists(PERSIST_KEY_THEME_MODE)) s_theme_mode = persist_read_int(PERSIST_KEY_THEME_MODE);
  if (persist_exists(PERSIST_KEY_DEFAULT_VIEW)) s_default_view = persist_read_int(PERSIST_KEY_DEFAULT_VIEW);
  if (persist_exists(PERSIST_KEY_SLEEP_DURATION)) {
    int duration = persist_read_int(PERSIST_KEY_SLEEP_DURATION);
    s_sleep_duration = (duration == 15 || duration == 30 || duration == 60) ? duration : 0;
  }
  if (persist_exists(PERSIST_KEY_HR_WINDOW)) {
    int value = persist_read_int(PERSIST_KEY_HR_WINDOW);
    s_hr_window = (value == 30 || value == 60) ? value : 20;
  }
  
  if (persist_exists(PERSIST_KEY_D1_HI)) s_d1_hi = persist_read_int(PERSIST_KEY_D1_HI);
  if (persist_exists(PERSIST_KEY_D1_LO)) s_d1_lo = persist_read_int(PERSIST_KEY_D1_LO);
  persist_read_string(PERSIST_KEY_D1_IC, s_d1_ic, sizeof(s_d1_ic));
  if (persist_exists(PERSIST_KEY_D2_HI)) s_d2_hi = persist_read_int(PERSIST_KEY_D2_HI);
  if (persist_exists(PERSIST_KEY_D2_LO)) s_d2_lo = persist_read_int(PERSIST_KEY_D2_LO);
  persist_read_string(PERSIST_KEY_D2_IC, s_d2_ic, sizeof(s_d2_ic));
  if (persist_exists(PERSIST_KEY_D3_HI)) s_d3_hi = persist_read_int(PERSIST_KEY_D3_HI);
  if (persist_exists(PERSIST_KEY_D3_LO)) s_d3_lo = persist_read_int(PERSIST_KEY_D3_LO);
  persist_read_string(PERSIST_KEY_D3_IC, s_d3_ic, sizeof(s_d3_ic));
}

static void tap_handler(AccelAxisType axis, int32_t direction) {
  if (layer_get_frame(s_sleep_layer).origin.y < 228) {
    if (s_sleep_dismiss_timer) { app_timer_cancel(s_sleep_dismiss_timer); s_sleep_dismiss_timer = NULL; } 
    animate_sleep_layer(false); 
    #if defined(PBL_HEALTH) 
    s_last_sleep_sec = (int)health_service_sum_today(HealthMetricSleepSeconds);
    persist_write_int(PERSIST_KEY_LAST_SLEEP_SEC, s_last_sleep_sec);
    #endif
  }
  
  execute_panel_transition(true); 
  
  if (s_view_swap_timer) { app_timer_cancel(s_view_swap_timer); }
  s_view_swap_timer = app_timer_register(7000, timer_callback, NULL); 
  
  request_weather(); 
  update_health(); 
  
  #if defined(PBL_HEALTH)
  // Do not invent a new historical sample during a tap.
  layer_mark_dirty(s_hr_graph_layer); 
  #endif
}

static void update_daily_goals() {
  #if defined(PBL_HEALTH) 
  time_t start = time_start_of_today(); 
  time_t end = start + SECONDS_PER_DAY; 
  int step_avg = (int)health_service_sum_averaged(HealthMetricStepCount, start, end, HealthServiceTimeScopeWeekly);
  int active_avg = (int)health_service_sum_averaged(HealthMetricActiveSeconds, start, end, HealthServiceTimeScopeWeekly) / 60;
  if (step_avg > 0) s_step_goal = step_avg; 
  if (active_avg > 0) s_active_goal = active_avg;
  #endif
}

static void animate_sleep_layer(bool slide_up) {
  GRect start_frame = layer_get_frame(s_sleep_layer); 
  int target_y = slide_up ? 174 : 228; 
  GRect finish_frame = GRect(0, target_y, 200, 54); 
  if (start_frame.origin.y == finish_frame.origin.y) return; 
  PropertyAnimation *anim = property_animation_create_layer_frame(s_sleep_layer, &start_frame, &finish_frame);
  animation_set_duration((Animation*)anim, 500); 
  animation_set_curve((Animation*)anim, AnimationCurveEaseOut); 
  animation_schedule((Animation*)anim); 
}

// CHANGED: The containers now slide up to Y=126 and use a height of 96 to properly fit the layout
static void sleep_dismiss_callback(void *context) {
  s_sleep_dismiss_timer = NULL;
  animate_sleep_layer(false);
  #if defined(PBL_HEALTH)
  s_last_sleep_sec = (int)health_service_sum_today(HealthMetricSleepSeconds);
  persist_write_int(PERSIST_KEY_LAST_SLEEP_SEC, s_last_sleep_sec);
  #endif
}

static void execute_panel_transition(bool alternate_view) {
  s_view_is_swapped = alternate_view; 
  bool display_forecast = (s_default_view == 0) ? s_view_is_swapped : !s_view_is_swapped;
  
  GRect health_start = layer_get_frame(s_health_container);
  GRect forecast_start = layer_get_frame(s_forecast_container);
  
  GRect health_end = display_forecast ? GRect(0, 222, 200, 96) : GRect(0, 126, 200, 96);
  GRect forecast_end = display_forecast ? GRect(0, 126, 200, 96) : GRect(0, 222, 200, 96);
  
  PropertyAnimation *anim_h = property_animation_create_layer_frame(s_health_container, &health_start, &health_end);
  PropertyAnimation *anim_f = property_animation_create_layer_frame(s_forecast_container, &forecast_start, &forecast_end);
  
  animation_set_duration((Animation*)anim_h, 400);
  animation_set_curve((Animation*)anim_h, AnimationCurveEaseInOut);
  animation_set_duration((Animation*)anim_f, 400);
  animation_set_curve((Animation*)anim_f, AnimationCurveEaseInOut);
  
  animation_schedule((Animation*)anim_h);
  animation_schedule((Animation*)anim_f);
}

static void bluetooth_callback(bool connected) {
  bool was_connected = s_connected;
  s_connected = connected;
  if (connected && !was_connected) { s_last_weather_request = 0; request_weather(); }
  if (!connected && !quiet_time_is_active()) vibes_double_pulse(); 
  layer_mark_dirty(s_weather_arc_layer); // Keep the last valid icon, even when offline. 
}

// ==============================================================================
// SECTION: CUSTOM DRAWING PROCEDURES
// ==============================================================================

static void weather_arc_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer); 
  graphics_context_set_antialiased(ctx, true); 
  graphics_context_set_text_color(ctx, is_dark_theme() ? GColorWhite : GColorBlack); 
  
  if (s_has_weather) snprintf(s_lo_buf, sizeof(s_lo_buf), "%d", s_lo);
  else snprintf(s_lo_buf, sizeof(s_lo_buf), "--"); 
  if (s_has_weather) snprintf(s_hi_buf, sizeof(s_hi_buf), "%d", s_hi);
  else snprintf(s_hi_buf, sizeof(s_hi_buf), "--"); 
  graphics_draw_text(ctx, s_lo_buf, fonts_get_system_font(s_temp_unit >= 2 ? FONT_KEY_GOTHIC_14_BOLD : FONT_KEY_GOTHIC_18_BOLD), GRect(15, 35, 35, 22), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, s_hi_buf, fonts_get_system_font(s_temp_unit >= 2 ? FONT_KEY_GOTHIC_14_BOLD : FONT_KEY_GOTHIC_18_BOLD), GRect(bounds.size.w - 50, 35, 35, 22), GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
  
  if (s_has_weather) snprintf(s_cur_buf, sizeof(s_cur_buf), "%d", s_cur);
  else snprintf(s_cur_buf, sizeof(s_cur_buf), "--"); 
  graphics_draw_text(ctx, s_cur_buf, fonts_get_system_font(s_temp_unit >= 2 ? FONT_KEY_GOTHIC_24_BOLD : FONT_KEY_GOTHIC_28_BOLD), GRect(0, 15, bounds.size.w, 35), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL); 
  
  GRect arc_bounds = grect_inset(bounds, GEdgeInsets(14, 14, 28, 14)); 
  graphics_context_set_stroke_width(ctx, 4); 
  graphics_context_set_stroke_color(ctx, is_dark_theme() ? GColorDarkGray : GColorLightGray); 
  graphics_draw_arc(ctx, arc_bounds, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(260), DEG_TO_TRIGANGLE(460));
  
  if (s_has_weather) {
    int range = s_hi - s_lo; 
    float percent = 0.5f; 
    if (range > 0) percent = (float)(s_cur - s_lo) / (float)range; 
    if (percent < 0.0f) percent = 0.0f; 
    if (percent > 1.0f) percent = 1.0f; 
    
    int angle = 260 + (int)(percent * 200.0f); 
    GPoint center = grect_center_point(&arc_bounds); 
    int16_t radius = (arc_bounds.size.w / 2) - 8; 
    
    GPoint dot = {
      (int16_t)(center.x + (sin_lookup(DEG_TO_TRIGANGLE(angle)) * radius / TRIG_MAX_RATIO)), 
      (int16_t)(center.y - (cos_lookup(DEG_TO_TRIGANGLE(angle)) * radius / TRIG_MAX_RATIO))  
    };
    
    GColor uv_color = is_dark_theme() ? GColorWhite : GColorBlack; 
    if (!s_is_night && s_uv > 0) { 
      if (s_uv <= 2) uv_color = GColorKellyGreen; 
      else if (s_uv <= 5) uv_color = GColorYellow; 
      else if (s_uv <= 7) uv_color = GColorOrange; 
      else if (s_uv <= 10) uv_color = GColorRed; 
      else uv_color = GColorPurple; 
    }
    graphics_context_set_fill_color(ctx, uv_color); 
    graphics_fill_circle(ctx, dot, 5);
  }
  time_t now = time(NULL);
  if (!s_connected || !s_has_weather || (s_last_weather_success > 0 && now - s_last_weather_success > (s_update_freq * 120))) {
    graphics_draw_text(ctx, "!", fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(bounds.size.w - 16, 0, 16, 22), GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
  }
}

static void goals_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer); 
  GRect draw_bounds = grect_inset(bounds, GEdgeInsets(3)); 
  graphics_context_set_antialiased(ctx, true); 
  
  int steps = (int)health_service_sum_today(HealthMetricStepCount); 
  int active = (int)health_service_sum_today(HealthMetricActiveSeconds) / 60; 
  
  graphics_context_set_stroke_width(ctx, 3); 
  graphics_context_set_stroke_color(ctx, is_dark_theme() ? GColorDarkGray : GColorLightGray); 
  
  graphics_draw_arc(ctx, grect_inset(draw_bounds, GEdgeInsets(1)), GOvalScaleModeFitCircle, 0, TRIG_MAX_ANGLE); 
  graphics_draw_arc(ctx, grect_inset(draw_bounds, GEdgeInsets(8)), GOvalScaleModeFitCircle, 0, TRIG_MAX_ANGLE); 
  
  graphics_context_set_stroke_width(ctx, 5); 
  graphics_context_set_stroke_color(ctx, GColorKellyGreen); 
  graphics_draw_arc(ctx, draw_bounds, GOvalScaleModeFitCircle, 0, (s_active_goal > 0) ? (active * TRIG_MAX_ANGLE) / s_active_goal : 0);
  graphics_context_set_stroke_color(ctx, GColorPictonBlue); 
  graphics_draw_arc(ctx, grect_inset(draw_bounds, GEdgeInsets(7)), GOvalScaleModeFitCircle, 0, (s_step_goal > 0) ? (steps * TRIG_MAX_ANGLE) / s_step_goal : 0);
}

static void hr_graph_update_proc(Layer *layer, GContext *ctx) {
  #if defined(PBL_HEALTH) 
  GRect bounds = layer_get_bounds(layer); 
  graphics_context_set_stroke_width(ctx, 2); 
  int visible = s_hr_window;
  if (visible != 20 && visible != 30 && visible != 60) visible = 20;
  int first = HR_HISTORY_SIZE - visible;
  // Multiplication before division retains width on small graph layers.
  for (int i = first; i < HR_HISTORY_SIZE - 1; i++) {
    if (s_hr_history[i] <= 0 || s_hr_history[i+1] <= 0) continue;
    int y1 = bounds.size.h - ((s_hr_history[i] - 55) / 2); 
    int y2 = bounds.size.h - ((s_hr_history[i+1] - 55) / 2);
    
    if(y1 < 2) { y1 = 2; } 
    if(y1 > bounds.size.h) { y1 = bounds.size.h; }
    if(y2 < 2) { y2 = 2; } 
    if(y2 > bounds.size.h) { y2 = bounds.size.h; }
    
    int avg_hr = (s_hr_history[i] + s_hr_history[i+1]) / 2;
    GColor line_color = GColorKellyGreen; 
    if (avg_hr < 70) line_color = GColorPictonBlue; 
    else if (avg_hr > 120) line_color = GColorRed; 
    else if (avg_hr > 95) line_color = GColorChromeYellow; 

    graphics_context_set_stroke_color(ctx, line_color); 
    int x1 = ((i - first) * (bounds.size.w - 1)) / (visible - 1);
    int x2 = ((i + 1 - first) * (bounds.size.w - 1)) / (visible - 1);
    graphics_draw_line(ctx, GPoint(x1, y1), GPoint(x2, y2)); 
  }
  #endif
}

static void sleep_layer_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer); 
  graphics_context_set_fill_color(ctx, GColorOxfordBlue); 
  graphics_fill_rect(ctx, bounds, 0, GCornerNone); 
  graphics_context_set_stroke_color(ctx, GColorPictonBlue); 
  graphics_context_set_stroke_width(ctx, 2); 
  graphics_draw_line(ctx, GPoint(0, 0), GPoint(bounds.size.w, 0)); 

  #if defined(PBL_HEALTH)
  int sleep_sec = (int)health_service_sum_today(HealthMetricSleepSeconds); 
  int restful_sec = (int)health_service_sum_today(HealthMetricSleepRestfulSeconds); 
  if (sleep_sec > 0) { 
    snprintf(s_sleep_buf, sizeof(s_sleep_buf), "Sleep: %dh %dm\nRestful: %d%%", sleep_sec / 3600, (sleep_sec % 3600) / 60, (restful_sec * 100) / sleep_sec);
  } else {
    snprintf(s_sleep_buf, sizeof(s_sleep_buf), "Calculating Sleep...");
  }
  graphics_context_set_text_color(ctx, GColorWhite); 
  graphics_draw_text(ctx, s_sleep_buf, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD), GRect(0, 6, bounds.size.w, bounds.size.h), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
  #endif
}

static void battery_update_proc(Layer *layer, GContext *ctx) {
  GRect b = layer_get_bounds(layer); 
  graphics_context_set_fill_color(ctx, s_battery_level > 20 ? GColorKellyGreen : GColorRed);
  graphics_fill_rect(ctx, GRect(0, 0, (s_battery_level * b.size.w) / 100, b.size.h), 0, GCornerNone);
}

// ==============================================================================
// SECTION: DISPLAY UPDATE & DATA HANDLING
// ==============================================================================

static void update_theme_colors() {
  GColor bg_color = is_dark_theme() ? GColorBlack : GColorWhite; 
  GColor fg_color = is_dark_theme() ? GColorWhite : GColorBlack; 

  window_set_background_color(s_main_window, bg_color); 
  text_layer_set_text_color(s_time_layer, fg_color); 
  text_layer_set_text_color(s_date_layer, fg_color); 
  text_layer_set_text_color(s_hr_layer, fg_color); 
  text_layer_set_text_color(s_dist_layer, fg_color); 
  
  text_layer_set_text_color(s_f_day1_layer, fg_color); 
  text_layer_set_text_color(s_f_day2_layer, fg_color); 
  text_layer_set_text_color(s_f_day3_layer, fg_color); 
  
  text_layer_set_text_color(s_f_temp1_layer, fg_color); 
  text_layer_set_text_color(s_f_temp2_layer, fg_color); 
  text_layer_set_text_color(s_f_temp3_layer, fg_color); 
  
  bitmap_layer_set_compositing_mode(s_weather_icon_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_heart_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_f_icon1_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_f_icon2_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_f_icon3_layer, GCompOpSet); 
  
  layer_mark_dirty(s_weather_arc_layer); 
  layer_mark_dirty(s_goals_canvas); 
}

static uint32_t get_resource_by_code(char *code) {
  if (strcmp(code, "01d") == 0) return RESOURCE_ID_ICON_CLEAR_DAY;
  if (strcmp(code, "01n") == 0) return RESOURCE_ID_ICON_CLEAR_NIGHT;
  if (strcmp(code, "02d") == 0) return RESOURCE_ID_ICON_CLOUDY_SUN;
  if (strcmp(code, "02n") == 0) return RESOURCE_ID_ICON_CLOUDY_NIGHT;
  if (strcmp(code, "03d") == 0 || strcmp(code, "03n") == 0 || strcmp(code, "04d") == 0 || strcmp(code, "04n") == 0) return RESOURCE_ID_ICON_CLOUDY;
  if (strcmp(code, "09d") == 0 || strcmp(code, "09n") == 0 || strcmp(code, "10d") == 0 || strcmp(code, "10n") == 0) return RESOURCE_ID_ICON_RAIN;
  if (strcmp(code, "11d") == 0 || strcmp(code, "11n") == 0) return RESOURCE_ID_ICON_THUNDER_SHOWER;
  if (strcmp(code, "13d") == 0 || strcmp(code, "13n") == 0) return RESOURCE_ID_ICON_SNOW;
  return RESOURCE_ID_ICON_HAZE;
}

static void generate_forecast_bitmaps() {
  bitmap_layer_set_bitmap(s_f_icon1_layer, NULL);
  bitmap_layer_set_bitmap(s_f_icon2_layer, NULL);
  bitmap_layer_set_bitmap(s_f_icon3_layer, NULL);
  if (s_f_bmp1) gbitmap_destroy(s_f_bmp1);
  if (s_f_bmp2) gbitmap_destroy(s_f_bmp2);
  if (s_f_bmp3) gbitmap_destroy(s_f_bmp3);
  
  s_f_bmp1 = gbitmap_create_with_resource(get_resource_by_code(s_d1_ic));
  s_f_bmp2 = gbitmap_create_with_resource(get_resource_by_code(s_d2_ic));
  s_f_bmp3 = gbitmap_create_with_resource(get_resource_by_code(s_d3_ic));
  
  bitmap_layer_set_bitmap(s_f_icon1_layer, s_f_bmp1);
  bitmap_layer_set_bitmap(s_f_icon2_layer, s_f_bmp2);
  bitmap_layer_set_bitmap(s_f_icon3_layer, s_f_bmp3);
}

static void set_weather_icon(char *icon_code) {
  bitmap_layer_set_bitmap(s_weather_icon_layer, NULL);
  if (s_weather_bitmap) { gbitmap_destroy(s_weather_bitmap); s_weather_bitmap = NULL; }
  if (icon_code != s_icon_code) snprintf(s_icon_code, sizeof(s_icon_code), "%s", icon_code); 
  uint32_t res_id = get_resource_by_code(s_icon_code); // Preserve weather icon when disconnected.
  s_weather_bitmap = gbitmap_create_with_resource(res_id); 
  bitmap_layer_set_bitmap(s_weather_icon_layer, s_weather_bitmap); 
}

static void update_time(struct tm *tick_time, TimeUnits units_changed) {
  int hour = tick_time->tm_hour; 
  if (!clock_is_24h_style()) { hour %= 12; if (hour == 0) hour = 12; } 
  snprintf(s_time_buf, sizeof(s_time_buf), clock_is_24h_style() ? "%02d:%02d" : "%d:%02d", hour, tick_time->tm_min);
  text_layer_set_text(s_time_layer, s_time_buf); 
  
  static char d_buf[16]; 
  strftime(d_buf, sizeof(d_buf), "%a, %b %d", tick_time); 
  text_layer_set_text(s_date_layer, d_buf); 
  
  static char d1_txt[8], d2_txt[8], d3_txt[8]; 
  static char t1_txt[12], t2_txt[12], t3_txt[12]; 
  static const char* const day_names[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}; 
  time_t weekday_now = time(NULL); 
  
  struct tm *t1 = localtime(&(time_t){weekday_now + SECONDS_PER_DAY}); 
  snprintf(d1_txt, sizeof(d1_txt), "%s", day_names[t1->tm_wday]); 
  snprintf(t1_txt, sizeof(t1_txt), s_temp_unit == 2 ? "%d/%d" : "%d°/%d°", s_d1_hi, s_d1_lo); 
  text_layer_set_text(s_f_day1_layer, d1_txt); 
  text_layer_set_text(s_f_temp1_layer, t1_txt); 
  
  struct tm *t2 = localtime(&(time_t){weekday_now + (SECONDS_PER_DAY * 2)}); 
  snprintf(d2_txt, sizeof(d2_txt), "%s", day_names[t2->tm_wday]); 
  snprintf(t2_txt, sizeof(t2_txt), s_temp_unit == 2 ? "%d/%d" : "%d°/%d°", s_d2_hi, s_d2_lo); 
  text_layer_set_text(s_f_day2_layer, d2_txt); 
  text_layer_set_text(s_f_temp2_layer, t2_txt); 
  
  struct tm *t3 = localtime(&(time_t){weekday_now + (SECONDS_PER_DAY * 3)}); 
  snprintf(d3_txt, sizeof(d3_txt), "%s", day_names[t3->tm_wday]); 
  snprintf(t3_txt, sizeof(t3_txt), s_temp_unit == 2 ? "%d/%d" : "%d°/%d°", s_d3_hi, s_d3_lo); 
  text_layer_set_text(s_f_day3_layer, d3_txt); 
  text_layer_set_text(s_f_temp3_layer, t3_txt); 

  request_weather(); // Throttled according to UPDATE_FREQ and the last valid update.
  if (tick_time->tm_min % 5 == 0) layer_mark_dirty(s_weather_arc_layer); 

  #if defined(PBL_HEALTH)
  if (tick_time->tm_hour == 0 && tick_time->tm_min == 0) { 
    s_last_sleep_sec = 0; 
    persist_delete(PERSIST_KEY_LAST_SLEEP_SEC);
  }
  if (s_show_sleep && (int)health_service_sum_today(HealthMetricSleepSeconds) >= s_last_sleep_sec + 7200) { 
    layer_mark_dirty(s_sleep_layer);
    bool was_hidden = layer_get_frame(s_sleep_layer).origin.y >= 228;
    animate_sleep_layer(true);
    if (was_hidden && s_sleep_duration > 0 && !s_sleep_dismiss_timer) {
      s_sleep_dismiss_timer = app_timer_register(s_sleep_duration * 1000, sleep_dismiss_callback, NULL);
    } 
  } else {
    animate_sleep_layer(false); 
  }
  for(int i = 0; i < HR_HISTORY_SIZE - 1; i++) s_hr_history[i] = s_hr_history[i+1]; 
  int sampled_bpm = (int)health_service_peek_current_value(HealthMetricHeartRateBPM);
  s_hr_history[HR_HISTORY_SIZE - 1] = sampled_bpm > 0 ? sampled_bpm : 0;
  layer_mark_dirty(s_hr_graph_layer); 
  #endif
}

static void update_health() {
  #if defined(PBL_HEALTH)
  int bpm = (int)health_service_peek_current_value(HealthMetricHeartRateBPM);
  if (bpm > 0) snprintf(s_hr_buf, sizeof(s_hr_buf), "%d", bpm);
  else snprintf(s_hr_buf, sizeof(s_hr_buf), "--"); 
  text_layer_set_text(s_hr_layer, s_hr_buf); 
  
  int dist_m = (int)health_service_sum_today(HealthMetricWalkedDistanceMeters);
  int dist_100th = s_use_metric ? (dist_m * 100) / 1000 : (dist_m * 100) / 1609;
  snprintf(s_dist_buf, sizeof(s_dist_buf), "%d.%01d", dist_100th / 100, (dist_100th % 100) / 10);
  text_layer_set_text(s_dist_layer, s_dist_buf); 
  layer_mark_dirty(s_goals_canvas); 
  #endif
}

static void health_handler(HealthEventType event, void *context) {
  if (event == HealthEventSignificantUpdate) { update_daily_goals(); update_health(); }
  else if (event == HealthEventMovementUpdate || event == HealthEventHeartRateUpdate) update_health();
}

static void battery_callback(BatteryChargeState state) {
  s_battery_level = state.charge_percent; 
  layer_mark_dirty(s_battery_layer); 
}

// ==============================================================================
// SECTION: APP LIFECYCLE CONTROLS
// ==============================================================================

static void main_window_load(Window *window) {
  Layer *w_layer = window_get_root_layer(window); 
  
  s_weather_icon_layer = bitmap_layer_create(GRect(15, 0, 64, 64)); 
  layer_add_child(w_layer, bitmap_layer_get_layer(s_weather_icon_layer)); 
  
  s_weather_arc_layer = layer_create(GRect(105, 0, 90, 85)); 
  layer_set_update_proc(s_weather_arc_layer, weather_arc_update_proc); 
  layer_add_child(w_layer, s_weather_arc_layer); 
  
  // ==============================================================================
  // SECTION: DATE AND TIME LAYERS
  // ==============================================================================
  
  s_date_layer = text_layer_create(GRect(0, 52, 200, 30)); // Create the date text layer
  text_layer_set_font(s_date_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD)); // Assign the bold 24pt font
  text_layer_set_text_alignment(s_date_layer, GTextAlignmentCenter); // Center the date text
  text_layer_set_background_color(s_date_layer, GColorClear); // Explicitly set background to transparent to fix dark mode bug
  layer_add_child(w_layer, text_layer_get_layer(s_date_layer)); // Mount the date layer to the main window
  
  s_time_layer = text_layer_create(GRect(0, 76, 200, 60)); // Create the time text layer
  text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_ROBOTO_BOLD_SUBSET_49)); // Assign the large 49pt font
  text_layer_set_text_alignment(s_time_layer, GTextAlignmentCenter); // Center the time text
  text_layer_set_background_color(s_time_layer, GColorClear); // Explicitly set background to transparent to fix dark mode bug
  layer_add_child(w_layer, text_layer_get_layer(s_time_layer)); // Mount the time layer to the main window
  
  
  load_weather_data();

  // CHANGED: Base container Y starting point moved up to 126. Height expanded to 96px.
  int initial_health_y = (s_default_view == 0) ? 126 : 222;
  int initial_forecast_y = (s_default_view == 1) ? 126 : 222;

  s_health_container = layer_create(GRect(0, initial_health_y, 200, 96));
  s_forecast_container = layer_create(GRect(0, initial_forecast_y, 200, 96));
  layer_add_child(w_layer, s_health_container);
  layer_add_child(w_layer, s_forecast_container);

  // CHANGED: All inner Y coordinates for health increased by 16 so they remain visually anchored where they were
  s_goals_canvas = layer_create(GRect(15, 16, 72, 72)); 
  layer_set_update_proc(s_goals_canvas, goals_update_proc); 
  layer_add_child(s_health_container, s_goals_canvas); 

  s_dist_layer = text_layer_create(GRect(12, 34, 76, 35)); 
  text_layer_set_font(s_dist_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD)); 
  text_layer_set_text_alignment(s_dist_layer, GTextAlignmentCenter); 
  text_layer_set_background_color(s_dist_layer, GColorClear); 
  layer_add_child(s_health_container, text_layer_get_layer(s_dist_layer)); 

  s_heart_layer = bitmap_layer_create(GRect(120, 20, 32, 32)); 
  s_heart_bitmap = gbitmap_create_with_resource(RESOURCE_ID_ICON_HEART); 
  bitmap_layer_set_bitmap(s_heart_layer, s_heart_bitmap); 
  layer_add_child(s_health_container, bitmap_layer_get_layer(s_heart_layer)); 

  s_hr_layer = text_layer_create(GRect(145, 14, 55, 35)); 
  text_layer_set_font(s_hr_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD)); 
  text_layer_set_text_alignment(s_hr_layer, GTextAlignmentCenter); 
  text_layer_set_background_color(s_hr_layer, GColorClear); 
  layer_add_child(s_health_container, text_layer_get_layer(s_hr_layer)); 

  s_hr_graph_layer = layer_create(GRect(120, 64, 64, 20)); 
  layer_set_update_proc(s_hr_graph_layer, hr_graph_update_proc); 
  layer_add_child(s_health_container, s_hr_graph_layer); 

  // CHANGED: Day & Icon coordinates adjusted relative to new 96px tall container to prevent overlap
  s_f_day1_layer = text_layer_create(GRect(2, 0, 64, 20)); 
  s_f_day2_layer = text_layer_create(GRect(68, 0, 64, 20)); 
  s_f_day3_layer = text_layer_create(GRect(134, 0, 64, 20)); 

  s_f_icon1_layer = bitmap_layer_create(GRect(2, 16, 64, 64)); 
  s_f_icon2_layer = bitmap_layer_create(GRect(68, 16, 64, 64)); 
  s_f_icon3_layer = bitmap_layer_create(GRect(134, 16, 64, 64)); 

  s_f_temp1_layer = text_layer_create(GRect(2, 74, 64, 24)); 
  s_f_temp2_layer = text_layer_create(GRect(68, 74, 64, 24)); 
  s_f_temp3_layer = text_layer_create(GRect(134, 74, 64, 24)); 
  
  bitmap_layer_set_compositing_mode(s_f_icon1_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_f_icon2_layer, GCompOpSet); 
  bitmap_layer_set_compositing_mode(s_f_icon3_layer, GCompOpSet); 
  
  layer_add_child(s_forecast_container, bitmap_layer_get_layer(s_f_icon1_layer)); 
  layer_add_child(s_forecast_container, bitmap_layer_get_layer(s_f_icon2_layer)); 
  layer_add_child(s_forecast_container, bitmap_layer_get_layer(s_f_icon3_layer)); 

  text_layer_set_font(s_f_day1_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  text_layer_set_font(s_f_day2_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  text_layer_set_font(s_f_day3_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  text_layer_set_font(s_f_temp1_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  text_layer_set_font(s_f_temp2_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  text_layer_set_font(s_f_temp3_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD)); 
  
  text_layer_set_background_color(s_f_day1_layer, GColorClear); 
  text_layer_set_background_color(s_f_day2_layer, GColorClear); 
  text_layer_set_background_color(s_f_day3_layer, GColorClear); 
  text_layer_set_background_color(s_f_temp1_layer, GColorClear); 
  text_layer_set_background_color(s_f_temp2_layer, GColorClear); 
  text_layer_set_background_color(s_f_temp3_layer, GColorClear); 

  text_layer_set_text_alignment(s_f_day1_layer, GTextAlignmentCenter); 
  text_layer_set_text_alignment(s_f_day2_layer, GTextAlignmentCenter); 
  text_layer_set_text_alignment(s_f_day3_layer, GTextAlignmentCenter); 
  text_layer_set_text_alignment(s_f_temp1_layer, GTextAlignmentCenter); 
  text_layer_set_text_alignment(s_f_temp2_layer, GTextAlignmentCenter); 
  text_layer_set_text_alignment(s_f_temp3_layer, GTextAlignmentCenter); 
  
  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_day1_layer)); 
  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_day2_layer)); 
  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_day3_layer)); 

  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_temp1_layer)); 
  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_temp2_layer)); 
  layer_add_child(s_forecast_container, text_layer_get_layer(s_f_temp3_layer)); 

  #if defined(PBL_HEALTH)
  for(int i = 0; i < HR_HISTORY_SIZE; i++) s_hr_history[i] = 0; 
  time_t end_time = time(NULL);
  time_t start_time = end_time - (HR_HISTORY_SIZE * SECONDS_PER_MINUTE);
  HealthMinuteData minute_data[HR_HISTORY_SIZE]; 
  uint32_t num_records = health_service_get_minute_history(minute_data, HR_HISTORY_SIZE, &start_time, &end_time);
  if (num_records > 0) { 
    int offset = HR_HISTORY_SIZE - num_records; 
    int last_valid_hr = 0; 
    for (uint32_t i = 0; i < num_records; i++) {
      int hr = minute_data[i].heart_rate_bpm;
      last_valid_hr = (!minute_data[i].is_invalid && hr > 0) ? hr : 0; 
      if ((offset + i) < HR_HISTORY_SIZE) s_hr_history[offset + i] = last_valid_hr; 
    }
    int oldest_hr = 0;
    for (int i = 0; i < offset; i++) s_hr_history[i] = oldest_hr; 
  }
  int current_hr = (int)health_service_peek_current_value(HealthMetricHeartRateBPM);
  if (current_hr > 0) s_hr_history[HR_HISTORY_SIZE - 1] = current_hr; 
  #endif

  s_battery_layer = layer_create(GRect(0, 222, 200, 6)); 
  layer_set_update_proc(s_battery_layer, battery_update_proc); 
  layer_add_child(w_layer, s_battery_layer); 
  
  s_sleep_layer = layer_create(GRect(0, 228, 200, 54)); 
  layer_set_update_proc(s_sleep_layer, sleep_layer_update_proc); 
  layer_add_child(w_layer, s_sleep_layer); 

  set_weather_icon(s_icon_code); 
  generate_forecast_bitmaps();
  update_theme_colors(); 
  update_daily_goals();
  
  time_t now = time(NULL); 
  update_time(localtime(&now), MINUTE_UNIT); 
  update_health(); 
}

static void main_window_unload(Window *window) {
  if (s_weather_bitmap) gbitmap_destroy(s_weather_bitmap); 
  if (s_heart_bitmap) gbitmap_destroy(s_heart_bitmap); 
  if (s_f_bmp1) gbitmap_destroy(s_f_bmp1); 
  if (s_f_bmp2) gbitmap_destroy(s_f_bmp2); 
  if (s_f_bmp3) gbitmap_destroy(s_f_bmp3);
  if (s_view_swap_timer) { app_timer_cancel(s_view_swap_timer); s_view_swap_timer = NULL; }
  if (s_sleep_dismiss_timer) { app_timer_cancel(s_sleep_dismiss_timer); s_sleep_dismiss_timer = NULL; }
  bitmap_layer_destroy(s_weather_icon_layer);
  bitmap_layer_destroy(s_heart_layer);
  text_layer_destroy(s_time_layer);
  text_layer_destroy(s_date_layer);
  text_layer_destroy(s_hr_layer);
  text_layer_destroy(s_dist_layer);
  layer_destroy(s_weather_arc_layer);
  layer_destroy(s_goals_canvas);
  layer_destroy(s_hr_graph_layer);
  layer_destroy(s_battery_layer);
  layer_destroy(s_sleep_layer);
  
  text_layer_destroy(s_f_day1_layer); 
  text_layer_destroy(s_f_day2_layer); 
  text_layer_destroy(s_f_day3_layer); 

  text_layer_destroy(s_f_temp1_layer); 
  text_layer_destroy(s_f_temp2_layer); 
  text_layer_destroy(s_f_temp3_layer); 
  
  bitmap_layer_destroy(s_f_icon1_layer); 
  bitmap_layer_destroy(s_f_icon2_layer); 
  bitmap_layer_destroy(s_f_icon3_layer); 
  
  layer_destroy(s_health_container); 
  layer_destroy(s_forecast_container); 
}

static void inbox_received_callback(DictionaryIterator *iter, void *ctx) {
  Tuple *t = dict_read_first(iter); 
  bool theme_changed = false;
  bool layout_changed = false;
  bool forecast_icons_changed = false;
  bool weather_changed = false;

  while(t) { 
    if(t->key == MESSAGE_KEY_TEMP_CURRENT) { s_cur = get_int(t); s_has_weather = true; s_last_weather_success = time(NULL); weather_changed = true; }
    else if(t->key == MESSAGE_KEY_TEMP_HIGH) s_hi = get_int(t);
    else if(t->key == MESSAGE_KEY_TEMP_LOW) s_lo = get_int(t);
    else if(t->key == MESSAGE_KEY_CONDITIONS && t->type == TUPLE_CSTRING) { if(strcmp(s_icon_code, t->value->cstring)) set_weather_icon(t->value->cstring); }
    else if(t->key == MESSAGE_KEY_UPDATE_FREQ) s_update_freq = get_int(t);
    else if(t->key == MESSAGE_KEY_UNITS || t->key == MESSAGE_KEY_DISTANCE_UNIT) { s_use_metric = (get_int(t) == 1); update_health(); }
    else if(t->key == MESSAGE_KEY_TEMP_UNIT) { int unit = get_int(t); s_temp_unit = (unit >= 0 && unit <= 3) ? unit : 0; }
    else if(t->key == MESSAGE_KEY_UV_INDEX) s_uv = get_int(t);
    else if(t->key == MESSAGE_KEY_IS_NIGHT) {
      if (s_is_night != (get_int(t) == 1)) { s_is_night = (get_int(t) == 1); theme_changed = true; }
    }
    else if(t->key == MESSAGE_KEY_SHOW_SLEEP) s_show_sleep = (get_int(t) == 1); 
    else if(t->key == MESSAGE_KEY_THEME_MODE) {
      if (s_theme_mode != get_int(t)) { s_theme_mode = get_int(t); theme_changed = true; }
    }
    else if(t->key == MESSAGE_KEY_SLEEP_BRIEF_SECONDS) {
      int seconds = get_int(t);
      s_sleep_duration = (seconds == 15 || seconds == 30 || seconds == 60) ? seconds : 0;
    }
    else if(t->key == MESSAGE_KEY_HR_GRAPH_WINDOW) {
      int size = get_int(t);
      s_hr_window = (size == 30 || size == 60) ? size : 20;
      layer_mark_dirty(s_hr_graph_layer);
    }
    else if(t->key == MESSAGE_KEY_DEFAULT_VIEW) {
      if (s_default_view != get_int(t)) { s_default_view = get_int(t); layout_changed = true; }
    }
    else if(t->key == MESSAGE_KEY_DAY1_HIGH) s_d1_hi = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY1_LOW) s_d1_lo = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY1_ICON && t->type == TUPLE_CSTRING) { if(strcmp(s_d1_ic, t->value->cstring)) { snprintf(s_d1_ic, sizeof(s_d1_ic), "%s", t->value->cstring); forecast_icons_changed = true; }}
    else if(t->key == MESSAGE_KEY_DAY2_HIGH) s_d2_hi = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY2_LOW) s_d2_lo = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY2_ICON && t->type == TUPLE_CSTRING) { if(strcmp(s_d2_ic, t->value->cstring)) { snprintf(s_d2_ic, sizeof(s_d2_ic), "%s", t->value->cstring); forecast_icons_changed = true; }}
    else if(t->key == MESSAGE_KEY_DAY3_HIGH) s_d3_hi = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY3_LOW) s_d3_lo = get_int(t);
    else if(t->key == MESSAGE_KEY_DAY3_ICON && t->type == TUPLE_CSTRING) { if(strcmp(s_d3_ic, t->value->cstring)) { snprintf(s_d3_ic, sizeof(s_d3_ic), "%s", t->value->cstring); forecast_icons_changed = true; }}

    t = dict_read_next(iter); 
  }
  save_weather_data(); 
  if (forecast_icons_changed) generate_forecast_bitmaps();
  if (weather_changed) layer_mark_dirty(s_weather_arc_layer);
  
  if (theme_changed) update_theme_colors(); 
  if (layout_changed) execute_panel_transition(false); 
  
  time_t now = time(NULL);
  update_time(localtime(&now), MINUTE_UNIT);
}

static void init() {
  s_main_window = window_create(); 
  window_set_window_handlers(s_main_window, (WindowHandlers) { .load = main_window_load, .unload = main_window_unload });
  window_stack_push(s_main_window, true); 
  
  tick_timer_service_subscribe(MINUTE_UNIT, update_time); 
  battery_state_service_subscribe(battery_callback); 
  battery_callback(battery_state_service_peek()); 
  accel_tap_service_subscribe(tap_handler); 
  app_message_register_inbox_received(inbox_received_callback); 
  app_message_open(512, 512); 
  
  connection_service_subscribe((ConnectionHandlers) { .pebble_app_connection_handler = bluetooth_callback }); 
  bluetooth_callback(connection_service_peek_pebble_app_connection()); 

  #if defined(PBL_HEALTH)
  health_service_events_subscribe(health_handler, NULL);
  #endif
}

int main(void) { 
  init(); 
  app_event_loop();
  tick_timer_service_unsubscribe();
  battery_state_service_unsubscribe();
  accel_tap_service_unsubscribe();
  connection_service_unsubscribe();
  #if defined(PBL_HEALTH)
  health_service_events_unsubscribe();
  #endif
  app_message_deregister_callbacks();
  window_destroy(s_main_window);
}
// Four-corner complication renderer; included after legacy layer draw helpers.
// The classic layout is untouched unless CORNER_MODE=1.
#define KC_MISSING (-32768)
static void corner_redraw(void) {
  for(int i=0;i<4;i++) if(s_corner_layers[i]) layer_mark_dirty(s_corner_layers[i]);
}
// Seconds refresh is opt-in, independently of minute ticks and HR history.
static AppTimer *s_corner_seconds_timer=NULL;
static bool corner_has_seconds(void) {
  if(!s_corner_mode)return false;
  for(int i=0;i<4;i++)if(s_corner_metric[i]==64)return true;
  return false;
}
static void corner_seconds_callback(void *ctx) {
  (void)ctx;s_corner_seconds_timer=NULL;
  if(corner_has_seconds()) {
    corner_redraw();
    s_corner_seconds_timer=app_timer_register(1000,corner_seconds_callback,NULL);
  }
}
static void corner_sync_seconds(void) {
  if(!corner_has_seconds()) {
    if(s_corner_seconds_timer){app_timer_cancel(s_corner_seconds_timer);s_corner_seconds_timer=NULL;}
  } else if(!s_corner_seconds_timer) {
    s_corner_seconds_timer=app_timer_register(1000,corner_seconds_callback,NULL);
  }
}
static const char *corner_label(int metric) {
  switch(metric) {
    case 3:return "NOW"; case 4:return "HI / LO"; case 5:return "CONDITIONS";
    case 6:return "FEELS LIKE";case 7:return "HUMIDITY";case 8:return "WIND";
    case 9:return "GUST";case 10:return "DEW POINT";case 11:return "PRESSURE";
    case 12:return "CLOUDS";case 13:return "VISIBILITY";case 14:return "UV INDEX";
    case 15:return "RAIN CHANCE";case 16:return "RAIN ETA";case 17:return "RAIN TREND";
    case 18:return "TEMP TREND";case 19:return "FORECAST";case 20:return "ALERT";
    case 21:return "AIR QUALITY";case 22:return "PM2.5";case 23:return "PM10";
    case 24:return "OZONE";case 25:return "WAVES";case 26:return "WAVE PERIOD";
    case 27:return "SWELL";case 28:return "SEA TEMP";
    case 32:return "STEPS";case 33:return "STEP GOAL";case 34:return "DISTANCE";
    case 35:return "ACTIVE";case 36:return "ACTIVE GOAL";case 37:return "HEART RATE";
    case 38:return "HEART RATE";case 39:return "SLEEP";case 40:return "RESTFUL";
    case 41:return "RESTFUL %";case 42:return "CALORIES";case 50:return "NEXT EVENT";
    case 51:return "NEXT EVENT";case 52:return "NEXT EVENT";
    case 60:return "DATE";case 61:return "WEEK";case 62:return "DAY OF YEAR";
    case 63:return "YEAR";case 64:return "SECONDS";case 65:return "TIME ZONE";
    case 70:return "SUNRISE";case 71:return "SUNSET";case 72:return "DAYLIGHT";
    case 73:return "DAYLIGHT";case 74:return "MOON";case 75:return "MOON LIT";
    case 80:return "BATTERY";case 81:return "BATTERY";case 82:return "DAYS LEFT";
    case 83:return "CHARGING";case 84:return "PHONE";case 85:return "QUIET TIME";
    default:return "";
  }
}
static void corner_text(GContext *ctx,const char *text,int y,int h,GFont font,
                        GTextAlignment alignment,int width) {
  graphics_draw_text(ctx,text?text:"--",font,GRect(0,y,width,h),
    GTextOverflowModeTrailingEllipsis,alignment,NULL);
}
static void corner_numeric(GContext *ctx,GRect b,const char *label,const char *value,const char *aux) {
  graphics_context_set_text_color(ctx,is_dark_theme()?GColorWhite:GColorBlack);
  corner_text(ctx,label,1,18,fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),GTextAlignmentCenter,b.size.w);
  int mainY=(aux&&aux[0])?18:23;
  GFont font=fonts_get_system_font(strlen(value)>9?FONT_KEY_GOTHIC_18_BOLD:
    strlen(value)>6?FONT_KEY_GOTHIC_24_BOLD:FONT_KEY_GOTHIC_28_BOLD);
  corner_text(ctx,value,mainY,32,font,GTextAlignmentCenter,b.size.w);
  if(aux&&aux[0])corner_text(ctx,aux,b.size.h-20,18,fonts_get_system_font(FONT_KEY_GOTHIC_14),
    GTextAlignmentCenter,b.size.w);
}
static void corner_gauge(GContext *ctx,GRect b,int percent,GColor foreground) {
  if(percent<0)percent=0;
  if(percent>100)percent=100;
  GRect outer=GRect(14,12,b.size.w-28,b.size.h-24);
  graphics_context_set_stroke_width(ctx,5);
  graphics_context_set_stroke_color(ctx,is_dark_theme()?GColorDarkGray:GColorLightGray);
  graphics_draw_arc(ctx,outer,GOvalScaleModeFitCircle,0,TRIG_MAX_ANGLE);
  graphics_context_set_stroke_color(ctx,foreground);
  graphics_draw_arc(ctx,outer,GOvalScaleModeFitCircle,0,(percent*TRIG_MAX_ANGLE)/100);
}
static int corner_bpm(void) {
  #if defined(PBL_HEALTH)
  return (int)health_service_peek_current_value(HealthMetricHeartRateBPM);
  #else
  return 0;
  #endif
}
static int corner_steps(void) {
  #if defined(PBL_HEALTH)
  return (int)health_service_sum_today(HealthMetricStepCount);
  #else
  return 0;
  #endif
}
static int corner_active(void) {
  #if defined(PBL_HEALTH)
  return (int)health_service_sum_today(HealthMetricActiveSeconds)/60;
  #else
  return 0;
  #endif
}
static void corner_rings(GContext *ctx,GRect b,bool show_distance) {
  int steps=corner_steps(),active=corner_active();
  GRect r=GRect((b.size.w-72)/2,(b.size.h-72)/2,72,72);
  graphics_context_set_antialiased(ctx,true);
  graphics_context_set_stroke_width(ctx,3);
  graphics_context_set_stroke_color(ctx,is_dark_theme()?GColorDarkGray:GColorLightGray);
  graphics_draw_arc(ctx,r,GOvalScaleModeFitCircle,0,TRIG_MAX_ANGLE);
  graphics_draw_arc(ctx,grect_inset(r,GEdgeInsets(8)),GOvalScaleModeFitCircle,0,TRIG_MAX_ANGLE);
  graphics_context_set_stroke_width(ctx,5);
  graphics_context_set_stroke_color(ctx,GColorKellyGreen);
  int active_pct=s_active_goal>0?(active*100)/s_active_goal:0;
  int step_pct=s_step_goal>0?(steps*100)/s_step_goal:0;
  if(active_pct>100)active_pct=100;
  if(step_pct>100)step_pct=100;
  graphics_draw_arc(ctx,r,GOvalScaleModeFitCircle,0,(active_pct*TRIG_MAX_ANGLE)/100);
  graphics_context_set_stroke_color(ctx,GColorPictonBlue);
  graphics_draw_arc(ctx,grect_inset(r,GEdgeInsets(7)),GOvalScaleModeFitCircle,
    0,(step_pct*TRIG_MAX_ANGLE)/100);
  graphics_context_set_text_color(ctx,is_dark_theme()?GColorWhite:GColorBlack);
  if(show_distance) {
    corner_text(ctx,s_dist_buf[0]?s_dist_buf:"--",b.size.h/2-14,28,
      fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),GTextAlignmentCenter,b.size.w);
  }
}
static void corner_heart_graph(GContext *ctx,GRect b) {
  GRect r=GRect(10,b.size.h-31,b.size.w-20,24);
  graphics_context_set_stroke_width(ctx,2);
  for(int i=41;i<59;i++){
    if(s_hr_history[i]<=0||s_hr_history[i+1]<=0)continue;
    int y1=r.origin.y+r.size.h-1-(s_hr_history[i]-55)/3;
    int y2=r.origin.y+r.size.h-1-(s_hr_history[i+1]-55)/3;
  if(y1<r.origin.y)y1=r.origin.y;
  if(y1>r.origin.y+r.size.h)y1=r.origin.y+r.size.h;
  if(y2<r.origin.y)y2=r.origin.y;
  if(y2>r.origin.y+r.size.h)y2=r.origin.y+r.size.h;
    graphics_context_set_stroke_color(ctx,GColorPictonBlue);
    graphics_draw_line(ctx,GPoint(r.origin.x+((i-41)*r.size.w)/19,y1),
      GPoint(r.origin.x+((i-40)*r.size.w)/19,y2));
  }
}
static void corner_draw_proc(Layer *layer,GContext *ctx) {
  int slot=-1;for(int i=0;i<4;i++)if(s_corner_layers[i]==layer){slot=i;break;}
  if(slot<0||!s_corner_mode)return;
  int metric=s_corner_metric[slot];
  if(s_corner_mode>=2&&s_corner_mode<=4){
    const int preset[3][4]={{1,2,14,16},{1,80,30,38},{1,2,52,80}};
    metric=preset[s_corner_mode-2][slot];
  }
  if(metric==0)return;
  GRect b=layer_get_bounds(layer);
  GColor fg=is_dark_theme()?GColorWhite:GColorBlack;
  graphics_context_set_text_color(ctx,fg);
  char value[50]="--",extra[50]="";
  int n=KC_MISSING;
  time_t now=time(NULL);
  struct tm *tm_now=localtime(&now);
  if(metric==1 && s_weather_bitmap){
    int size=b.size.h<=75?62:75;
    graphics_draw_bitmap_in_rect(ctx,s_weather_bitmap,
      GRect((b.size.w-size)/2,(b.size.h-size)/2,size,size));
    return;
  }
  if(metric==19) {
    graphics_context_set_text_color(ctx,fg);
    corner_text(ctx,"3-DAY FORECAST",0,18,fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GTextAlignmentCenter,b.size.w);
    int hi[3]={s_d1_hi,s_d2_hi,s_d3_hi};
    int lo[3]={s_d1_lo,s_d2_lo,s_d3_lo};
    for(int i=0;i<3;i++){
      char row[32];
      snprintf(row,sizeof(row),"+%d  %d°/%d°",i+1,hi[i],lo[i]);
      corner_text(ctx,row,18+i*19,20,fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        GTextAlignmentCenter,b.size.w);
    }
    return;
  }
  if(metric==2) {
    if(s_has_weather) {
      corner_gauge(ctx,b,(s_hi>s_lo)?100*(s_cur-s_lo)/(s_hi-s_lo):50,GColorPictonBlue);
      snprintf(value,sizeof(value),"%d°",s_cur);
      snprintf(extra,sizeof(extra),"%d° / %d°",s_lo,s_hi);
    }
    corner_numeric(ctx,b,"WEATHER",value,extra);return;
  }
  if(metric==30||metric==31){corner_rings(ctx,b,metric==30);return;}
  if(metric==81){corner_gauge(ctx,b,s_battery_level,GColorKellyGreen);}
  if(metric==33||metric==36||metric==73) {
    int pct=metric==33?(s_step_goal>0?100*corner_steps()/s_step_goal:0):
      metric==36?(s_active_goal>0?100*corner_active()/s_active_goal:0):
      (s_wx[18]!=KC_MISSING&&s_wx[19]!=KC_MISSING&&s_wx[19]>s_wx[18]?
       (int)(100*(now-s_wx[18])/(s_wx[19]-s_wx[18])):0);
  if(pct<0)pct=0;
  if(pct>100)pct=100;
    snprintf(value,sizeof(value),"%d%%",pct);
  }
  switch(metric) {
    case 3:if(s_has_weather)snprintf(value,sizeof(value),"%d°",s_cur);break;
    case 4:if(s_has_weather)snprintf(value,sizeof(value),"%d°/%d°",s_hi,s_lo);break;
    case 5: {
      const char *name="Unknown";
      if(s_icon_code[0]=='0'&&s_icon_code[1]=='1')name="Clear";
      else if(s_icon_code[0]=='0'&&s_icon_code[1]=='2')name="Partly cloud";
      else if(s_icon_code[0]=='0'&&s_icon_code[1]=='3')name="Cloudy";
      else if(s_icon_code[0]=='0'&&s_icon_code[1]=='4')name="Overcast";
      else if(s_icon_code[0]=='0'&&s_icon_code[1]=='9')name="Showers";
      else if(s_icon_code[0]=='1'&&s_icon_code[1]=='0')name="Rain";
      else if(s_icon_code[0]=='1'&&s_icon_code[1]=='1')name="Storm";
      else if(s_icon_code[0]=='1'&&s_icon_code[1]=='3')name="Snow";
      else if(s_icon_code[0]=='5'&&s_icon_code[1]=='0')name="Fog";
      snprintf(value,sizeof(value),"%s",name);
      break;
    }
    case 6:n=s_wx[0];break;
    case 7:n=s_wx[1];break;
    case 8:n=s_wx[2];break;
    case 9:n=s_wx[3];break;
    case 10:n=s_wx[4];break;
    case 11:n=s_wx[5];break;
    case 12:n=s_wx[6];break;
    case 13:n=s_wx[7];break;
    case 14:n=s_uv;break;
    case 15:n=s_wx[8];break;
    case 16: n=s_wx[9];
  if(n!=KC_MISSING){
      if(n<0)snprintf(value,sizeof(value),"None");
      else if(n==0)snprintf(value,sizeof(value),"Now");
      else snprintf(value,sizeof(value),"~%dh",n);}break;
    case 17:n=s_wx[20];break;
    case 18:n=s_wx[21];break;
    case 19: {
      // Compact fallback; full three-day values are drawn below as rows.
      if(s_d1_hi||s_d1_lo)snprintf(value,sizeof(value),"%d°/%d°",s_d1_hi,s_d1_lo);
      break;
    }
    case 20:snprintf(value,sizeof(value),"%s",s_wx_alert[0]?s_wx_alert:"--");break;
    case 21:n=s_wx[10];break;
    case 22:n=s_wx[11];break;
    case 23:n=s_wx[12];break;
    case 24:n=s_wx[13];break;
    case 25:n=s_wx[14];break;
    case 26:n=s_wx[15];break;
    case 27:n=s_wx[16];break;
    case 28:n=s_wx[17];break;
    case 32:snprintf(value,sizeof(value),"%d",corner_steps());break;
    case 34:snprintf(value,sizeof(value),"%s %s",s_dist_buf,s_use_metric?"km":"mi");break;
    case 35:snprintf(value,sizeof(value),"%d min",corner_active());break;
    case 37:case 38: {
      int bpm=corner_bpm();
      if(bpm>0) snprintf(value,sizeof(value),"%d",bpm);
      break;
    }
    case 39:case 40:case 41: {
      #if defined(PBL_HEALTH)
      int sleep=(int)health_service_sum_today(HealthMetricSleepSeconds);
      int restful=(int)health_service_sum_today(HealthMetricSleepRestfulSeconds);
  if(metric==39)snprintf(value,sizeof(value),"%dh %dm",sleep/3600,(sleep%3600)/60);
      else if(metric==40)snprintf(value,sizeof(value),"%dh %dm",restful/3600,(restful%3600)/60);
      else if(sleep>0)snprintf(value,sizeof(value),"%d%%",100*restful/sleep);
      #endif
      break;
    }
    case 42:{
      #if defined(PBL_HEALTH)
      int calories=(int)health_service_sum_today(HealthMetricActiveKCalories);
  if(calories>=0)snprintf(value,sizeof(value),"%d",calories);
      #endif
      break;
    }
    case 50:case 52:snprintf(value,sizeof(value),"%s",s_calendar_title[0]?s_calendar_title:"--");break;
    case 51: if(s_calendar_start>0) {int sec=(int)((int64_t)s_calendar_start-(int64_t)now);
  if(sec>=3600)snprintf(value,sizeof(value),"%dh %dm",sec/3600,(sec%3600)/60);
      else if(sec>0)snprintf(value,sizeof(value),"%d min",(sec+59)/60);
      else snprintf(value,sizeof(value),"Started");}break;
    case 60:if(tm_now)strftime(value,sizeof(value),"%b %d",tm_now);break;
    case 61:if(tm_now)strftime(value,sizeof(value),"%V",tm_now);break;
    case 62:if(tm_now)snprintf(value,sizeof(value),"%d",tm_now->tm_yday+1);break;
    case 63:if(tm_now)snprintf(value,sizeof(value),"%d%%",
      (100*tm_now->tm_yday)/(tm_now->tm_year%4==0?366:365));break;
    case 64:if(tm_now)snprintf(value,sizeof(value),"%02d",tm_now->tm_sec);break;
    case 70:case 71:{
      time_t t=(time_t)s_wx[metric==70?18:19];
  if(t>0){struct tm *s=localtime(&t);
  if(s)strftime(value,sizeof(value),"%I:%M%p",s);}
      break;
    }
    case 72:if(s_wx[19]>0){int min=(int)((s_wx[19]-now)/60);
  if(min>=0)snprintf(value,sizeof(value),"%dh %dm",min/60,min%60);
      else snprintf(value,sizeof(value),"Night");}break;
    case 74:case 75: {
      // Approximate lunar age anchored to 2000-01-06 18:14 UTC new moon.
      const int64_t cycle=2551443;
      int64_t age=((int64_t)now-947182440LL)%cycle;
  if(age<0)age+=cycle;
      int phase=(int)((age*8+cycle/2)/cycle)%8;
      int32_t angle=(int32_t)((age*TRIG_MAX_ANGLE)/cycle);
      int illumination=(int)((50LL*(TRIG_MAX_RATIO-cos_lookup(angle)))/TRIG_MAX_RATIO);
  if(metric==75)snprintf(value,sizeof(value),"~%d%%",illumination);
      else {
        const char *names[]={"New","Wax cres","First q","Wax gibb",
          "Full","Wan gibb","Last q","Wan cres"};
        snprintf(value,sizeof(value),"%s",names[phase]);
      }
      break;
    }
    case 80:case 81:snprintf(value,sizeof(value),"%d%%",s_battery_level);break;
    case 82:if(s_battery_rate_x100>0)snprintf(value,sizeof(value),"~%d.%dd",
      (s_battery_level*100/s_battery_rate_x100),
      ((s_battery_level*1000/s_battery_rate_x100)%10));break;
    case 83:snprintf(value,sizeof(value),"%s",s_battery_charging?"Charging":"Unplugged");break;
    case 84:snprintf(value,sizeof(value),"%s",s_connected?"Connected":"Offline");break;
    case 85:snprintf(value,sizeof(value),"%s",quiet_time_is_active()?"On":"Off");break;
    case 90:case 91:case 92:case 93:case 94:case 95:
      corner_numeric(ctx,b,s_corner_plugin_title[slot],
        s_corner_plugin_value[slot][0]?s_corner_plugin_value[slot]:"--",NULL);return;
    default:break;
  }
  if(n!=KC_MISSING && metric!=16) {
    const char *unit="";
  if(metric==6||metric==10||metric==18||metric==28)unit="°";
    else if(metric==7||metric==12||metric==15||metric==17)unit="%";
    else if(metric==8||metric==9)unit=" mph";
    else if(metric==13)unit=" km";
    else if(metric==25||metric==27)unit=" m";
    else if(metric==26)unit=" s";
    snprintf(value,sizeof(value),"%d%s",n,unit);
  }
  if(metric==38){
    graphics_context_set_text_color(ctx,fg);
    corner_text(ctx,"HEART RATE",0,18,fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GTextAlignmentCenter,b.size.w);
    corner_text(ctx,value,16,30,fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
      GTextAlignmentCenter,b.size.w);
    corner_heart_graph(ctx,b);
    return;
  }
  corner_numeric(ctx,b,corner_label(metric),value,NULL);
}
static void corner_apply_visibility(void) {
  if(!s_weather_icon_layer || !s_health_container || !s_corner_layers[0])return;
  bool custom=s_corner_mode!=0;
  bool legacy_bottom=!custom||s_view_is_swapped||s_calendar_takeover_active;
  bool show_custom=custom&&!legacy_bottom;
  // The two top corners, date and clock, and bottom corners never overlap.
  // During a temporary full-width view, restore the entire legacy arrangement.
  layer_set_frame(text_layer_get_layer(s_date_layer),show_custom?
    GRect(0,74,200,26):GRect(0,52,200,30));
  layer_set_frame(text_layer_get_layer(s_time_layer),show_custom?
    GRect(0,96,200,54):GRect(0,76,200,60));
  layer_set_hidden(bitmap_layer_get_layer(s_weather_icon_layer),show_custom);
  layer_set_hidden(s_weather_arc_layer,show_custom);
  if(show_custom){
    layer_set_hidden(s_health_container,true);
    layer_set_hidden(s_forecast_container,true);
    layer_set_hidden(s_calendar_container,true);
  } else {
    int active=s_calendar_takeover_active?2:
      (s_view_is_swapped?(s_default_view==0?1:0):s_default_view);
    layer_set_hidden(s_health_container,active!=0);
    layer_set_hidden(s_forecast_container,active!=1);
    layer_set_hidden(s_calendar_container,active!=2);
  }
  for(int i=0;i<4;i++)if(s_corner_layers[i])
    layer_set_hidden(s_corner_layers[i],!show_custom);
  if(s_battery_layer)layer_set_hidden(s_battery_layer,s_battery_style==0);
}

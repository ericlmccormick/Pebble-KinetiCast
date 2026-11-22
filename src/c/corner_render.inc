// Four-corner complication renderer; included after legacy layer draw helpers.
// The classic layout is untouched unless CORNER_MODE=1.
#define KC_MISSING (-32768)
static void corner_redraw(void) {
  for(int i=0;i<4;i++) if(s_corner_layers[i]) layer_mark_dirty(s_corner_layers[i]);
  if(s_center_layer)layer_mark_dirty(s_center_layer);
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
    case 66:return "TIME";
    case 70:return "SUNRISE";case 71:return "SUNSET";case 72:return "DAYLIGHT";
    case 73:return "DAYLIGHT";case 74:return "MOON";case 75:return "MOON LIT";
    case 76:return "MOON IMAGE";
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
  bool show_aux=aux&&aux[0]&&b.size.h>=70;
  int mainY=show_aux?18:23;
  GFont font=fonts_get_system_font(strlen(value)>9?FONT_KEY_GOTHIC_18_BOLD:
    strlen(value)>6?FONT_KEY_GOTHIC_24_BOLD:FONT_KEY_GOTHIC_28_BOLD);
  corner_text(ctx,value,mainY,32,font,GTextAlignmentCenter,b.size.w);
  if(show_aux)corner_text(ctx,aux,b.size.h-20,18,fonts_get_system_font(FONT_KEY_GOTHIC_14),
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
  // Match the original KinetiCast goals canvas precisely in a bottom corner.
  // Legacy was a 72px canvas at (15,16) with a 3px inner drawing inset.
  int diameter=b.size.h>=89?72:b.size.h-4;
  if(diameter>b.size.w-20)diameter=b.size.w-20;
  if(diameter<30)diameter=30;
  int x=b.size.h>=89?15:(b.size.w-diameter)/2;
  int y=b.size.h>=89?16:(b.size.h-diameter)/2;
  GRect canvas=GRect(x,y,diameter,diameter);
  GRect draw_bounds=grect_inset(canvas,GEdgeInsets(3));
  graphics_context_set_antialiased(ctx,true);
  graphics_context_set_stroke_width(ctx,3);
  graphics_context_set_stroke_color(ctx,is_dark_theme()?GColorDarkGray:GColorLightGray);
  graphics_draw_arc(ctx,grect_inset(draw_bounds,GEdgeInsets(1)),
    GOvalScaleModeFitCircle,0,TRIG_MAX_ANGLE);
  graphics_draw_arc(ctx,grect_inset(draw_bounds,GEdgeInsets(8)),
    GOvalScaleModeFitCircle,0,TRIG_MAX_ANGLE);
  graphics_context_set_stroke_width(ctx,5);
  graphics_context_set_stroke_color(ctx,GColorKellyGreen);
  int active=corner_active();
  int steps=corner_steps();
  graphics_draw_arc(ctx,draw_bounds,GOvalScaleModeFitCircle,0,
    s_active_goal>0?(active*TRIG_MAX_ANGLE)/s_active_goal:0);
  graphics_context_set_stroke_color(ctx,GColorPictonBlue);
  graphics_draw_arc(ctx,grect_inset(draw_bounds,GEdgeInsets(7)),
    GOvalScaleModeFitCircle,0,
    s_step_goal>0?(steps*TRIG_MAX_ANGLE)/s_step_goal:0);
  if(show_distance){
    graphics_context_set_text_color(ctx,is_dark_theme()?GColorWhite:GColorBlack);
    corner_text(ctx,s_dist_buf[0]?s_dist_buf:"--",
      b.size.h>=89?34:y+diameter/2-17,35,
      fonts_get_system_font(diameter>=70?FONT_KEY_GOTHIC_28_BOLD:FONT_KEY_GOTHIC_18_BOLD),
      GTextAlignmentCenter,b.size.w);
  }
}
// Lunar age runs from new moon (0) through waxing (1..499), full (500)
// and waning (501..999). Uses the existing UTC new-moon reference and mean
// synodic month; no weather provider, coordinates or Bluetooth poll required.
#define MOON_CYCLE_SECONDS 2551443LL
#define MOON_REFERENCE_UTC 947182440LL
static int moon_cycle_thousandths(time_t utc) {
  int64_t seconds=((int64_t)utc-MOON_REFERENCE_UTC)%MOON_CYCLE_SECONDS;
  if(seconds<0)seconds+=MOON_CYCLE_SECONDS;
  return (int)((seconds*1000LL)/MOON_CYCLE_SECONDS);
}
static int moon_cosine(int phase) {
  // Pebble trigonometric lookups are fixed point and avoid libm/float.
  return cos_lookup((int32_t)(((int64_t)phase*TRIG_MAX_ANGLE)/1000LL));
}
static int moon_illumination(int phase) {
  int32_t cosine=moon_cosine(phase);
  return (int)((50LL*(TRIG_MAX_RATIO-cosine)+TRIG_MAX_RATIO/2)/TRIG_MAX_RATIO);
}
static void corner_moon_image(GContext *ctx,GRect b,time_t now) {
  int phase=moon_cycle_thousandths(now);
  int illumination=moon_illumination(phase);
  // Upper corners are only 60px tall, so reserve 17px for the label and
  // another 17px for the percentage without clipping either.
  int radius=b.size.h>=78?22:13;
  GPoint center=GPoint(b.size.w/2,b.size.h>=78?43:29);
  GColor shaded=is_dark_theme()?GColorDarkGray:GColorOxfordBlue;
  GColor lit=is_dark_theme()?GColorWhite:GColorLightGray;
  GColor rim=is_dark_theme()?GColorLightGray:GColorDarkGray;
  graphics_context_set_antialiased(ctx,true);
  graphics_context_set_fill_color(ctx,shaded);
  graphics_fill_circle(ctx,center,radius);
  graphics_context_set_stroke_width(ctx,1);
  graphics_context_set_stroke_color(ctx,lit);
  int32_t cosine=moon_cosine(phase);
  // For each horizontal chord of the lunar disk, the terminator is at
  // +/- cos(phase angle)*halfwidth. Waxing lights the RIGHT, waning LEFT.
  // This creates the proper curved terminator for crescents and gibbous moons.
  for(int dy=-radius+1;dy<radius;dy++) {
    int half=0;
    while((half+1)*(half+1)+dy*dy<radius*radius)half++;
    if(half<=0)continue;
    int terminate=(int)((cosine*(int32_t)half)/TRIG_MAX_RATIO);
    int left,right;
    if(phase<500) {
      left=center.x+terminate;
      right=center.x+half;
    } else {
      left=center.x-half;
      right=center.x-terminate;
    }
    if(right>left)graphics_draw_line(ctx,GPoint(left,center.y+dy),
      GPoint(right,center.y+dy));
  }
  graphics_context_set_stroke_color(ctx,rim);
  graphics_draw_circle(ctx,center,radius);
  graphics_context_set_text_color(ctx,is_dark_theme()?GColorWhite:GColorBlack);
  corner_text(ctx,"MOON",0,17,fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
    GTextAlignmentCenter,b.size.w);
  char text[12];
  snprintf(text,sizeof(text),"%d%%",illumination);
  corner_text(ctx,text,center.y+radius+1,18,
    fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
    GTextAlignmentCenter,b.size.w);
}
static void corner_heart_graph(GContext *ctx,GRect b) {
  // Honor the 20/30/60 minute health setting, including when this complication
  // is moved to a corner other than the original bottom-right position.
  GRect r=GRect(10,b.size.h-31,b.size.w-20,24);
  int visible=s_hr_window;
  if(visible!=20&&visible!=30&&visible!=60)visible=20;
  int first=HR_HISTORY_SIZE-visible;
  graphics_context_set_stroke_width(ctx,2);
  for(int i=first;i<HR_HISTORY_SIZE-1;i++){
    if(s_hr_history[i]<=0||s_hr_history[i+1]<=0)continue;
    int y1=r.origin.y+r.size.h-1-(s_hr_history[i]-55)/3;
    int y2=r.origin.y+r.size.h-1-(s_hr_history[i+1]-55)/3;
    if(y1<r.origin.y)y1=r.origin.y;
    if(y1>r.origin.y+r.size.h)y1=r.origin.y+r.size.h;
    if(y2<r.origin.y)y2=r.origin.y;
    if(y2>r.origin.y+r.size.h)y2=r.origin.y+r.size.h;
    int avg=(s_hr_history[i]+s_hr_history[i+1])/2;
    GColor col=avg<70?GColorPictonBlue:avg>120?GColorRed:
      avg>95?GColorChromeYellow:GColorKellyGreen;
    graphics_context_set_stroke_color(ctx,col);
    int x1=r.origin.x+((i-first)*(r.size.w-1))/(visible-1);
    int x2=r.origin.x+((i+1-first)*(r.size.w-1))/(visible-1);
    graphics_draw_line(ctx,GPoint(x1,y1),GPoint(x2,y2));
  }
}
static void corner_draw_proc(Layer *layer,GContext *ctx) {
  int slot=-1;for(int i=0;i<4;i++)if(s_corner_layers[i]==layer){slot=i;break;}
  if(slot<0)return;
  int metric=s_corner_metric[slot];
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
    corner_text(ctx,"3-DAY FORECAST",0,16,fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GTextAlignmentCenter,b.size.w);
    int hi[3]={s_d1_hi,s_d2_hi,s_d3_hi};
    int lo[3]={s_d1_lo,s_d2_lo,s_d3_lo};
    int row_height=(b.size.h-16)/3;
    for(int i=0;i<3;i++){
      char row[32];
      snprintf(row,sizeof(row),"+%d %d°/%d°",i+1,hi[i],lo[i]);
      corner_text(ctx,row,16+i*row_height,row_height+2,
        fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
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
  if(metric==76){corner_moon_image(ctx,b,now);return;}
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
    case 16: {
      n=s_wx[9];
      if(n!=KC_MISSING) {
        if(n<0)snprintf(value,sizeof(value),"None");
        else {
          int64_t remaining=(int64_t)n-(int64_t)now;
          if(remaining<=0 && remaining>=-1800)
            snprintf(value,sizeof(value),"Now");
          else if(remaining<0)
            snprintf(value,sizeof(value),"Passed");
          else if(remaining<=3600)
            snprintf(value,sizeof(value),"~%ld min",(long)((remaining+59)/60));
          else
            snprintf(value,sizeof(value),"~%ldh %ldm",
              (long)(remaining/3600),(long)((remaining%3600)/60));
        }
      }
      n=KC_MISSING; // already rendered from the absolute timestamp
      break;
    }
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
    case 66: {
      if(tm_now){
        int h=tm_now->tm_hour;
        if(!clock_is_24h_style()){h%=12;if(h==0)h=12;}
        snprintf(value,sizeof(value),clock_is_24h_style()?"%02d:%02d":"%d:%02d",
          h,tm_now->tm_min);
      }
      break;
    }
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
      int phase=moon_cycle_thousandths(now);
      int illumination=moon_illumination(phase);
      if(metric==75)snprintf(value,sizeof(value),"~%d%%",illumination);
      else {
        const char *names[]={"New","Wax cres","First q","Wax gibb",
          "Full","Wan gibb","Last q","Wan cres"};
        int eighth=((phase*8+500)/1000)%8;
        snprintf(value,sizeof(value),"%s",names[eighth]);
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
// This atlas is a faithful 24x24 resize of the original 64px resources.
// Pebble's draw_bitmap_in_rect() crops, rather than scales, source bitmaps.
static GBitmap *s_compact_atlas=NULL;
static GBitmap *s_compact_icons[9]={NULL};
static void compact_icons_init(void) {
  if(s_compact_atlas)return;
  s_compact_atlas=gbitmap_create_with_resource(RESOURCE_ID_COMPACT_WEATHER_ATLAS);
  if(!s_compact_atlas)return;
  for(int i=0;i<9;i++)
    s_compact_icons[i]=gbitmap_create_as_sub_bitmap(
      s_compact_atlas,GRect((i%3)*24,(i/3)*24,24,24));
}
static void compact_icons_deinit(void) {
  for(int i=0;i<9;i++){
    if(s_compact_icons[i]){gbitmap_destroy(s_compact_icons[i]);s_compact_icons[i]=NULL;}
  }
  if(s_compact_atlas){gbitmap_destroy(s_compact_atlas);s_compact_atlas=NULL;}
}
static int compact_icon_index(const char *code) {
  if(!code || !code[0] || !code[1])return 8;
  if(code[0]=='0' && code[1]=='1')return code[2]=='n'?1:0;
  if(code[0]=='0' && code[1]=='2')return code[2]=='n'?3:2;
  if(code[0]=='0' && (code[1]=='3'||code[1]=='4'))return 4;
  if((code[0]=='0'&&code[1]=='9')||(code[0]=='1'&&code[1]=='0'))return 5;
  if(code[0]=='1'&&code[1]=='1')return 6;
  if(code[0]=='1'&&code[1]=='3')return 7;
  return 8;
}
static void draw_compact_forecast_icon(GContext *ctx,const char *code,int x,int y) {
  int i=compact_icon_index(code);
  if(s_compact_icons[i])
    graphics_draw_bitmap_in_rect(ctx,s_compact_icons[i],GRect(x,y,24,24));
}
static void slide_panel_background(GContext *ctx,GRect b){
  graphics_context_set_fill_color(ctx,is_dark_theme()?GColorBlack:GColorWhite);
  graphics_fill_rect(ctx,b,0,GCornerNone);
  graphics_context_set_stroke_color(ctx,is_dark_theme()?GColorLightGray:GColorDarkGray);
  graphics_context_set_stroke_width(ctx,1);
  graphics_draw_line(ctx,GPoint(0,0),GPoint(b.size.w-1,0));
}
static void forecast_slide_draw_proc(Layer *layer,GContext *ctx){
  // The original 64px forecast bitmap children render on top of this panel.
  slide_panel_background(ctx,layer_get_bounds(layer));
}
static void calendar_slide_draw_proc(Layer *layer,GContext *ctx){
  slide_panel_background(ctx,layer_get_bounds(layer));
}
static int active_center_view(void) {
  // A flick and the persistent event use a separate bottom overlay.
  // Never change the center clock, top-left icon, or top-right weather gauge.
  return s_center_view;
}
static void center_draw_proc(Layer *layer,GContext *ctx) {
  int mode=active_center_view();
  if(mode<2)return;
  GRect b=layer_get_bounds(layer);
  GColor fg=is_dark_theme()?GColorWhite:GColorBlack;
  graphics_context_set_text_color(ctx,fg);
  if(mode==2) {
    corner_text(ctx,"NEXT EVENT",0,18,
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),GTextAlignmentCenter,b.size.w);
    corner_text(ctx,s_calendar_title[0]?s_calendar_title:"No upcoming events",
      15,40,fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
      GTextAlignmentCenter,b.size.w);
    corner_text(ctx,s_calendar_countdown[0]?s_calendar_countdown:"",53,19,
      fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),GTextAlignmentCenter,b.size.w);
    return;
  }
  static const char * const days[]={"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};
  time_t now=time(NULL);
  struct tm *local=localtime(&now);
  int wd=local?local->tm_wday:0;
  const char *icons[3]={s_d1_ic,s_d2_ic,s_d3_ic};
  int hi[3]={s_d1_hi,s_d2_hi,s_d3_hi};
  int lo[3]={s_d1_lo,s_d2_lo,s_d3_lo};
  for(int i=0;i<3;i++){
    int x=1+i*66;
    graphics_draw_text(ctx,days[(wd+i+1)%7],
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GRect(x,0,66,18),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
    draw_compact_forecast_icon(ctx,icons[i],x+21,18);
    char temp[24];
    if(s_has_weather||s_last_weather_success>0||s_d1_hi||s_d1_lo){
      snprintf(temp,sizeof(temp),"%d°/%d°",hi[i],lo[i]);
    } else snprintf(temp,sizeof(temp),"--");
    graphics_draw_text(ctx,temp,fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
      GRect(x,52,66,20),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
  }
}
static void corner_apply_visibility(void) {
  if(!s_weather_icon_layer || !s_health_container || !s_corner_layers[0])return;
  int center=active_center_view();
  bool original_center=center==0;
  bool show_time=center==0||center==1;
  bool original_left=s_corner_metric[0]==1;
  bool original_right=s_corner_metric[1]==2 && (center==0||center==1);
  bool original_rings=s_corner_metric[2]==30||s_corner_metric[2]==31;
  bool original_hr=s_corner_metric[3]==38;

  // Do not shift the date or clock in the default layout.
  layer_set_frame(text_layer_get_layer(s_date_layer),GRect(0,52,200,30));
  layer_set_frame(text_layer_get_layer(s_time_layer),
    center==1?GRect(0,74,200,60):GRect(0,76,200,60));
  layer_set_hidden(text_layer_get_layer(s_date_layer),!original_center);
  layer_set_hidden(text_layer_get_layer(s_time_layer),!show_time);
  if(s_center_layer)layer_set_hidden(s_center_layer,center<2);

  layer_set_hidden(bitmap_layer_get_layer(s_weather_icon_layer),!original_left);
  layer_set_hidden(s_weather_arc_layer,!original_right);
  int bottom_y=s_battery_style==3?211:s_battery_style==2?218:
    s_battery_style==0?228:222;
  for(int i=0;i<4;i++) {
    int x=(i%2)*100;
    if(i<2)layer_set_frame(s_corner_layers[i],GRect(x,0,100,60));
    else layer_set_frame(s_corner_layers[i],GRect(x,126,100,bottom_y-126));
    bool legacy=(i==0&&original_left)||(i==1&&original_right)||
      (i==2&&original_rings)||(i==3&&original_hr);
    layer_set_hidden(s_corner_layers[i],legacy);
  }

  // Reuse the ORIGINAL health rings, distance label, heart icon, BPM and
  // HR graph with their original pixel locations instead of approximations.
  layer_set_frame(s_health_container,GRect(0,126,200,96));
  layer_set_hidden(s_health_container,!original_rings&&!original_hr);
  int rise=bottom_y<214?214-bottom_y:0;
  layer_set_frame(s_goals_canvas,GRect(15,16-rise,72,72));
  layer_set_frame(text_layer_get_layer(s_dist_layer),GRect(12,34-rise,76,35));
  layer_set_hidden(s_goals_canvas,!original_rings);
  layer_set_hidden(text_layer_get_layer(s_dist_layer),s_corner_metric[2]!=30);
  layer_set_hidden(bitmap_layer_get_layer(s_heart_layer),!original_hr);
  layer_set_hidden(text_layer_get_layer(s_hr_layer),!original_hr);
  layer_set_hidden(s_hr_graph_layer,!original_hr);

  // Slide overlays stay mounted, resting fully offscreen at y=228.
  // Their visibility must NOT change during a slide-down animation.
  layer_set_hidden(s_forecast_container,false);
  layer_set_hidden(s_calendar_container,false);
  if(s_battery_layer)layer_set_hidden(s_battery_layer,s_battery_style==0);
}

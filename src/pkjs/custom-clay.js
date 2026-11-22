// Show only controls that apply to the actual center/corner selections.
// Every slot is configurable; there is no layout preset or dead bottom-panel setting.
module.exports = function() {
  var page=this;
  page.on(page.EVENTS.AFTER_BUILD,function() {
    function item(key){return page.getItemByMessageKey(key);}
    function hint(id){return page.getItemById(id);}
    function show(control,visible){
      if(!control)return;
      if(visible&&typeof control.show==='function')control.show();
      else if(!visible&&typeof control.hide==='function')control.hide();
    }
    function on(source,fn){if(source)source.on('change',fn);}
    function enabled(x){return x===true||x===1||x==='1'||x==='true';}
    function value(key,defaultValue) {
      var x=item(key);return x?x.get():defaultValue;
    }
    var groups=['weather','environment','health','calendar','clock',
      'astronomy','system','plugin','none'];
    var slots=['TL','TR','BL','BR'];
    var defaults={TL:1,TR:2,BL:30,BR:38};
    function metric(slot){
      var base='CORNER_'+slot+'_';
      var group=String(value(base+'GROUP',
        slot==='TL'||slot==='TR'?'weather':'health'));
      var result=Number(value(base+group.toUpperCase(),defaults[slot]));
      return isFinite(result)?result:defaults[slot];
    }
    function uses(check){return slots.some(function(slot){return check(metric(slot));});}
    function center(){return String(value('CENTER_VIEW','0'));}
    function shake(){return String(value('SHAKE_ACTION','0'));}
    function weatherNeeded(){
      return center()==='3'||shake()==='0'||uses(function(m){
        return (m>=1&&m<=28)||(m>=70&&m<=73);
      });
    }
    function healthNeeded(){return uses(function(m){return m>=30&&m<=42;});}
    function calendarNeeded(){
      return center()==='2'||shake()==='3'||
        uses(function(m){return m>=50&&m<=52;})||
        enabled(value('PERSISTENT_CALENDAR_ENABLE',false));
    }
    function update() {
      slots.forEach(function(slot){
        var base='CORNER_'+slot+'_';
        var group=String(value(base+'GROUP',
          slot==='TL'||slot==='TR'?'weather':'health'));
        var pluginChosen=Number(value(base+'PLUGIN',90))===95;
        show(hint('corner-title-'+slot),true);
        show(item(base+'GROUP'),true);
        groups.forEach(function(key){show(item(base+key.toUpperCase()),key===group);});
        show(item(base+'PLUGIN_SPEC'),group==='plugin'&&pluginChosen);
        show(item(base+'INDEX'),group==='plugin'&&pluginChosen);
      });

      var weather=weatherNeeded();
      var provider=String(value('WEATHER_PROVIDER','weatherplus'));
      var shared=provider==='weatherplus';
      var gps=enabled(value('USE_GPS',true));
      show(hint('weather-section-heading'),weather);
      show(hint('weather-auto-note'),weather);
      show(item('WEATHER_PROVIDER'),weather);
      show(hint('weather-plus-hint'),weather&&shared);
      show(hint('weather-plus-install'),weather&&shared);
      show(hint('legacy-weather-hint'),weather&&!shared);
      show(item('API_KEY'),weather&&provider==='openweathermap');
      show(item('USE_GPS'),weather&&!shared);
      show(item('MANUAL_LOCATION'),weather&&!shared&&!gps);
      show(item('TEMP_UNIT'),weather&&!shared);
      show(item('UPDATE_FREQ'),weather&&!shared);

      var health=healthNeeded();
      show(hint('health-section-heading'),health);
      show(item('DISTANCE_UNIT'),health&&uses(function(m){return m===30||m===34;}));
      show(item('HR_GRAPH_WINDOW'),health&&uses(function(m){return m===38;}));
      show(item('HEALTH_LIVE_UPDATES'),health);
      show(item('SHOW_SLEEP'),health);
      show(item('SLEEP_BRIEF_SECONDS'),health&&enabled(value('SHOW_SLEEP',true)));

      var calendar=calendarNeeded();
      show(hint('calendar-section-heading'),calendar);
      show(item('CALENDAR_FILTER'),calendar);
      show(hint('calendar-source-hint'),calendar);
      show(item('PERSISTENT_CALENDAR_ENABLE'),calendar);
      show(item('PERSISTENT_CALENDAR_MINUTES'),calendar&&
        enabled(value('PERSISTENT_CALENDAR_ENABLE',false)));

      var action=shake();
      var gesture=action!=='2';
      show(item('GESTURE_POWER_MODE'),gesture);
      show(item('SHAKE_SENSITIVITY'),gesture);
      show(item('SHAKE_LENGTH'),gesture);
      show(hint('gesture-tts-hint'),action==='1');
    }
    on(item('CENTER_VIEW'),update);
    on(item('SHAKE_ACTION'),update);
    on(item('WEATHER_PROVIDER'),update);
    on(item('USE_GPS'),update);
    on(item('SHOW_SLEEP'),update);
    on(item('PERSISTENT_CALENDAR_ENABLE'),update);
    slots.forEach(function(slot){
      on(item('CORNER_'+slot+'_GROUP'),update);
      groups.forEach(function(g){on(item('CORNER_'+slot+'_'+g.toUpperCase()),update);});
    });
    update();
  });
};

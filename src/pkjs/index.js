var Clay = require('pebble-clay');
var customClay = require('./custom-clay');

// ==============================================================================
// SECTION: CLAY CONFIGURATION (SETTINGS MENU)
// ==============================================================================
var clayConfig = [
  { "type": "heading", "defaultValue": "KinetiCast Configuration" }, 
  { 
    "type": "section", 
    "items": [
      { "type": "heading", "defaultValue": "Weather Integration" },
      { "type": "text", "id": "weather-plus-hint", "defaultValue": "Weather+ manages its own forecast provider, location, temperature units and refresh cache. Configure those in the Weather+ plugin settings. KinetiCast continues to control the display and walking distance units." },
      { "type": "text", "id": "weather-plus-install", "defaultValue": "Install Weather+ from the Pebble app store for shared weather. KinetiCast will use built-in weather as a backup if the plugin is unavailable." },
      { "type": "text", "id": "legacy-weather-hint", "defaultValue": "Your existing weather provider remains supported. Weather+ is recommended for shared weather, alerts and ongoing improvements." }, 
      { 
        "type": "select", 
        "messageKey": "WEATHER_PROVIDER", 
        "label": "Weather Data Provider", 
        "defaultValue": "weatherplus", 
        "options": [
          { "label": "Weather+ plugin (recommended)", "value": "weatherplus" },
          { "label": "Automatic (no API key, failover)", "value": "auto" },
          { "label": "Open-Meteo (Free Global Forecast)", "value": "openmeteo" }, 
          { "label": "Yr.no / Met.no (Free Global Forecast)", "value": "metno" },
          { "label": "National Weather Service (Free US Only)", "value": "nws" },
          { "label": "OpenWeather OneCall 3.0 (API key)", "value": "openweathermap" }
        ]
      },
      { "type": "input", "messageKey": "API_KEY", "label": "OpenWeather API Key" },
      { "type": "toggle", "messageKey": "USE_GPS", "label": "Use Phone GPS", "defaultValue": true },
      { 
        "type": "input", 
        "messageKey": "MANUAL_LOCATION", 
        "label": "Manual Location",
        "description": "Used only if GPS is disabled (e.g., Wheeling, IL)." 
      },
      {
        "type": "select", "messageKey": "TEMP_UNIT",
        "label": "Temperature", "defaultValue": "F",
        "options": [
          { "label": "Fahrenheit (°F)", "value": "F" },
          { "label": "Celsius (°C)", "value": "C" },
          { "label": "Kelvin (K)", "value": "K" },
          { "label": "Rankine (°R)", "value": "R" }
        ]
      },
      {
        "type": "select", "messageKey": "DISTANCE_UNIT",
        "label": "Walking Distance", "defaultValue": "mi",
        "options": [
          { "label": "Miles", "value": "mi" },
          { "label": "Kilometers", "value": "km" }
        ]
      },
      { "type": "slider", "messageKey": "UPDATE_FREQ", "label": "Polling Interval (Minutes)", "defaultValue": 30, "min": 10, "max": 120, "step": 5 }
    ]
  },
  { 
    "type": "section", 
    "items": [
      { "type": "heading", "defaultValue": "Display Customization" },
      { 
        "type": "select", 
        "messageKey": "DEFAULT_VIEW", 
        "label": "Default Lower Panel View", 
        "defaultValue": "0", 
        "options": [
          { "label": "Health Panel (Activity & Vitals)", "value": "0" }, 
          { "label": "Weather Panel (3-Day Forecast)", "value": "1" },
          { "label": "Next Calendar Event (Countdown)", "value": "2" }
        ]
      },
      {
        "type": "select", "messageKey": "SHAKE_ACTION",
        "label": "Shake Watch Action", "defaultValue": "0",
        "options": [
          { "label": "Show Other Panel (7 seconds)", "value": "0" },
          { "label": "Speak Time (Universal TTS)", "value": "1" },
          { "label": "Do Nothing", "value": "2" },
          { "label": "Show Next Calendar Event (7 seconds)", "value": "3" }
        ]
      },
      {
        "type": "select", "messageKey": "SHAKE_SENSITIVITY",
        "label": "Shake Sensitivity", "defaultValue": "0",
        "options": [
          { "label": "Low (requires stronger motion)", "value": "0" },
          { "label": "Medium", "value": "1" },
          { "label": "High (easier to trigger)", "value": "2" }
        ]
      },
      {
        "type": "select", "messageKey": "SHAKE_LENGTH",
        "label": "Shake Length", "defaultValue": "2",
        "options": [
          { "label": "Short (quick shake)", "value": "0" },
          { "label": "Medium (about half a second)", "value": "1" },
          { "label": "Long (sustained shake)", "value": "2" }
        ]
      },
      { "type": "text", "defaultValue": "For Speak Time, start with Low sensitivity and Long duration to reduce accidental announcements. Existing saved gesture preferences are preserved. TTS requires the Universal TTS plugin and a watch speaker." },
      { "type": "select", "messageKey": "CALENDAR_FILTER", "label": "Next Event Calendar",
        "defaultValue": "__all__",
        "options": [ { "label": "All Calendars", "value": "__all__" } ] },
      { "type": "text", "defaultValue": "Calendar choices are discovered from events returned by the Pebble Calendar plugin (up to ten events in seven days); calendars with no returned events may not appear. Enable calendar access in the Pebble phone app." },
      { 
        "type": "select", 
        "messageKey": "THEME_MODE", 
        "label": "UI Visual Theme", 
        "defaultValue": "0", 
        "options": [
          { "label": "Light Mode", "value": "0" }, 
          { "label": "Dark Mode", "value": "1" },
          { "label": "Auto (Solar Sync)", "value": "2" }
        ]
      },
      { "type": "toggle", "messageKey": "SHOW_SLEEP", "label": "Display Morning Sleep Briefing", "defaultValue": true },
      { "type": "select", "messageKey": "SLEEP_BRIEF_SECONDS",
        "label": "Sleep Briefing Auto-Hide", "defaultValue": "0",
        "options": [
          { "label": "Stay until tapped", "value": "0" },
          { "label": "15 seconds", "value": "15" },
          { "label": "30 seconds", "value": "30" },
          { "label": "60 seconds", "value": "60" }
        ]
      },
      {
        "type": "select", "messageKey": "HR_GRAPH_WINDOW",
        "label": "Heart Rate Graph History", "defaultValue": "20",
        "options": [
          { "label": "20 minutes", "value": "20" },
          { "label": "30 minutes", "value": "30" },
          { "label": "60 minutes", "value": "60" }
        ]
      }
    ]
  },
  { "type": "submit", "defaultValue": "Save Settings" } 
];

var clay = new Clay(clayConfig, customClay, { autoHandleEvents: false });
var calendarSubscription = null;
var calendarEvents = [];
var calendarState = 'pending';
var calendarLastSent = '';
var calendarTimer = null;
var CALENDAR_NAMES_KEY = 'kineticast.calendar.names.v1';
function calendarProperty(p, fields) {
  for (var i=0;i<fields.length;i++) {
    var v=p && p[fields[i]];
    if (v==null) continue;
    if (typeof v==='string'||typeof v==='number') return v;
    if (v.timestamp && v.timestamp.value!=null) return v.timestamp.value;
    if (v.longText && v.longText.text!=null) return v.longText.text;
    if (v.shortText && v.shortText.text!=null) return v.shortText.text;
    if (v.numericValue && v.numericValue.value!=null) return v.numericValue.value;
    if (v.boolean && v.boolean.value!=null) return v.boolean.value;
  }
  return null;
}
function calendarTimestamp(raw) {
  if(raw==null||raw==='')return NaN;
  var num=Number(raw);
  if(isFinite(num))return num<100000000000?num*1000:num;
  return Date.parse(String(raw));
}
function calendarNames() {
  try { var arr=JSON.parse(localStorage.getItem(CALENDAR_NAMES_KEY)||'[]');
    return Array.isArray(arr)?arr.filter(function(n){return typeof n==='string' && !!n;}).slice(0,100):[];
  } catch(e) { return []; }
}
function updateKnownCalendars(events) {
  var names=calendarNames();
  events.forEach(function(ev){if(ev.calendarName&&names.indexOf(ev.calendarName)<0)names.push(ev.calendarName);});
  names.sort(function(a,b){return a.localeCompare(b);});
  try{localStorage.setItem(CALENDAR_NAMES_KEY,JSON.stringify(names.slice(0,100)));}catch(e){}
}
function parseCalendarEvents(envelope) {
  if(!envelope||!Array.isArray(envelope.instances))return null;
  var result=[];
  envelope.instances.forEach(function(instance) {
    var props=instance && instance.properties || {};
    var title=calendarProperty(props,['title','summary','name']);
    var when=calendarTimestamp(calendarProperty(props,['starts_at','start','start_time','startTime','start_date','startDate','time','timestamp']));
    var end=calendarTimestamp(calendarProperty(props,['ends_at','end','end_time','endTime','end_date','endDate']));
    var calendar=calendarProperty(props,['calendar','calendar_name']);
    var allday=calendarProperty(props,['all_day','allDay','isAllDay']);
    if(!title||!isFinite(when)||when<=0)return;
    // Treat UTC-midnight date markers for all-day entries as local midnight.
    if(allday) {
      var d=new Date(when);
      if(d.getUTCHours()===0&&d.getUTCMinutes()===0&&d.getUTCSeconds()===0)
        when=new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()).getTime();
    }
    result.push({title:String(title),start:when,end:isFinite(end)?end:when,
      calendarName:String(calendar||'')});
  });
  if(envelope.instances.length&&!result.length)return null;
  result.sort(function(a,b){return a.start-b.start;});
  return result;
}
function nextCalendarEvent() {
  var now=Date.now();
  var filter=String(readSettings().CALENDAR_FILTER||'__all__');
  for(var i=0;i<calendarEvents.length;i++){
    var event=calendarEvents[i];
    if(event.start>now && (filter==='__all__'||event.calendarName===filter))return event;
  }
  return null;
}
function sendNextCalendarEvent(force) {
  var ev=nextCalendarEvent();
  var msg=ev?{NEXT_EVENT_TITLE:ev.title.slice(0,65),
    NEXT_EVENT_START:Math.floor(ev.start/1000),NEXT_EVENT_STATUS:1}:
    {NEXT_EVENT_TITLE:'',NEXT_EVENT_START:0,NEXT_EVENT_STATUS:calendarState==='failed'?2:0};
  var sig=JSON.stringify(msg);
  if(!force && sig===calendarLastSent)return;
  Pebble.sendAppMessage(msg,function(){calendarLastSent=sig;},function(err){
    console.log('KinetiCast: calendar update delivery failed '+JSON.stringify(err));
  });
}
function startCalendarSource() {
  if(calendarSubscription)return;
  if(typeof Pebble.subscribeToSource!=='function') {
    calendarState='failed';sendNextCalendarEvent(true);return;
  }
  try{
    calendarSubscription=Pebble.subscribeToSource({
      category:'calendar',item:'event',
      onData:function(envelope){
        var parsed=parseCalendarEvents(envelope);
        if(parsed===null){console.log('KinetiCast: invalid calendar response ignored');return;}
        calendarEvents=parsed;
        updateKnownCalendars(parsed);
        calendarState='ready';
        sendNextCalendarEvent(true);
      },
      onError:function(err){
        console.log('KinetiCast: calendar plugin unavailable '+JSON.stringify(err));
        calendarState='failed';
        if(!calendarEvents.length)sendNextCalendarEvent(true);
      }
    });
  }catch(err){calendarState='failed';console.log('KinetiCast calendar error: '+err);
    if(!calendarEvents.length)sendNextCalendarEvent(true);}
  if(!calendarTimer)calendarTimer=setInterval(function(){sendNextCalendarEvent(false);},60000);
}
function updateCalendarSelectOptions(){
  var names=calendarNames(),chosen=String(readSettings().CALENDAR_FILTER||'__all__');
  var opts=[{label:'All Calendars',value:'__all__'}];
  names.forEach(function(n){opts.push({label:n,value:n});});
  if(chosen!=='__all__'&&names.indexOf(chosen)<0)opts.push({label:chosen+' (not currently reported)',value:chosen});
  clayConfig.forEach(function(section){
    (section.items||[]).forEach(function(item){
      if(item.messageKey==='CALENDAR_FILTER')item.options=opts;
    });
  });
  // Refresh Clay's select widget from the current discovered calendar names.
  clay=new Clay(clayConfig,customClay,{autoHandleEvents:false});
}
var ttsClient = null;
function getTtsClient() {
  if (ttsClient) return ttsClient;
  if (typeof Pebble.invokeAction !== 'function') {
    console.log('KinetiCast: Universal TTS requires plugin-capable Pebble firmware');
    return null;
  }
  try {
    ttsClient = require('./universal_tts').create({
      Pebble: Pebble,
      onError: function(err) { console.log('KinetiCast TTS: '+(err && err.message || err)); }
    });
    return ttsClient;
  } catch (err) {
    console.log('KinetiCast: TTS SDK init failed: '+err);
    return null;
  }
}

// ==============================================================================
// SECTION: WEATHER ICON TRANSLATION HELPERS
// ==============================================================================

// Translates numerical WMO weather codes to OpenWeather string codes
function getWmoIcon(code, isDay) {
  var d = isDay ? 'd' : 'n';
  if (code === 0) return '01' + d; 
  if (code === 1 || code === 2) return '02' + d; 
  if (code === 3) return '04' + d; 
  if (code === 45 || code === 48) return '50' + d; 
  if (code >= 51 && code <= 67) return '09' + d; 
  if (code >= 71 && code <= 77) return '13' + d; 
  if (code >= 80 && code <= 82) return '09' + d; 
  if (code >= 85 && code <= 86) return '13' + d; 
  if (code >= 95 && code <= 99) return '11' + d; 
  return '01' + d;
}

// Translates Met.no condition symbol strings to OpenWeather string codes
function metNoIconToOWM(symbol) {
  if (!symbol) return '01d';
  if (symbol.includes('clearsky')) return symbol.includes('night') ? '01n' : '01d';
  if (symbol.includes('fair') || symbol.includes('partlycloudy')) return symbol.includes('night') ? '02n' : '02d';
  if (symbol.includes('cloudy')) return '03d'; 
  if (symbol.includes('rainshowers') || symbol.includes('drizzle')) return '09d';
  if (symbol.includes('rain')) return '10d';
  if (symbol.includes('sleet') || symbol.includes('snow')) return '13d';
  if (symbol.includes('thunder')) return '11d';
  if (symbol.includes('fog')) return '50d';
  return '01d';
}

// Translates NWS short forecast text descriptions to OpenWeather string codes
function nwsForecastToOWM(forecastStr, isDay) {
  var d = isDay ? 'd' : 'n';
  var str = forecastStr.toLowerCase();
  if (str.includes('thunder')) return '11' + d;
  if (str.includes('snow') || str.includes('ice') || str.includes('blizzard')) return '13' + d;
  if (str.includes('rain') || str.includes('shower') || str.includes('drizzle')) return '09' + d;
  if (str.includes('fog')) return '50' + d;
  if (str.includes('mostly cloudy') || str.includes('overcast')) return '04' + d;
  if (str.includes('partly')) return '02' + d;
  return '01' + d; 
}

// ==============================================================================
// SECTION: PROVIDER FETCH ENGINES
// ==============================================================================

// ------------------------------------------------------------------------------
// OPEN-METEO ENGINE (KEYLESS GLOBAL)
// ------------------------------------------------------------------------------

function readSettings() {
  try { return JSON.parse(localStorage.getItem('clay-settings') || '{}') || {}; }
  catch (err) { console.log('KinetiCast: resetting malformed settings'); return {}; }
}
function settingEnabled(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}

var weatherInFlight = false;
var weatherWatchdog = null;
var weatherRetryTimer = null;
var weatherFailures = 0;
var lastWeatherSuccess = 0;
var lastWeatherAttempt = 0;
var weatherAutoFallback = null;
var weatherGeneration = 0;
var weatherRequests = [];
function armWeatherWatchdog(ms) {
  if (weatherWatchdog) clearTimeout(weatherWatchdog);
  var generation = weatherGeneration;
  weatherWatchdog = setTimeout(function() {
    if (activeWeatherGeneration(generation)) weatherFinished(false, 'request timeout');
  }, ms);
}

function cancelWeatherRequests() {
  var old = weatherRequests;
  weatherRequests = [];
  old.forEach(function(xhr) { try { xhr.abort(); } catch (ignore) {} });
}
function activeWeatherGeneration(gen) { return weatherInFlight && gen === weatherGeneration; }


function desiredTempUnit(settings) {
  var t = settings.TEMP_UNIT;
  return (t === 'F' || t === 'C' || t === 'K' || t === 'R') ? t : (settings.UNITS === 'metric' ? 'C' : 'F');
}
function desiredDistanceUnit(settings) {
  return (settings.DISTANCE_UNIT === 'mi' || settings.DISTANCE_UNIT === 'km') ?
    settings.DISTANCE_UNIT : (settings.UNITS === 'metric' ? 'km' : 'mi');
}
function convertCelsius(celsius, unit) {
  var c = Number(celsius);
  if (unit === 'F') return Math.round(c * 9 / 5 + 32);
  if (unit === 'K') return Math.round(c + 273.15);
  if (unit === 'R') return Math.round((c + 273.15) * 9 / 5);
  return Math.round(c);
}
function temperatureUnitId(unit) { return ['F','C','K','R'].indexOf(unit); }
function syncLegacyPreferences(settings) {
  if (!settings.TEMP_UNIT) settings.TEMP_UNIT = desiredTempUnit(settings);
  if (!settings.DISTANCE_UNIT) settings.DISTANCE_UNIT = desiredDistanceUnit(settings);
  return settings;
}

function weatherIntervalMs(settings) {
  var minutes = parseInt(settings.UPDATE_FREQ, 10);
  if (!isFinite(minutes)) minutes = 30;
  return Math.max(10, Math.min(120, minutes)) * 60000;
}
function weatherFinished(ok, detail) {
  if (!weatherInFlight) return;
  if (weatherWatchdog) { clearTimeout(weatherWatchdog); weatherWatchdog = null; }
  cancelWeatherRequests();
  // Invalidate all callbacks from the provider that just finished.
  weatherGeneration++;
  if (!ok && weatherAutoFallback && weatherAutoFallback.index + 1 < weatherAutoFallback.providers.length) {
    weatherAutoFallback.index++;
    var next = weatherAutoFallback.providers[weatherAutoFallback.index];
    console.log('KinetiCast: ' + detail + '; falling back to ' + next);
    armWeatherWatchdog(next === 'nws' ? 65000 : 35000);
    fetchNamedProvider(next, weatherAutoFallback.lat, weatherAutoFallback.lon, 'metric', weatherAutoFallback.settings);
    return;
  }
  weatherAutoFallback = null;
  weatherInFlight = false;
  if (ok) {
    weatherFailures = 0;
    lastWeatherSuccess = Date.now();
    if (weatherRetryTimer) { clearTimeout(weatherRetryTimer); weatherRetryTimer = null; }
    return;
  }
  console.log('KinetiCast weather: ' + (detail || 'request failed'));
  if (weatherFailures >= 3 || weatherRetryTimer) return;
  weatherFailures++;
  var delay = Math.min(120000, 15000 * Math.pow(2, weatherFailures - 1));
  weatherRetryTimer = setTimeout(function() {
    weatherRetryTimer = null;
    getWeather(true);
  }, delay);
}
function sendWeatherData(dict) {
  // Provider engines deliver Celsius. Convert exactly once, independently of distance.
  var settings = readSettings();
  var gen = weatherGeneration;
  var unit = desiredTempUnit(settings);
  var distance = desiredDistanceUnit(settings);
  var temperatureKeys = ['TEMP_CURRENT','TEMP_HIGH','TEMP_LOW','DAY1_HIGH','DAY1_LOW',
    'DAY2_HIGH','DAY2_LOW','DAY3_HIGH','DAY3_LOW'];
  // Reject missing, null, string and nonfinite readings BEFORE converting;
  // Number(null) and Number(undefined) must not become fictitious temperatures.
  for (var i = 0; i < temperatureKeys.length; i++) {
    var value = dict[temperatureKeys[i]];
    if (typeof value !== 'number' || !isFinite(value) || value < -120 || value > 75) {
      weatherFinished(false, 'incomplete or invalid Celsius forecast'); return;
    }
  }
  for (var j = 0; j < temperatureKeys.length; j++) {
    var key = temperatureKeys[j];
    dict[key] = convertCelsius(dict[key], unit);
  }
  dict.UNITS = distance === 'km' ? 1 : 0;
  dict.DISTANCE_UNIT = dict.UNITS;
  dict.TEMP_UNIT = temperatureUnitId(unit);
  if (!isFinite(dict.TEMP_CURRENT) || !isFinite(dict.TEMP_HIGH) || !isFinite(dict.TEMP_LOW) ||
      !isFinite(dict.DAY1_HIGH) || !isFinite(dict.DAY1_LOW) ||
      !isFinite(dict.DAY2_HIGH) || !isFinite(dict.DAY2_LOW) ||
      !isFinite(dict.DAY3_HIGH) || !isFinite(dict.DAY3_LOW)) {
    weatherFinished(false, 'invalid provider temperature'); return;
  }
  Pebble.sendAppMessage(dict, function() {
    if (activeWeatherGeneration(gen)) weatherFinished(true);
  }, function() {
    if (activeWeatherGeneration(gen)) weatherFinished(false, 'AppMessage delivery failed');
  });
}
function guardWeatherLoad(xhr) {
  var handler = xhr.onload;
  xhr.onload = function() {
    if (!activeWeatherGeneration(xhr._weatherGeneration)) return;
    if (xhr.status < 200 || xhr.status >= 300) {
      weatherFinished(false, 'HTTP ' + xhr.status); return;
    }
    try { if (handler) handler.call(xhr); }
    catch (error) { weatherFinished(false, 'invalid provider response: ' + error.message); }
  };
}

function weatherXHR() {
  var xhr = new XMLHttpRequest();
  xhr._weatherGeneration = weatherGeneration;
  weatherRequests.push(xhr);
  xhr.timeout = 15000;
  xhr.onerror = function() { if (activeWeatherGeneration(xhr._weatherGeneration)) weatherFinished(false, 'network error'); };
  xhr.ontimeout = function() { if (activeWeatherGeneration(xhr._weatherGeneration)) weatherFinished(false, 'network timeout'); };
  return xhr;
}

function fetchOpenMeteo(lat, lon, units, settings) {
  var isMetric = 1; // All providers return Celsius before shared conversion.
  var tempUnit = 'celsius';
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + 
            '&current=temperature_2m,weather_code,uv_index,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code' + 
            '&temperature_unit=' + tempUnit + '&timezone=auto';

  var xhr = weatherXHR();
  xhr.onload = function () {
    if (this.status === 200) { 
      var json = JSON.parse(this.responseText);
      var dict = {
        'TEMP_CURRENT': json.current.temperature_2m,
        'CONDITIONS': getWmoIcon(json.current.weather_code, json.current.is_day), 
        'TEMP_HIGH': json.daily.temperature_2m_max[0],
        'TEMP_LOW': json.daily.temperature_2m_min[0],
        'UNITS': isMetric,
        'IS_NIGHT': json.current.is_day === 0 ? 1 : 0,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30, 
        'UV_INDEX': Math.round(json.current.uv_index),
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': json.daily.temperature_2m_max[1],
        'DAY1_LOW': json.daily.temperature_2m_min[1],
        'DAY1_ICON': getWmoIcon(json.daily.weather_code[1], 1),
        'DAY2_HIGH': json.daily.temperature_2m_max[2],
        'DAY2_LOW': json.daily.temperature_2m_min[2],
        'DAY2_ICON': getWmoIcon(json.daily.weather_code[2], 1),
        'DAY3_HIGH': json.daily.temperature_2m_max[3],
        'DAY3_LOW': json.daily.temperature_2m_min[3],
        'DAY3_ICON': getWmoIcon(json.daily.weather_code[3], 1)
      };
      sendWeatherData(dict);
    }
  };
  xhr.open('GET', url);
  guardWeatherLoad(xhr);
  xhr.send();
}

// ------------------------------------------------------------------------------
// MET.NO / YR.NO ENGINE (KEYLESS GLOBAL)
// ------------------------------------------------------------------------------

function locationDateParts(dateValue, timeZone) {
  var instant = new Date(dateValue);
  if (!isFinite(instant.getTime())) throw new Error('Invalid forecast timestamp');
  if (timeZone && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      var formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone, year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', hourCycle: 'h23'
      });
      if (formatter.formatToParts) {
        var fields = {};
        formatter.formatToParts(instant).forEach(function(p) { fields[p.type] = p.value; });
        return {day: fields.year + '-' + fields.month + '-' + fields.day, hour: parseInt(fields.hour, 10)};
      }
    } catch (err) { console.log('KinetiCast: unavailable location timezone: ' + err.message); }
  }
  // Phone local timezone is appropriate for GPS when platform Intl is unavailable.
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  return {day: instant.getFullYear() + '-' + pad(instant.getMonth()+1) + '-' + pad(instant.getDate()),
    hour: instant.getHours()};
}
function completeDayArray(map, today) {
  var result = [], current = today;
  // Require four consecutive local dates; do not shift a three-day forecast.
  for (var i = 0; i < 4; i++) {
    var day = map[current];
    if (!day || !isFinite(day.max) || !isFinite(day.min) || day.max < day.min ||
        day.max <= -999 || day.min >= 999) throw new Error('Incomplete local-day forecast ' + current);
    result.push(day);
    var d = new Date(current + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().slice(0, 10);
  }
  return result;
}

function fetchMetNo(lat, lon, units, settings) {
  var isMetric = 1; // Celsius for shared conversion.
  var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat.toFixed(4) + '&lon=' + lon.toFixed(4);
  
  var xhr = weatherXHR();
  xhr.open('GET', url);
  xhr.setRequestHeader('User-Agent', 'KinetiCast/2.2 (https://github.com/ericlmccormick/Pebble_Health_and_Weather)');
  xhr.onload = function() {
    if (this.status === 200) {
      var json = JSON.parse(this.responseText);
      var timeseries = json.properties.timeseries;
      if (!timeseries || timeseries.length === 0) { weatherFinished(false, 'Met.no returned no forecast'); return; }
      
      var current = timeseries[0];
      var currentTempC = current.data.instant.details.air_temperature;
      
      var symbol = 'clearsky_day';
      if (current.data.next_1_hours) symbol = current.data.next_1_hours.summary.symbol_code;
      else if (current.data.next_6_hours) symbol = current.data.next_6_hours.summary.symbol_code;
      
      var conditions = metNoIconToOWM(symbol);
      var isNight = symbol.includes('night') ? 1 : 0;
      var dailyData = {};
      
      for (var i = 0; i < timeseries.length; i++) {
        var t = timeseries[i];
        var local = locationDateParts(t.time, settings._LOCATION_TIMEZONE);
        var dateStr = local.day;
        var temp = t.data.instant.details.air_temperature;
        if (typeof temp !== 'number' || !isFinite(temp)) continue;
        
        if (!dailyData[dateStr]) { dailyData[dateStr] = { max: -999, min: 999, icon: null }; }
        if (temp > dailyData[dateStr].max) dailyData[dateStr].max = temp;
        if (temp < dailyData[dateStr].min) dailyData[dateStr].min = temp;
        
        if (local.hour >= 11 && local.hour <= 14 && t.data.next_6_hours && t.data.next_6_hours.summary) {
          dailyData[dateStr].icon = metNoIconToOWM(t.data.next_6_hours.summary.symbol_code);
        }
      }
      
      var todayKey = locationDateParts(Date.now(), settings._LOCATION_TIMEZONE).day;
      var days = completeDayArray(dailyData, todayKey);
      days.forEach(function(day) { if (!day.icon) day.icon = conditions; });
      
      function formatTemp(tempC) {
        return isMetric ? tempC : ((tempC * 9/5) + 32);
      }

      var dict = {
        'TEMP_CURRENT': formatTemp(currentTempC),
        'CONDITIONS': conditions,
        'TEMP_HIGH': formatTemp(days[0].max),
        'TEMP_LOW': formatTemp(days[0].min),
        'UNITS': isMetric,
        'IS_NIGHT': isNight,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30,
        'UV_INDEX': 0,
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': formatTemp(days[1].max),
        'DAY1_LOW': formatTemp(days[1].min),
        'DAY1_ICON': days[1].icon,
        'DAY2_HIGH': formatTemp(days[2].max),
        'DAY2_LOW': formatTemp(days[2].min),
        'DAY2_ICON': days[2].icon,
        'DAY3_HIGH': formatTemp(days[3].max),
        'DAY3_LOW': formatTemp(days[3].min),
        'DAY3_ICON': days[3].icon
      };
      
      sendWeatherData(dict);
    }
  };
  guardWeatherLoad(xhr);
  xhr.send();
}

// ------------------------------------------------------------------------------
// NATIONAL WEATHER SERVICE ENGINE (KEYLESS US ONLY)
// ------------------------------------------------------------------------------
function fetchNWS(lat, lon, units, settings) {
  var base = 'https://api.weather.gov/points/' + lat.toFixed(4) + ',' + lon.toFixed(4);
  var agent = {'User-Agent': 'KinetiCast/2.2 (https://github.com/ericlmccormick/Pebble_Health_and_Weather)'};
  function jsonRequest(url, callback) {
    var xhr = weatherXHR();
    xhr.open('GET', url);
    try { xhr.setRequestHeader('User-Agent', agent['User-Agent']); } catch (ignore) {}
    xhr.onload = function() {
      var value = JSON.parse(this.responseText);
      callback(value);
    };
    guardWeatherLoad(xhr);
    xhr.send();
  }
  jsonRequest(base, function(point) {
    var properties = point.properties || {};
    var hourlyURL = properties.forecastHourly;
    var stationsURL = properties.observationStations;
    if (!hourlyURL || !stationsURL) {
      weatherFinished(false, 'NWS hourly forecast or observations unavailable');
      return;
    }
    jsonRequest(hourlyURL, function(forecast) {
      var periods = forecast.properties && forecast.properties.periods;
      if (!periods || !periods.length) {
        weatherFinished(false, 'NWS hourly forecast empty');
        return;
      }
      var forecastDays = {};
      var tz = properties.timeZone || settings._LOCATION_TIMEZONE;
      var localToday = locationDateParts(Date.now(), tz).day;
      for (var i = 0; i < periods.length; i++) {
        var p = periods[i];
        if (!p || !p.startTime || typeof p.temperature !== 'number') continue;
        var day = locationDateParts(p.startTime, tz);
        var c = p.temperatureUnit === 'F' ? (p.temperature - 32) * 5 / 9 : p.temperature;
        if (!isFinite(c)) continue;
        if (!forecastDays[day.day]) forecastDays[day.day] = {max:-999,min:999,icon:null};
        var d = forecastDays[day.day];
        d.max = Math.max(d.max, c);
        d.min = Math.min(d.min, c);
        // Prefer an afternoon symbol for each day's forecast icon.
        if (!d.icon || (day.hour >= 11 && day.hour <= 14)) {
          d.icon = nwsForecastToOWM(p.shortForecast || '', p.isDaytime !== false);
        }
      }
      var days;
      try { days = completeDayArray(forecastDays, localToday); }
      catch (error) { weatherFinished(false, error.message); return; }
      var first = periods[0];
      jsonRequest(stationsURL, function(stations) {
        var station = stations.observationStations && stations.observationStations[0];
        if (!station && stations.features && stations.features.length) {
          station = stations.features[0].id ||
            (stations.features[0].properties && stations.features[0].properties['@id']);
        }
        if (!station || station.indexOf('https://') !== 0) {
          weatherFinished(false, 'NWS observation station missing');
          return;
        }
        jsonRequest(station.replace(/\/$/, '') + '/observations/latest', function(observation) {
          var observed = observation.properties && observation.properties.temperature &&
            observation.properties.temperature.value;
          if (typeof observed !== 'number' || !isFinite(observed)) {
            weatherFinished(false, 'NWS latest observation has no temperature');
            return;
          }
          // Observation is Celsius, unlike NWS forecastHourly's often-Fahrenheit readings.
          var dict = {
            'TEMP_CURRENT': observed,
            'CONDITIONS': nwsForecastToOWM(first.shortForecast || '', first.isDaytime !== false),
            'TEMP_HIGH': days[0].max, 'TEMP_LOW': days[0].min,
            'UNITS': 1,
            'IS_NIGHT': first.isDaytime === false ? 1 : 0,
            'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ, 10) || 30,
            'UV_INDEX': 0,
            'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
            'THEME_MODE': parseInt(settings.THEME_MODE, 10) || 0,
            'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW, 10) || 0,
            'DAY1_HIGH': days[1].max, 'DAY1_LOW': days[1].min, 'DAY1_ICON': days[1].icon,
            'DAY2_HIGH': days[2].max, 'DAY2_LOW': days[2].min, 'DAY2_ICON': days[2].icon,
            'DAY3_HIGH': days[3].max, 'DAY3_LOW': days[3].min, 'DAY3_ICON': days[3].icon
          };
          sendWeatherData(dict);
        });
      });
    });
  });
}

// ------------------------------------------------------------------------------
// OPENWEATHERMAP ENGINE (REQUIRES API KEY)
// ------------------------------------------------------------------------------
function fetchOpenWeather(lat, lon, units, settings) {
  if (!settings.API_KEY) { weatherFinished(false, 'OpenWeather API key missing'); return; }
  var isMetric = 1; // Celsius for shared conversion.
  var url = 'https://api.openweathermap.org/data/3.0/onecall?lat=' + lat + '&lon=' + lon + '&exclude=minutely,hourly,alerts&units=metric&appid=' + settings.API_KEY;

  var xhr = weatherXHR();
  xhr.onload = function () {
    if (this.status === 200) { 
      var json = JSON.parse(this.responseText);
      var dict = {
        'TEMP_CURRENT': json.current.temp,
        'CONDITIONS': json.current.weather[0].icon, 
        'TEMP_HIGH': json.daily[0].temp.max,
        'TEMP_LOW': json.daily[0].temp.min,
        'UNITS': isMetric,
        'IS_NIGHT': json.current.weather[0].icon.includes('n') ? 1 : 0,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30, 
        'UV_INDEX': Math.round(json.current.uvi),
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': json.daily[1].temp.max,
        'DAY1_LOW': json.daily[1].temp.min,
        'DAY1_ICON': json.daily[1].weather[0].icon,
        'DAY2_HIGH': json.daily[2].temp.max,
        'DAY2_LOW': json.daily[2].temp.min,
        'DAY2_ICON': json.daily[2].weather[0].icon,
        'DAY3_HIGH': json.daily[3].temp.max,
        'DAY3_LOW': json.daily[3].temp.min,
        'DAY3_ICON': json.daily[3].weather[0].icon
      };
      sendWeatherData(dict);
    }
  };
  xhr.open('GET', url);
  guardWeatherLoad(xhr);
  xhr.send();
}

// ==============================================================================
// SECTION: ROUTING & GEOCODING LOGIC
// ==============================================================================

function fetchNamedProvider(provider, lat, lon, units, settings) {
  if (provider === 'openweathermap') {
    fetchOpenWeather(lat, lon, units, settings);
  } else if (provider === 'metno') {
    fetchMetNo(lat, lon, units, settings);
  } else if (provider === 'nws') {
    fetchNWS(lat, lon, units, settings);
  } else {
    fetchOpenMeteo(lat, lon, units, settings);
  }
}
function executeProviderFetch(lat, lon, units, settings) {
  var provider = settings.WEATHER_PROVIDER || 'auto';
  if (provider === 'openweather') provider = 'openweathermap';
  if (provider === 'auto') {
    var inContiguousUS = lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
    weatherAutoFallback = {
      providers: inContiguousUS ? ['openmeteo','nws','metno'] : ['openmeteo','metno'],
      index: 0, lat: lat, lon: lon, settings: settings
    };
    provider = weatherAutoFallback.providers[0];
  } else weatherAutoFallback = null;
  armWeatherWatchdog(provider === 'nws' ? 65000 : 35000);
  fetchNamedProvider(provider, lat, lon, units, settings);
}


/* Weather+ is an opt-in source for existing installs, and the default for new
 * installs. The watch's AppMessage protocol remains unchanged. */
var WEATHER_PLUS_UUID = '7f7b6c10-93e0-4f4c-9237-7e8204c5a121';
var weatherPlusSubscription = null;
var weatherPlusTimer = null;
var weatherPlusLastData = 0;
var weatherPlusStarted = 0;
function chosenWeatherSource(settings) {
  return settings.WEATHER_PROVIDER || (settings.API_KEY ? 'openweathermap' : 'weatherplus');
}
function weatherPlusInstalled() {
  if (typeof Pebble.enumeratePlugins !== 'function') return false;
  try {
    var catalog = Pebble.enumeratePlugins();
    var entries = Array.isArray(catalog) ? catalog :
      (catalog && (catalog.plugins || catalog.items || catalog.results)) || [];
    return entries.some(function(p) {
      var id = p && (p.uuid || p.pluginUuid || p.appUuid || p.id ||
        (p.manifest && p.manifest.uuid));
      return String(id || '').toLowerCase() === WEATHER_PLUS_UUID;
    });
  } catch (err) { console.log('KinetiCast: plugin enumeration failed: '+err); return false; }
}
function weatherPlusValues(props, key) {
  var s = props && props[key] && props[key].series;
  return s && s.numericValue && s.numericValue.values || [];
}
function weatherPlusNum(props,key) {
  var n = props && props[key] && props[key].numericValue;
  return n && typeof n.value === 'number' && isFinite(n.value) ? n.value : null;
}
function weatherPlusText(props,key) {
  var p = props && props[key];
  return p && ((p.shortText && p.shortText.text) || (p.longText && p.longText.text)) || '';
}
function weatherPlusTemperatureUnit(props) {
  var series = props && props.daily_high && props.daily_high.series;
  var symbol = series && series.numericValue && series.numericValue.unit || '°C';
  if (symbol.indexOf('F') >= 0) return 'F';
  if (symbol.indexOf('K') >= 0) return 'K';
  if (symbol.indexOf('R') >= 0) return 'R';
  return 'C';
}
function weatherPlusIcon(code, condition, day) {
  if (typeof code === 'number' && isFinite(code)) {
    if (code < 100) return getWmoIcon(code,day);
    var n = Math.floor(code / 100);
    return (n === 2 ? '11' : n === 3 ? '09' : n === 5 ?
      '10' : n === 6 ? '13' : n === 7 ? '50' :
      code === 800 ? '01' : code === 801 ? '02' : '04') + (day ? 'd' : 'n');
  }
  var text = String(condition || '').toLowerCase();
  if (text.indexOf('snow') >= 0) return '13' + (day ? 'd' : 'n');
  if (text.indexOf('thunder') >= 0) return '11' + (day ? 'd' : 'n');
  if (text.indexOf('rain') >= 0) return '10' + (day ? 'd' : 'n');
  if (text.indexOf('cloudy') >= 0) return '04' + (day ? 'd' : 'n');
  if (text.indexOf('partly') >= 0) return '02' + (day ? 'd' : 'n');
  return '01' + (day ? 'd' : 'n');
}
function applyWeatherPlus(data) {
  if (chosenWeatherSource(readSettings()) !== 'weatherplus') return;
  var instances = data && data.instances || [];
  var props = instances[0] && instances[0].properties;
  if (!props) { console.log('KinetiCast: Weather+ missing properties'); return; }
  var hi = weatherPlusValues(props,'daily_high');
  var lo = weatherPlusValues(props,'daily_low');
  var codes = weatherPlusValues(props,'daily_weather_code');
  var day = props.daily_high && props.daily_high.series;
  var lowDay = props.daily_low && props.daily_low.series;
  var offset = weatherPlusNum(props,'utc_offset');
  var today = Math.floor((Date.now()/1000 + (offset || 0)*60)/86400);
  // Weather+ anchors daily series to local midnight. Reject stale or
  // misaligned day ranges rather than shifting today's high/low.
  if (!day || !lowDay || day.stepSec !== 86400 || lowDay.stepSec !== 86400 ||
      day.start !== lowDay.start ||
      !isFinite(day.start) || !isFinite(offset) ||
      Math.floor((day.start + offset*60)/86400) !== today ||
      hi.length < 4 || lo.length < 4) {
    console.log('KinetiCast: Weather+ daily range unavailable/misaligned'); return;
  }
  var temp = weatherPlusNum(props,'temperature');
  var unit = weatherPlusTemperatureUnit(props);
  var max = unit === 'F' ? 140 : unit === 'K' ? 340 : unit === 'R' ? 620 : 60;
  var min = unit === 'F' ? -150 : unit === 'K' ? 150 : unit === 'R' ? 270 : -100;
  var temperatures = [temp,hi[0],lo[0],hi[1],lo[1],hi[2],lo[2],hi[3],lo[3]];
  if (temperatures.some(function(n) { return typeof n !== 'number' || !isFinite(n) || n < min || n > max; }))
    { console.log('KinetiCast: Weather+ invalid temperature'); return; }
  for (var i=0;i<4;i++) if (hi[i] < lo[i]) return;
  var now = Math.floor(Date.now()/1000);
  var stamp = props.updated_at && props.updated_at.timestamp && props.updated_at.timestamp.value;
  if (stamp && (stamp > now+300 || now-stamp > 3*3600)) {
    console.log('KinetiCast: Weather+ forecast timestamp stale'); return;
  }
  var hours = weatherPlusValues(props,'hourly_is_day');
  var isDay = hours.length && hours[0] != null ? Number(hours[0]) !== 0 : true;
  var currentCode = weatherPlusText(props,'condition_code');
  var hourlyCodes = weatherPlusValues(props,'hourly_weather_code');
  var dict = {
    TEMP_CURRENT: Math.round(temp), TEMP_HIGH: Math.round(hi[0]), TEMP_LOW: Math.round(lo[0]),
    DAY1_HIGH: Math.round(hi[1]), DAY1_LOW: Math.round(lo[1]),
    DAY2_HIGH: Math.round(hi[2]), DAY2_LOW: Math.round(lo[2]),
    DAY3_HIGH: Math.round(hi[3]), DAY3_LOW: Math.round(lo[3]),
    CONDITIONS: weatherPlusIcon(hourlyCodes[0],currentCode,isDay),
    DAY1_ICON: weatherPlusIcon(codes[1],null,true),
    DAY2_ICON: weatherPlusIcon(codes[2],null,true),
    DAY3_ICON: weatherPlusIcon(codes[3],null,true),
    IS_NIGHT: isDay ? 0 : 1,
    TEMP_UNIT: temperatureUnitId(unit),
    UPDATE_FREQ: 30,
    UNITS: desiredDistanceUnit(readSettings()) === 'km' ? 1 : 0,
    DISTANCE_UNIT: desiredDistanceUnit(readSettings()) === 'km' ? 1 : 0,
    SHOW_SLEEP: settingEnabled(readSettings().SHOW_SLEEP,true) ? 1 : 0,
    THEME_MODE: parseInt(readSettings().THEME_MODE,10) || 0,
    DEFAULT_VIEW: parseInt(readSettings().DEFAULT_VIEW,10) || 0
  };
  var uv = weatherPlusNum(props,'uv_index');
  if (uv !== null && uv >= 0 && uv < 40) dict.UV_INDEX = Math.round(uv);
  Pebble.sendAppMessage(dict,function() {
    weatherPlusLastData = Date.now();
    lastWeatherSuccess = weatherPlusLastData;
  },function() { console.log('KinetiCast: Weather+ delivery failed'); });
}
function stopWeatherPlus() {
  if (weatherPlusSubscription && typeof weatherPlusSubscription.unsubscribe === 'function')
    weatherPlusSubscription.unsubscribe();
  weatherPlusSubscription = null;
  if (weatherPlusTimer) clearTimeout(weatherPlusTimer);
  weatherPlusTimer = null;
}
function startWeatherPlus() {
  stopWeatherPlus();
  weatherPlusLastData = 0;
  weatherPlusStarted = Date.now();
  if (!weatherPlusInstalled() || typeof Pebble.subscribeToSource !== 'function') {
    console.log('KinetiCast: Weather+ missing; retaining built-in weather backup');
    getWeather(true,true); return;
  }
  try {
    weatherPlusSubscription = Pebble.subscribeToSource({
      category:'weather',item:'location',plugin:WEATHER_PLUS_UUID,
      properties:['temperature','uv_index','condition_code','hourly_is_day',
        'hourly_weather_code','daily_high','daily_low','daily_weather_code',
        'utc_offset','updated_at'],
      onData:applyWeatherPlus,
      onError:function(err) {
        console.log('KinetiCast: Weather+ source error: '+JSON.stringify(err));
        if (Date.now()-weatherPlusLastData > 30*60000) getWeather(true,true);
      }
    });
    weatherPlusTimer=setTimeout(function() {
      weatherPlusTimer=null;
      if (!weatherPlusLastData) getWeather(true,true);
    },20000);
  } catch (err) {
    console.log('KinetiCast: Weather+ subscription failed: '+err);
    getWeather(true,true);
  }
}

function getWeather() {
  var settings = syncLegacyPreferences(readSettings());
  var units = 'metric'; // Weather providers always speak Celsius internally.
  var provider = chosenWeatherSource(settings);
  // A healthy Weather+ subscription owns the forecast; do not poll twice.
  if (provider === 'weatherplus' && arguments[1] !== true) {
    if (weatherPlusSubscription && (!weatherPlusLastData || Date.now()-weatherPlusLastData < 30*60000)) return;
    if (!weatherPlusSubscription) { startWeatherPlus(); return; }
  }
  if (provider === 'weatherplus') settings.WEATHER_PROVIDER = 'auto';
  var now = Date.now();
  if (weatherInFlight) return;
  if (arguments[0] !== true && lastWeatherSuccess && now - lastWeatherSuccess < weatherIntervalMs(settings)) return;
  if (now - lastWeatherAttempt < 5000) return;
  lastWeatherAttempt = now;
  weatherInFlight = true;
  weatherGeneration++;
  var requestGeneration = weatherGeneration;
  armWeatherWatchdog(25000); // Location resolution has its own deadline.

  if (settingEnabled(settings.USE_GPS, true)) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { if (activeWeatherGeneration(requestGeneration)) executeProviderFetch(pos.coords.latitude, pos.coords.longitude, units, settings); }, 
      function(err) { if (activeWeatherGeneration(requestGeneration)) weatherFinished(false, 'GPS unavailable: ' + (err && err.message || 'unknown')); }, 
      {timeout: 15000, maximumAge: 60000}
    );
  } else if (settings.MANUAL_LOCATION) {
    var geoUrl = '';
    if (provider === 'openweathermap') {
      if (!settings.API_KEY) { weatherFinished(false, 'geocoding requires API key'); return; }
      geoUrl = 'https://api.openweathermap.org/data/2.5/weather?q=' + encodeURIComponent(settings.MANUAL_LOCATION) + '&appid=' + settings.API_KEY;
      var xhrOWM = weatherXHR();
      xhrOWM.onload = function() {
        if (this.status === 200) {
          var json = JSON.parse(this.responseText);
          executeProviderFetch(json.coord.lat, json.coord.lon, units, settings);
        }
      };
      xhrOWM.open('GET', geoUrl);
      guardWeatherLoad(xhrOWM);
  xhrOWM.send();
    } else {
      geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(settings.MANUAL_LOCATION) + '&count=1&language=en&format=json';
      var xhrOM = weatherXHR();
      xhrOM.onload = function() {
        if (this.status === 200) {
          var json = JSON.parse(this.responseText);
          if (json.results && json.results.length > 0) {
            settings._LOCATION_TIMEZONE = json.results[0].timezone || null;
            executeProviderFetch(json.results[0].latitude, json.results[0].longitude, units, settings);
          } else weatherFinished(false, 'manual location not found');
        }
      };
      xhrOM.open('GET', geoUrl);
      guardWeatherLoad(xhrOM);
  xhrOM.send();
    }
  } else {
    weatherFinished(false, 'enable GPS or enter a manual location');
  }
}

// ==============================================================================
// SECTION: APP EVENT HANDLERS
// ==============================================================================

Pebble.addEventListener('ready', function() {
  if (chosenWeatherSource(readSettings()) === 'weatherplus') startWeatherPlus();
  else getWeather();
  startCalendarSource();
});

Pebble.addEventListener('appmessage', function(e) {
  if (!e || !e.payload) return;
  if (ttsClient && ttsClient.handleMessage(e.payload)) return;
  if (e.payload.COMMAND === 'SPEAK_REQUEST') {
    var tts = getTtsClient();
    if (tts) tts.speak(String(e.payload.TEXT || '')).catch(function(err) {
      console.log('KinetiCast TTS request failed: '+err);
    });
    return;
  }
  if (e.payload.REQUEST_WEATHER !== undefined) getWeather();
});

Pebble.addEventListener('showConfiguration', function(e) {
  var settings = syncLegacyPreferences(readSettings());
  localStorage.setItem('clay-settings', JSON.stringify(settings));
  
  if (settings.API_KEY && !settings.WEATHER_PROVIDER) {
    settings.WEATHER_PROVIDER = 'openweathermap';
    localStorage.setItem('clay-settings', JSON.stringify(settings));
  } else if (!settings.WEATHER_PROVIDER) {
    settings.WEATHER_PROVIDER = 'weatherplus';
    localStorage.setItem('clay-settings', JSON.stringify(settings));
  }
  
  updateCalendarSelectOptions();
  Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
  // Guard against missing responses or explicit CANCEL actions
  if (!e || !e.response || e.response === 'CANCEL') { return; }
  
  var oldSettings = syncLegacyPreferences(readSettings());
  
  // Bypass Clay's integer translation entirely by decoding the raw JSON payload
  var rawSettings;
  try { rawSettings = JSON.parse(decodeURIComponent(e.response)); }
  catch (ex) { console.log('Invalid settings response'); return; }
  var settings = oldSettings;
  
  // Merge new settings, safely normalizing object values if Clay wraps them
  Object.keys(rawSettings).forEach(function(key) { 
    var item = rawSettings[key];
    if (item !== null && typeof item === 'object' && item.hasOwnProperty('value')) {
      settings[key] = item.value;
    } else {
      settings[key] = item;
    }
  });

  // Safeguard: Ensure API key isn't cleared if saved on a keyless provider
  if (settings.WEATHER_PROVIDER !== 'openweathermap' && oldSettings.API_KEY) {
    settings.API_KEY = oldSettings.API_KEY;
  }

  // Save the string-keyed configuration back to memory
  localStorage.setItem('clay-settings', JSON.stringify(syncLegacyPreferences(settings)));
  sendNextCalendarEvent(true);

  // Build the numerical dictionary the watch's C code is expecting
  var appDict = {
    'UNITS': desiredDistanceUnit(settings) === 'km' ? 1 : 0,
    'DISTANCE_UNIT': desiredDistanceUnit(settings) === 'km' ? 1 : 0,
    'TEMP_UNIT': temperatureUnitId(desiredTempUnit(settings)),
    'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30,
    'SHOW_SLEEP': (settings.SHOW_SLEEP == true || settings.SHOW_SLEEP === "true" || settings.SHOW_SLEEP == 1) ? 1 : 0,
    'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
    'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
    'SHAKE_ACTION': parseInt(settings.SHAKE_ACTION, 10) || 0,
    'SHAKE_SENSITIVITY': settings.SHAKE_SENSITIVITY === undefined ? 0 : parseInt(settings.SHAKE_SENSITIVITY, 10),
    'SHAKE_LENGTH': settings.SHAKE_LENGTH === undefined ? 2 : parseInt(settings.SHAKE_LENGTH, 10),
    'HR_GRAPH_WINDOW': parseInt(settings.HR_GRAPH_WINDOW, 10) || 20,
    'SLEEP_BRIEF_SECONDS': parseInt(settings.SLEEP_BRIEF_SECONDS, 10) || 0
  };
  
  Pebble.sendAppMessage(appDict, function() {
    lastWeatherSuccess = 0;
    stopWeatherPlus();
    if (chosenWeatherSource(settings) === 'weatherplus') startWeatherPlus();
    else getWeather(true);
  }, function() { console.log('Settings delivery failed'); stopWeatherPlus(); if (chosenWeatherSource(settings) === 'weatherplus') startWeatherPlus(); else getWeather(true); });
});
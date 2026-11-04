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
      { 
        "type": "select", 
        "messageKey": "WEATHER_PROVIDER", 
        "label": "Weather Data Provider", 
        "defaultValue": "openmeteo", 
        "options": [
          { "label": "Open-Meteo (Free Global Forecast)", "value": "openmeteo" }, 
          { "label": "Yr.no / Met.no (Free Global Forecast)", "value": "metno" },
          { "label": "National Weather Service (Free US Only)", "value": "nws" },
          { "label": "OpenWeatherMap (Requires API Key)", "value": "openweathermap" }
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
        "type": "select", 
        "messageKey": "UNITS", 
        "label": "Measurement Units", 
        "defaultValue": "imperial", 
        "options": [
          { "label": "Fahrenheit & Miles", "value": "imperial" }, 
          { "label": "Celsius & Kilometers", "value": "metric" }
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
          { "label": "Weather Panel (3-Day Forecast)", "value": "1" }
        ]
      },
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
      { "type": "toggle", "messageKey": "SHOW_SLEEP", "label": "Display Morning Sleep Briefing", "defaultValue": true }
    ]
  },
  { "type": "submit", "defaultValue": "Save Settings" } 
];

var clay = new Clay(clayConfig, customClay, { autoHandleEvents: false });

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

function weatherIntervalMs(settings) {
  var minutes = parseInt(settings.UPDATE_FREQ, 10);
  if (!isFinite(minutes)) minutes = 30;
  return Math.max(10, Math.min(120, minutes)) * 60000;
}
function weatherFinished(ok, detail) {
  if (!weatherInFlight) return;
  if (weatherWatchdog) { clearTimeout(weatherWatchdog); weatherWatchdog = null; }
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
  if (!isFinite(dict.TEMP_CURRENT) || !isFinite(dict.TEMP_HIGH) || !isFinite(dict.TEMP_LOW) ||
      !isFinite(dict.DAY1_HIGH) || !isFinite(dict.DAY1_LOW) ||
      !isFinite(dict.DAY2_HIGH) || !isFinite(dict.DAY2_LOW) ||
      !isFinite(dict.DAY3_HIGH) || !isFinite(dict.DAY3_LOW)) {
    weatherFinished(false, 'invalid provider temperature'); return;
  }
  Pebble.sendAppMessage(dict, function() {
    weatherFinished(true);
  }, function() {
    weatherFinished(false, 'AppMessage delivery failed');
  });
}
function weatherXHR() {
  var xhr = weatherXHR();
  xhr.timeout = 15000;
  xhr.onerror = function() { weatherFinished(false, 'network error'); };
  xhr.ontimeout = function() { weatherFinished(false, 'network timeout'); };
  return xhr;
}

function fetchOpenMeteo(lat, lon, units, settings) {
  var isMetric = (units === 'metric') ? 1 : 0;
  var tempUnit = isMetric ? 'celsius' : 'fahrenheit';
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + 
            '&current=temperature_2m,weather_code,uv_index,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code' + 
            '&temperature_unit=' + tempUnit + '&timezone=auto';

  var xhr = weatherXHR();
  xhr.onload = function () {
    if (this.status === 200) { 
      var json = JSON.parse(this.responseText);
      var dict = {
        'TEMP_CURRENT': Math.round(json.current.temperature_2m),
        'CONDITIONS': getWmoIcon(json.current.weather_code, json.current.is_day), 
        'TEMP_HIGH': Math.round(json.daily.temperature_2m_max[0]),
        'TEMP_LOW': Math.round(json.daily.temperature_2m_min[0]),
        'UNITS': isMetric,
        'IS_NIGHT': json.current.is_day === 0 ? 1 : 0,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30, 
        'UV_INDEX': Math.round(json.current.uv_index),
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': Math.round(json.daily.temperature_2m_max[1]),
        'DAY1_LOW': Math.round(json.daily.temperature_2m_min[1]),
        'DAY1_ICON': getWmoIcon(json.daily.weather_code[1], 1),
        'DAY2_HIGH': Math.round(json.daily.temperature_2m_max[2]),
        'DAY2_LOW': Math.round(json.daily.temperature_2m_min[2]),
        'DAY2_ICON': getWmoIcon(json.daily.weather_code[2], 1),
        'DAY3_HIGH': Math.round(json.daily.temperature_2m_max[3]),
        'DAY3_LOW': Math.round(json.daily.temperature_2m_min[3]),
        'DAY3_ICON': getWmoIcon(json.daily.weather_code[3], 1)
      };
      sendWeatherData(dict);
    }
  };
  xhr.open('GET', url);
  xhr.send();
}

// ------------------------------------------------------------------------------
// MET.NO / YR.NO ENGINE (KEYLESS GLOBAL)
// ------------------------------------------------------------------------------
function fetchMetNo(lat, lon, units, settings) {
  var isMetric = (units === 'metric') ? 1 : 0;
  var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat.toFixed(4) + '&lon=' + lon.toFixed(4);
  
  var xhr = weatherXHR();
  xhr.open('GET', url);
  xhr.setRequestHeader('User-Agent', 'KinetiCast/2.2 (https://github.com/ericlmccormick/Pebble_Health_and_Weather)');
  xhr.onload = function() {
    if (this.status === 200) {
      var json = JSON.parse(this.responseText);
      var timeseries = json.properties.timeseries;
      if (!timeseries || timeseries.length === 0) return;
      
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
        var dateStr = t.time.substring(0, 10);
        var temp = t.data.instant.details.air_temperature;
        
        if (!dailyData[dateStr]) { dailyData[dateStr] = { max: -999, min: 999, icon: null }; }
        if (temp > dailyData[dateStr].max) dailyData[dateStr].max = temp;
        if (temp < dailyData[dateStr].min) dailyData[dateStr].min = temp;
        
        if (t.time.includes('12:00:00') && t.data.next_6_hours) {
          dailyData[dateStr].icon = metNoIconToOWM(t.data.next_6_hours.summary.symbol_code);
        }
      }
      
      var days = Object.keys(dailyData).sort();
      for (var d = 0; d < days.length; d++) {
        if (!dailyData[days[d]].icon) dailyData[days[d]].icon = conditions;
      }
      
      function formatTemp(tempC) {
        return isMetric ? Math.round(tempC) : Math.round((tempC * 9/5) + 32);
      }

      var dict = {
        'TEMP_CURRENT': formatTemp(currentTempC),
        'CONDITIONS': conditions,
        'TEMP_HIGH': formatTemp(dailyData[days[0]].max),
        'TEMP_LOW': formatTemp(dailyData[days[0]].min),
        'UNITS': isMetric,
        'IS_NIGHT': isNight,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30,
        'UV_INDEX': 0,
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': formatTemp(dailyData[days[1]].max),
        'DAY1_LOW': formatTemp(dailyData[days[1]].min),
        'DAY1_ICON': dailyData[days[1]].icon,
        'DAY2_HIGH': formatTemp(dailyData[days[2]].max),
        'DAY2_LOW': formatTemp(dailyData[days[2]].min),
        'DAY2_ICON': dailyData[days[2]].icon,
        'DAY3_HIGH': formatTemp(dailyData[days[3]].max),
        'DAY3_LOW': formatTemp(dailyData[days[3]].min),
        'DAY3_ICON': dailyData[days[3]].icon
      };
      
      sendWeatherData(dict);
    }
  };
  xhr.send();
}

// ------------------------------------------------------------------------------
// NATIONAL WEATHER SERVICE ENGINE (KEYLESS US ONLY)
// ------------------------------------------------------------------------------
function fetchNWS(lat, lon, units, settings) {
  var isMetric = (units === 'metric') ? 1 : 0;
  var pointUrl = 'https://api.weather.gov/points/' + lat.toFixed(4) + ',' + lon.toFixed(4);
  
  var xhr1 = weatherXHR();
  xhr1.open('GET', pointUrl);
  xhr1.setRequestHeader('User-Agent', 'KinetiCast/2.2 (https://github.com/ericlmccormick/Pebble_Health_and_Weather)');
  xhr1.onload = function() {
    if (this.status === 200) {
      var json1 = JSON.parse(this.responseText);
      var forecastUrl = json1.properties.forecast;
      
      var xhr2 = weatherXHR();
      xhr2.open('GET', forecastUrl);
      xhr2.setRequestHeader('User-Agent', 'KinetiCast/2.2 (https://github.com/ericlmccormick/Pebble_Health_and_Weather)');
      xhr2.onload = function() {
        if (this.status === 200) {
          var json2 = JSON.parse(this.responseText);
          var periods = json2.properties.periods;
          if (!periods || periods.length === 0) return;
          
          function convertTemp(t, unit) {
            if (isMetric) { return unit === 'F' ? Math.round((t - 32) * 5 / 9) : Math.round(t); } 
            else { return unit === 'C' ? Math.round((t * 9 / 5) + 32) : Math.round(t); }
          }
          
          var p0 = periods[0];
          var currentTemp = convertTemp(p0.temperature, p0.temperatureUnit);
          var conditions = nwsForecastToOWM(p0.shortForecast, p0.isDaytime);
          var isNight = p0.isDaytime ? 0 : 1;
          
          var days = [];
          var currentDay = {};
          
          for (var i = 0; i < periods.length; i++) {
            var p = periods[i];
            if (p.isDaytime) {
              if (currentDay.high !== undefined) {
                days.push(currentDay);
                currentDay = {};
              }
              currentDay.high = p.temperature;
              currentDay.unit = p.temperatureUnit;
              currentDay.icon = nwsForecastToOWM(p.shortForecast, true);
            } else {
              currentDay.low = p.temperature;
              currentDay.unit = p.temperatureUnit;
              if (currentDay.high === undefined) {
                currentDay.high = p.temperature;
                currentDay.icon = nwsForecastToOWM(p.shortForecast, false);
              }
            }
          }
          days.push(currentDay);
          
          var dict = {
            'TEMP_CURRENT': currentTemp,
            'CONDITIONS': conditions,
            'TEMP_HIGH': convertTemp(days[0].high, days[0].unit),
            'TEMP_LOW': convertTemp(days[0].low !== undefined ? days[0].low : days[0].high, days[0].unit),
            'UNITS': isMetric,
            'IS_NIGHT': isNight,
            'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30,
            'UV_INDEX': 0,
            'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
            'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
            'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
            'DAY1_HIGH': convertTemp(days[1].high, days[1].unit),
            'DAY1_LOW': convertTemp(days[1].low, days[1].unit),
            'DAY1_ICON': days[1].icon,
            'DAY2_HIGH': convertTemp(days[2].high, days[2].unit),
            'DAY2_LOW': convertTemp(days[2].low, days[2].unit),
            'DAY2_ICON': days[2].icon,
            'DAY3_HIGH': convertTemp(days[3].high, days[3].unit),
            'DAY3_LOW': convertTemp(days[3].low, days[3].unit),
            'DAY3_ICON': days[3].icon
          };
          sendWeatherData(dict);
        }
      };
      xhr2.send();
    }
  };
  xhr1.send();
}

// ------------------------------------------------------------------------------
// OPENWEATHERMAP ENGINE (REQUIRES API KEY)
// ------------------------------------------------------------------------------
function fetchOpenWeather(lat, lon, units, settings) {
  if (!settings.API_KEY) { weatherFinished(false, 'OpenWeather API key missing'); return; }
  var isMetric = (units === 'metric') ? 1 : 0;
  var url = 'https://api.openweathermap.org/data/3.0/onecall?lat=' + lat + '&lon=' + lon + '&exclude=minutely,hourly,alerts&units=' + units + '&appid=' + settings.API_KEY;

  var xhr = weatherXHR();
  xhr.onload = function () {
    if (this.status === 200) { 
      var json = JSON.parse(this.responseText);
      var dict = {
        'TEMP_CURRENT': Math.round(json.current.temp),
        'CONDITIONS': json.current.weather[0].icon, 
        'TEMP_HIGH': Math.round(json.daily[0].temp.max),
        'TEMP_LOW': Math.round(json.daily[0].temp.min),
        'UNITS': isMetric,
        'IS_NIGHT': json.current.weather[0].icon.includes('n') ? 1 : 0,
        'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30, 
        'UV_INDEX': Math.round(json.current.uvi),
        'SHOW_SLEEP': settingEnabled(settings.SHOW_SLEEP, true) ? 1 : 0,
        'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
        'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0,
        'DAY1_HIGH': Math.round(json.daily[1].temp.max),
        'DAY1_LOW': Math.round(json.daily[1].temp.min),
        'DAY1_ICON': json.daily[1].weather[0].icon,
        'DAY2_HIGH': Math.round(json.daily[2].temp.max),
        'DAY2_LOW': Math.round(json.daily[2].temp.min),
        'DAY2_ICON': json.daily[2].weather[0].icon,
        'DAY3_HIGH': Math.round(json.daily[3].temp.max),
        'DAY3_LOW': Math.round(json.daily[3].temp.min),
        'DAY3_ICON': json.daily[3].weather[0].icon
      };
      sendWeatherData(dict);
    }
  };
  xhr.open('GET', url);
  xhr.send();
}

// ==============================================================================
// SECTION: ROUTING & GEOCODING LOGIC
// ==============================================================================

function executeProviderFetch(lat, lon, units, settings) {
  var provider = settings.WEATHER_PROVIDER || 'openmeteo';
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

function getWeather() {
  var settings = readSettings();
  var units = settings.UNITS || 'imperial';
  var provider = settings.WEATHER_PROVIDER || 'openmeteo';
  var now = Date.now();
  if (weatherInFlight) return;
  if (arguments[0] !== true && lastWeatherSuccess && now - lastWeatherSuccess < weatherIntervalMs(settings)) return;
  if (now - lastWeatherAttempt < 5000) return;
  lastWeatherAttempt = now;
  weatherInFlight = true;
  weatherWatchdog = setTimeout(function() { weatherFinished(false, 'request watchdog timeout'); }, 35000);

  if (settingEnabled(settings.USE_GPS, true)) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { executeProviderFetch(pos.coords.latitude, pos.coords.longitude, units, settings); }, 
      function(err) { weatherFinished(false, 'GPS unavailable: ' + (err && err.message || 'unknown')); }, 
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
      xhrOWM.send();
    } else {
      geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(settings.MANUAL_LOCATION) + '&count=1&language=en&format=json';
      var xhrOM = weatherXHR();
      xhrOM.onload = function() {
        if (this.status === 200) {
          var json = JSON.parse(this.responseText);
          if (json.results && json.results.length > 0) {
            executeProviderFetch(json.results[0].latitude, json.results[0].longitude, units, settings);
          }
        }
      };
      xhrOM.open('GET', geoUrl);
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
  getWeather(); 
});

Pebble.addEventListener('appmessage', function(e) {
  if (e && e.payload && e.payload.REQUEST_WEATHER !== undefined) getWeather();
});

Pebble.addEventListener('showConfiguration', function(e) {
  var settings = readSettings();
  
  if (settings.API_KEY && !settings.WEATHER_PROVIDER) {
    settings.WEATHER_PROVIDER = 'openweathermap';
    localStorage.setItem('clay-settings', JSON.stringify(settings));
  } else if (!settings.WEATHER_PROVIDER) {
    settings.WEATHER_PROVIDER = 'openmeteo';
    localStorage.setItem('clay-settings', JSON.stringify(settings));
  }
  
  Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
  // Guard against missing responses or explicit CANCEL actions
  if (!e || !e.response || e.response === 'CANCEL') { return; }
  
  var oldSettings = readSettings();
  
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
  localStorage.setItem('clay-settings', JSON.stringify(settings));

  // Build the numerical dictionary the watch's C code is expecting
  var appDict = {
    'UNITS': settings.UNITS === 'metric' ? 1 : 0,
    'UPDATE_FREQ': parseInt(settings.UPDATE_FREQ) || 30,
    'SHOW_SLEEP': (settings.SHOW_SLEEP == true || settings.SHOW_SLEEP === "true" || settings.SHOW_SLEEP == 1) ? 1 : 0,
    'THEME_MODE': parseInt(settings.THEME_MODE) || 0,
    'DEFAULT_VIEW': parseInt(settings.DEFAULT_VIEW) || 0
  };
  
  Pebble.sendAppMessage(appDict, function() {
    lastWeatherSuccess = 0;
    getWeather(true);
  }, function() { console.log('Settings delivery failed'); getWeather(true); });
});
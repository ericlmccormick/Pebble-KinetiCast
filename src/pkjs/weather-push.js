// Complication-aware phone-to-watch weather routing. Pure helpers for testing.
// Classic keeps its full legacy forecast, while custom layouts send only keys
// needed by visible weather complications. No values are fabricated for gaps.
var BASE=['temperature','uv_index','condition_code','hourly_is_day',
  'hourly_weather_code','daily_high','daily_low','daily_weather_code',
  'utc_offset','updated_at'];
var LEGACY=['TEMP_CURRENT','TEMP_HIGH','TEMP_LOW','CONDITIONS','UV_INDEX',
  'DAY1_HIGH','DAY1_LOW','DAY2_HIGH','DAY2_LOW','DAY3_HIGH','DAY3_LOW',
  'DAY1_ICON','DAY2_ICON','DAY3_ICON','IS_NIGHT','TEMP_UNIT'];
var EXTRA_KEYS=[
 'WX_FEELS','WX_HUMIDITY','WX_WIND_SPEED','WX_WIND_GUST','WX_DEW_POINT',
 'WX_PRESSURE','WX_CLOUD','WX_VISIBILITY','WX_RAIN_CHANCE','WX_RAIN_ETA',
 'WX_AQI','WX_PM25','WX_PM10','WX_OZONE','WX_WAVE_HEIGHT','WX_WAVE_PERIOD',
 'WX_SWELL_HEIGHT','WX_SEA_TEMP','WX_SUNRISE','WX_SUNSET','WX_RAIN_TREND',
 'WX_TEMP_TREND','WX_ALERT'
];
var perMetric={
  1:['CONDITIONS'],2:['TEMP_CURRENT','TEMP_HIGH','TEMP_LOW'],
  3:['TEMP_CURRENT'],4:['TEMP_HIGH','TEMP_LOW'],5:['CONDITIONS'],
  6:['WX_FEELS'],7:['WX_HUMIDITY'],8:['WX_WIND_SPEED'],
  9:['WX_WIND_GUST'],10:['WX_DEW_POINT'],11:['WX_PRESSURE'],
  12:['WX_CLOUD'],13:['WX_VISIBILITY'],14:['UV_INDEX'],
  15:['WX_RAIN_CHANCE'],16:['WX_RAIN_ETA'],17:['WX_RAIN_TREND'],
  18:['WX_TEMP_TREND'],
  19:['DAY1_HIGH','DAY1_LOW','DAY1_ICON','DAY2_HIGH','DAY2_LOW','DAY2_ICON',
    'DAY3_HIGH','DAY3_LOW','DAY3_ICON'],
  20:['WX_ALERT'],21:['WX_AQI'],22:['WX_PM25'],23:['WX_PM10'],
  24:['WX_OZONE'],25:['WX_WAVE_HEIGHT'],26:['WX_WAVE_PERIOD'],
  27:['WX_SWELL_HEIGHT'],28:['WX_SEA_TEMP'],
  70:['WX_SUNRISE'],71:['WX_SUNSET'],
  72:['WX_SUNSET'],73:['WX_SUNRISE','WX_SUNSET']
};
var extraByMetric={
  6:['feels_like','hourly_feels_like'],
  7:['humidity','hourly_humidity'],
  8:['wind_speed','hourly_wind_speed'],
  9:['wind_gust','hourly_wind_gust'],
  10:['dew_point','hourly_dew_point'],
  11:['pressure','hourly_pressure'],
  12:['cloud_cover','hourly_cloud_cover'],
  13:['visibility','hourly_visibility'],
  15:['precipitation','hourly_precipitation'],
  16:['hourly_precipitation'],
  17:['hourly_precipitation'],
  18:['hourly_temperature'],
  20:['alert_count','alert_headline'],
  21:['aqi','hourly_aqi'],
  22:['pm25','hourly_pm25'],
  23:['pm10','hourly_pm10'],
  24:['ozone','hourly_ozone'],
  25:['wave_height','hourly_wave_height'],
  26:['wave_period','hourly_wave_period'],
  27:['swell_wave_height','hourly_swell_wave_height'],
  28:['sea_temperature','hourly_sea_temperature'],
  70:['sunrise','daily_sunrise'],
  71:['sunset','daily_sunset'],
  72:['sunset','daily_sunset'],
  73:['sunrise','sunset','daily_sunrise','daily_sunset']
};
function metricIds(settings,catalog){
  var ids=catalog.activeMetrics(settings);
  // Center three-day forecast and wrist-flick forecast are both real weather
  // consumers, even when no corner displays weather.
  if(catalog.centerView(settings)===3 || Number(settings.SHAKE_ACTION||0)===0)
    ids.push(19);
  return ids;
}
function unique(list){return list.filter(function(v,i){return list.indexOf(v)===i;});}
function watchedKeys(settings,catalog){
  var list=[];
  metricIds(settings,catalog).forEach(function(id){
    list=list.concat(perMetric[id]||[]);
  });
  if(list.some(function(x){return x.indexOf('TEMP_')===0 || x==='WX_FEELS';}))
    list.push('TEMP_UNIT');
  return unique(list);
}
function properties(settings,catalog){
  var list=['utc_offset','updated_at'];
  metricIds(settings,catalog).forEach(function(id){
    list=list.concat(extraByMetric[id]||[]);
  });
  // The Weather+ payload reader also validates the temperature plus the daily
  // range, so retain its baseline fields while any weather source is needed.
  if(requiresWeather(settings,catalog))list=list.concat(BASE);
  return unique(list);
}
function requiresWeather(settings,catalog) {
  return metricIds(settings,catalog).some(function(id){return !!perMetric[id];});
}
function pick(payload,keys){
  var result={};
  keys.forEach(function(key){
    if(Object.prototype.hasOwnProperty.call(payload,key))result[key]=payload[key];
  });
  return result;
}
function changed(payload,delivered,force){
  var result={};
  Object.keys(payload).forEach(function(key){
    if(force || !Object.prototype.hasOwnProperty.call(delivered,key) ||
        delivered[key]!==payload[key])result[key]=payload[key];
  });
  return result;
}
function apply(delivered,acknowledged){
  Object.keys(acknowledged).forEach(function(key){delivered[key]=acknowledged[key];});
  return delivered;
}
module.exports={
  BASE:BASE,LEGACY:LEGACY,EXTRA_KEYS:EXTRA_KEYS,perMetric:perMetric,
  metricIds:metricIds,watchedKeys:watchedKeys,properties:properties,
  requiresWeather:requiresWeather,pick:pick,changed:changed,apply:apply
};

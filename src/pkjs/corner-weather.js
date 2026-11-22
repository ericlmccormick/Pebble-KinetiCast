// Optional Weather+ complication data. Missing is distinct from zero.
var MISSING=-32768;
function scalar(p,key){
  var o=p&&p[key],n=o&&o.numericValue;
  return n&&typeof n.value==='number'&&isFinite(n.value)?n.value:null;
}
function series(p,key,now){
  var s=p&&p[key]&&p[key].series;
  var v=s&&s.numericValue&&s.numericValue.values;
  if(!s||!Array.isArray(v)||!isFinite(s.start)||!isFinite(s.stepSec)||s.stepSec<=0)return null;
  var index=Math.floor((now-s.start)/s.stepSec);
  if(index<0||index>=v.length)return null;
  return {value:v[index],index:index,values:v,unit:s.numericValue.unit||''};
}
function round(n) {
  return typeof n==='number'&&isFinite(n)?Math.round(n):MISSING;
}
function timestamp(p,key){
  var t=p&&p[key]&&p[key].timestamp;
  if(t&&Number(t.value)>0)return Math.floor(Number(t.value));
  var s=p&&p['daily_'+key]&&p['daily_'+key].series;
  var values=s&&s.timestamp&&s.timestamp.values;
  return Array.isArray(values)&&Number(values[0])>0?Math.floor(Number(values[0])):MISSING;
}
function windMph(n, unit){
  if(typeof n!=='number'||!isFinite(n))return MISSING;
  unit=String(unit||'m/s').toLowerCase();
  if(unit.indexOf('km')>=0)return round(n*0.6213711922);
  if(unit.indexOf('knot')>=0||unit==='kt')return round(n*1.150779448);
  if(unit.indexOf('m/s')>=0)return round(n*2.2369362921);
  return round(n);
}
function augment(dict,props,now){
  now=now||Math.floor(Date.now()/1000);
  var current={};
  ['feels_like','humidity','wind_speed','wind_gust','dew_point','pressure',
    'cloud_cover','visibility','precipitation','aqi','pm25','pm10','ozone',
    'wave_height','wave_period','swell_wave_height','sea_temperature'].forEach(function(k){
    current[k]=scalar(props,k);
  });
  var hourly={
    feels_like:'hourly_feels_like',humidity:'hourly_humidity',
    wind_speed:'hourly_wind_speed',wind_gust:'hourly_wind_gust',
    dew_point:'hourly_dew_point',pressure:'hourly_pressure',
    cloud_cover:'hourly_cloud_cover',visibility:'hourly_visibility',
    precipitation:'hourly_precipitation',aqi:'hourly_aqi',pm25:'hourly_pm25',
    pm10:'hourly_pm10',ozone:'hourly_ozone',wave_height:'hourly_wave_height',
    wave_period:'hourly_wave_period',swell_wave_height:'hourly_swell_wave_height',
    sea_temperature:'hourly_sea_temperature'
  };
  var at={};
  Object.keys(hourly).forEach(function(k){
    at[k]=series(props,hourly[k],now);
    if(current[k]==null && at[k] && typeof at[k].value==='number')
      current[k]=at[k].value;
  });
  var windUnit=(props.wind_speed&&props.wind_speed.numericValue&&
    props.wind_speed.numericValue.unit)||(at.wind_speed&&at.wind_speed.unit)||'m/s';
  var values={
    WX_FEELS:round(current.feels_like),
    WX_HUMIDITY:round(current.humidity),
    WX_WIND_SPEED:windMph(current.wind_speed,windUnit),
    WX_WIND_GUST:windMph(current.wind_gust,windUnit),
    WX_DEW_POINT:round(current.dew_point),
    WX_PRESSURE:round(current.pressure),
    WX_CLOUD:round(current.cloud_cover),
    WX_VISIBILITY:round(current.visibility),
    WX_RAIN_CHANCE:round(current.precipitation),
    WX_RAIN_ETA:MISSING,
    WX_AQI:round(current.aqi),
    WX_PM25:round(current.pm25),
    WX_PM10:round(current.pm10),
    WX_OZONE:round(current.ozone),
    WX_WAVE_HEIGHT:round(current.wave_height),
    WX_WAVE_PERIOD:round(current.wave_period),
    WX_SWELL_HEIGHT:round(current.swell_wave_height),
    WX_SEA_TEMP:round(current.sea_temperature),
    WX_SUNRISE:timestamp(props,'sunrise'),
    WX_SUNSET:timestamp(props,'sunset'),
    WX_RAIN_TREND:MISSING,
    WX_TEMP_TREND:MISSING
  };
  var rain=at.precipitation, temperatures=series(props,'hourly_temperature',now);
  if(rain){
    var available=false,eta=-1,max=0;
    for(var i=rain.index;i<Math.min(rain.values.length,rain.index+13);i++){
      var chance=rain.values[i];
      if(typeof chance!=='number'||!isFinite(chance))continue;
      available=true;if(i<rain.index+3&&chance>max)max=chance;
      if(eta<0&&chance>=50)eta=i-rain.index;
    }
    if(available){values.WX_RAIN_ETA=eta;values.WX_RAIN_TREND=round(max);}
  }
  if(temperatures){
    var later=temperatures.values[temperatures.index+3];
    if(typeof later==='number'&&isFinite(later)&&typeof temperatures.value==='number')
      values.WX_TEMP_TREND=round(later-temperatures.value);
  }
  var count=scalar(props,'alert_count');
  var headline=props&&props.alert_headline;
  var alert=headline&&headline.shortText&&headline.shortText.text;
  dict.WX_ALERT=count===null?'--':count===0?'No alerts':String(alert||'Weather alert').slice(0,44);
  Object.keys(values).forEach(function(k){dict[k]=values[k];});
  return dict;
}
module.exports={augment:augment,series:series,scalar:scalar,MISSING:MISSING};

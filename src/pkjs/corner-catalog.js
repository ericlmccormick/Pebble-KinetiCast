// Stable numeric IDs shared with the C corner renderer. Do not renumber.
var groups = {
  weather: [
    [1,'Conditions icon'], [2,'Combined temperature gauge'], [3,'Current temperature'],
    [4,"Today's high / low"], [5,'Conditions text'], [6,'Feels like'], [7,'Humidity'],
    [8,'Wind speed'], [9,'Wind gust'], [10,'Dew point'], [11,'Pressure'],
    [12,'Cloud cover'], [13,'Visibility'], [14,'UV index'], [15,'Chance of rain'],
    [16,'Rain approaching (hourly estimate)'], [17,'Rain trend'], [18,'Temperature trend'],
    [19,'3-day summary'], [20,'Weather alert']
  ],
  environment: [
    [21,'Air quality (AQI)'], [22,'PM2.5'], [23,'PM10'], [24,'Ozone'],
    [25,'Wave height'], [26,'Wave period'], [27,'Swell height'], [28,'Sea temperature']
  ],
  health: [
    [30,'Original dual health rings + distance'], [31,'Dual rings'],
    [32,'Step count'], [33,'Step goal %'], [34,'Walking distance'],
    [35,'Active minutes'], [36,'Activity goal %'], [37,'Heart rate only'],
    [38,'Heart rate + graph'], [39,'Sleep duration'], [40,'Restful sleep'],
    [41,'Restful sleep %'], [42,'Calories (if available)']
  ],
  calendar: [
    [50,'Next event title'], [51,'Next event countdown'], [52,'Event + countdown']
  ],
  clock: [
    [60,'Day and date'], [61,'Week number'], [62,'Day of year'],
    [63,'Year progress'], [64,'Seconds'], [65,'Alternate time zone (future)'],
    [66,'Current time']
  ],
  astronomy: [
    [70,'Sunrise'], [71,'Sunset'], [72,'Daylight remaining'],
    [73,'Daylight progress'], [74,'Moon phase'], [75,'Moon illumination'],
    [76,'Moon image + illumination']
  ],
  system: [
    [80,'Watch battery %'], [81,'Watch battery gauge'], [82,'Estimated battery days'],
    [83,'Charging status'], [84,'Bluetooth connection'], [85,'Quiet Time']
  ],
  plugin: [
    [90,'Preferred complication 1'], [91,'Preferred complication 2'],
    [92,'Preferred complication 3'], [93,'Preferred complication 4'],
    [94,'Preferred complication 5'], [95,'Specific plugin data']
  ],
  none:[[0,'Blank']]
};
var labels = {weather:'Weather',environment:'Air Quality & Marine',health:'Health & Fitness',
  calendar:'Calendar',clock:'Date & Time',astronomy:'Sun & Moon',
  system:'Battery & System',plugin:'Plugin Data',none:'None'};
var slots = ['TL','TR','BL','BR'];
var defaults = {TL:{group:'weather',metric:1},TR:{group:'weather',metric:2},
  BL:{group:'health',metric:30},BR:{group:'health',metric:38}};
function groupOptions() {
  return Object.keys(groups).map(function(key){return {label:labels[key],value:key};});
}
function metricOptions(group) {
  return (groups[group]||groups.none).map(function(entry){
    return {label:entry[1],value:String(entry[0])};
  });
}
function validMetric(group, value) {
  return (groups[group]||[]).some(function(row){return row[0]===Number(value);});
}
function chosenMetric(settings,slot) {
  var group=String(settings['CORNER_'+slot+'_GROUP']||defaults[slot].group);
  if (!groups[group]) group=defaults[slot].group;
  var key='CORNER_'+slot+'_'+group.toUpperCase();
  var value=settings[key];
  if (value == null || !validMetric(group,value)) return defaults[slot].group===group ?
    defaults[slot].metric : groups[group][0][0];
  return Number(value);
}
// The only layout is configurable. Existing installations retain their four
// saved corners; new installs get the original icon/gauge/rings/heart arrangement.
function centerView(settings) {
  var n=Number(settings.CENTER_VIEW);
  return n>=0&&n<=3?n:0;
}
function activeMetrics(settings) {
  return slots.map(function(slot){return chosenMetric(settings,slot);});
}
function hasMetric(settings,check) {
  return activeMetrics(settings).some(check);
}
function usesCalendar(settings) {
  return centerView(settings)===2 || hasMetric(settings,function(n){return n>=50&&n<=52;});
}
function usesWeather(settings) {
  return centerView(settings)===3 || Number(settings.SHAKE_ACTION||0)===0 ||
    hasMetric(settings,function(n){return n>=1&&n<=28 || n>=70&&n<=73;});
}
function usesHealth(settings) {
  return hasMetric(settings,function(n){return n>=30&&n<=42;});
}
function usesSleep(settings) {
  return hasMetric(settings,function(n){return n>=39&&n<=41;});
}
function usesDistance(settings) {
  return hasMetric(settings,function(n){return n===30||n===34;});
}
function usesHrGraph(settings) {
  return hasMetric(settings,function(n){return n===38;});
}
function usesPlugins(settings) {
  return hasMetric(settings,function(n){return n>=90&&n<=95;});
}
module.exports={groups:groups,labels:labels,slots:slots,defaults:defaults,
  groupOptions:groupOptions,metricOptions:metricOptions,validMetric:validMetric,
  chosenMetric:chosenMetric,centerView:centerView,activeMetrics:activeMetrics,
  usesCalendar:usesCalendar,usesWeather:usesWeather,usesHealth:usesHealth,
  usesSleep:usesSleep,usesDistance:usesDistance,usesHrGraph:usesHrGraph,
  usesPlugins:usesPlugins};

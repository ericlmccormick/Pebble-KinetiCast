module.exports = function() {
  var page = this;
  page.on(page.EVENTS.AFTER_BUILD, function() {
    var source = page.getItemByMessageKey('WEATHER_PROVIDER');
    if (!source) return;
    var legacyKeys = ['API_KEY','USE_GPS','MANUAL_LOCATION','TEMP_UNIT','UPDATE_FREQ'];
    function visibility() {
      var plugin = source.get() === 'weatherplus';
      legacyKeys.forEach(function(key) {
        var item = page.getItemByMessageKey(key);
        if (item) { if (plugin) item.hide(); else item.show(); }
      });
      var apiKey = page.getItemByMessageKey('API_KEY');
      if (apiKey && !plugin && source.get() !== 'openweathermap') apiKey.hide();
      ['weather-plus-hint','weather-plus-install','legacy-weather-hint'].forEach(function(id) {
        var item = page.getItemById(id);
        if (item) {
          if (id === 'legacy-weather-hint' ? !plugin : plugin) item.show();
          else item.hide();
        }
      });
    }
    visibility();
    source.on('change',visibility);
  });
};

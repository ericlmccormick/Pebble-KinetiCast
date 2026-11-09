// Keep the settings page compact by showing only controls that apply.
// All message keys and option values are unchanged for saved-setting compatibility.
module.exports = function() {
  var page = this;
  page.on(page.EVENTS.AFTER_BUILD, function() {
    function item(key) { return page.getItemByMessageKey(key); }
    function hint(id) { return page.getItemById(id); }
    function enabled(value) {
      return value === true || value === 1 || value === '1' || value === 'true';
    }
    function setVisible(control, visible) {
      if (control) { if (visible) control.show(); else control.hide(); }
    }
    function watchControl(source, callback) {
      if (!source) return;
      callback();
      source.on('change', callback);
    }

    var weatherEnabled = item('WEATHER_UPDATES_ENABLED');
    var weatherSource = item('WEATHER_PROVIDER');
    var gps = item('USE_GPS');
    function updateWeather() {
      var active = !weatherEnabled || enabled(weatherEnabled.get());
      var provider = weatherSource ? weatherSource.get() : 'weatherplus';
      var shared = provider === 'weatherplus';
      setVisible(weatherSource,active);
      ['weather-plus-hint','weather-plus-install'].forEach(function(id){
        setVisible(hint(id),active && shared);
      });
      setVisible(hint('legacy-weather-hint'),active && !shared);
      setVisible(item('API_KEY'),active && provider === 'openweathermap');
      setVisible(gps,active && !shared);
      setVisible(item('MANUAL_LOCATION'),active && !shared &&
        (!gps || !enabled(gps.get())));
      setVisible(item('TEMP_UNIT'),active && !shared);
      setVisible(item('UPDATE_FREQ'),active && !shared);
    }
    watchControl(weatherEnabled,updateWeather);
    watchControl(weatherSource,updateWeather);
    watchControl(gps,updateWeather);

    var bottom = item('DEFAULT_VIEW');
    var shake = item('SHAKE_ACTION');
    var persistent = item('PERSISTENT_CALENDAR_ENABLE');
    function updateCalendar() {
      var needed = (bottom && String(bottom.get()) === '2') ||
        (shake && String(shake.get()) === '3') ||
        (persistent && enabled(persistent.get()));
      setVisible(item('CALENDAR_FILTER'), needed);
      setVisible(hint('calendar-source-hint'), needed);
      setVisible(item('PERSISTENT_CALENDAR_MINUTES'),
        persistent && enabled(persistent.get()));
    }
    watchControl(bottom, updateCalendar);
    watchControl(shake, updateCalendar);
    watchControl(persistent, updateCalendar);

    function updateGesture() {
      var action = shake ? String(shake.get()) : '0';
      var active = action !== '2';
      setVisible(item('GESTURE_POWER_MODE'),active);
      setVisible(item('SHAKE_SENSITIVITY'),active);
      setVisible(item('SHAKE_LENGTH'),active);
      setVisible(hint('gesture-tts-hint'),action === '1');
    }
    watchControl(shake, updateGesture);

    var showSleep = item('SHOW_SLEEP');
    watchControl(showSleep,function() {
      setVisible(item('SLEEP_BRIEF_SECONDS'), enabled(showSleep.get()));
    });
  });
};

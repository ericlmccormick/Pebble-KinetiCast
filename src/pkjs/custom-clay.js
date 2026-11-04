module.exports = function(minified) {
  var clayConfig = this;

  // ==============================================================================
  // SECTION: VISIBILITY TOGGLE HELPERS
  // ==============================================================================

  function toggleApiKey() {
    var providerItem = clayConfig.getItemByMessageKey('WEATHER_PROVIDER');
    var apiKeyField = clayConfig.getItemByMessageKey('API_KEY');
    
    // Check that both elements exist before querying or toggling visibility
    if (providerItem && apiKeyField) {
      var provider = providerItem.get();
      if (provider === 'openweathermap') {
        apiKeyField.show();
      } else {
        apiKeyField.hide();
      }
    }
  }

  // ==============================================================================
  // SECTION: EVENT LISTENERS
  // ==============================================================================

  clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function() {
    var providerSelect = clayConfig.getItemByMessageKey('WEATHER_PROVIDER');
    
    toggleApiKey();
    if (providerSelect) {
      providerSelect.on('change', toggleApiKey);
    }
  });
};
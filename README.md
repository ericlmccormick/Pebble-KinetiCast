# KinetiCast — Health and Weather

Pebble Time 2 watchface combining clock, weather and health information.

**Current source version:** 2.3.1 (see `package.json`). **Target:** Emery / Pebble Time 2.

## Features and setup

The manifest enables health, location and phone configuration. Watchface settings include time format, weather provider, location (GPS or manual), weather update frequency, temperature/distance units, appearance, and health/sleep display preferences. The OpenWeather provider requires a user-supplied API key; other provider requirements depend on the selection.

Install the watchface, grant requested permissions, then open its settings from the Pebble phone app. Configure weather location/provider before troubleshooting blank forecasts. Health readings depend on watch sensors and Pebble Health data availability.

## Weather+ compatibility

New installs default to the Weather+ shared source. Existing saved weather providers, location, units and credentials are preserved. Weather+ owns its own location, provider, temperature units and 15-minute cache; the watchface retains walking distance, health, appearance, and sleep settings. KinetiCast reads full-calendar-day `daily_high` and `daily_low` rather than aggregating the remaining hours of the day. If Weather+ is unavailable, legacy providers continue to serve as a fallback.

## Independent shake behavior and spoken time

The lower-panel default (Health or Weather) is separate from the Shake Watch Action (Show Other Panel for 7 seconds, Speak Time via Universal TTS, or Do Nothing). Existing installations default to the original panel-swap behavior; no user settings are reset.

Speak Time requires a speaker-capable watch, the [Universal TTS plugin](https://github.com/ericlmccormick/Pebble-Universal-TTS) installed/configured with a working voice, and permission to invoke it. The watch sends its local clock time to the phone-side SDK, which requests the selected provider and streams ADPCM audio back for watch playback. No credentials are stored in KinetiCast.

Shake sensitivity is independently adjustable (Low, Medium, High), and shake length can be Short, Medium or Long. The detector verifies acceleration changes sustained for the selected duration; longer, less-sensitive gestures are recommended for spoken time. Accelerometer sampling is activated only briefly after a tap/shake indication to limit battery impact. Saved preferences persist across restarts. The legacy high/short behavior remains until users save new gesture settings.

## Development

The project is a native Pebble SDK 3 app. Run `pebble build` with a supported SDK, or use [GitHub Actions](.github/workflows/build.yml). Review `package.json` for the authoritative platform, version and AppMessage keys. Regression tests are in `tests/`; they cover weather provider, units, transport and release assumptions.

## Support

Report issues with the app version, watch model, provider, and steps to reproduce. Do not post API keys or personal health data. Support development: https://ko-fi.com/ericmccormick

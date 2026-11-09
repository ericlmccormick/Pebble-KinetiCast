# KinetiCast — Health and Weather

Pebble Time 2 watchface combining clock, weather and health information.

**Current source version:** 2.2.2 (see `package.json`). **Target:** Emery / Pebble Time 2.

## Features and setup

The manifest enables health, location and phone configuration. Watchface settings include time format, weather provider, location (GPS or manual), weather update frequency, temperature/distance units, appearance, and health/sleep display preferences. The OpenWeather provider requires a user-supplied API key; other provider requirements depend on the selection.

Install the watchface, grant requested permissions, then open its settings from the Pebble phone app. Configure weather location/provider before troubleshooting blank forecasts. Health readings depend on watch sensors and Pebble Health data availability.

## Development

The project is a native Pebble SDK 3 app. Run `pebble build` with a supported SDK, or use [GitHub Actions](.github/workflows/build.yml). Review `package.json` for the authoritative platform, version and AppMessage keys. Regression tests are in `tests/`; they cover weather provider, units, transport and release assumptions.

## Support

Report issues with the app version, watch model, provider, and steps to reproduce. Do not post API keys or personal health data. Support development: https://ko-fi.com/ericmccormick

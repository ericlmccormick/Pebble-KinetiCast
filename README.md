# KinetiCast — Health and Weather

Pebble Time 2 watchface combining clock, weather and health information.

**Current source version:** 2.3.5 (see `package.json`). **Target:** Emery / Pebble Time 2.

## Features and setup

The manifest enables health, location and phone configuration. Watchface settings include time format, weather provider, location (GPS or manual), weather update frequency, temperature/distance units, appearance, and health/sleep display preferences. The OpenWeather provider requires a user-supplied API key; other provider requirements depend on the selection.

Install the watchface, grant requested permissions, then open its settings from the Pebble phone app. Configure weather location/provider before troubleshooting blank forecasts. Health readings depend on watch sensors and Pebble Health data availability.

## Weather+ compatibility

New installs default to the Weather+ shared source. Existing saved weather providers, location, units and credentials are preserved. Weather+ owns its own location, provider, temperature units and 15-minute cache; the watchface retains walking distance, health, appearance, and sleep settings. KinetiCast reads full-calendar-day `daily_high` and `daily_low` rather than aggregating the remaining hours of the day. If Weather+ is unavailable, legacy providers continue to serve as a fallback.

## Independent shake behavior and spoken time

The lower-panel default (Health or Weather) is separate from the Shake Watch Action (Show Other Panel for 7 seconds, Speak Time via Universal TTS, or Do Nothing). Existing installations default to the original panel-swap behavior; no user settings are reset.

Speak Time requires a speaker-capable watch, the [Universal TTS plugin](https://github.com/ericlmccormick/Pebble-Universal-TTS) installed/configured with a working voice, and permission to invoke it. The watch sends its local clock time to the phone-side SDK, which requests the selected provider and streams ADPCM audio back for watch playback. No credentials are stored in KinetiCast.

Shake sensitivity is independently adjustable (Low, Medium, High), and shake length can be Short, Medium or Long. The detector verifies acceleration changes sustained for the selected duration; longer, less-sensitive gestures are recommended for spoken time. The gesture detector now listens to batched 25 Hz accelerometer samples directly, without waiting for Pebble's relatively forceful tap interrupt. This increases responsiveness but may increase battery use compared with tap-only detection. Saved preferences persist across restarts. The legacy high/short behavior remains until users save new gesture settings.

## Next calendar event panel\n\nSelect **Next Calendar Event** as the default lower panel, or **Show Next Calendar Event** on a shake for seven seconds. The display includes the next future appointment title and a watch-local minute countdown. Use the native Pebble Calendar plugin; no external calendar credentials are stored. The phone settings offer **All Calendars** or names discovered in the current plugin events (up to ten events/seven days); the plugin does not expose a separate exhaustive calendar registry. Previously discovered names are retained. Missing permissions or data display an unavailable/empty state rather than fabricating an event.\n\n## Development

The project is a native Pebble SDK 3 app. Run `pebble build` with a supported SDK, or use [GitHub Actions](.github/workflows/build.yml). Review `package.json` for the authoritative platform, version and AppMessage keys. Regression tests are in `tests/`; they cover weather provider, units, transport and release assumptions.

## Support

Report issues with the app version, watch model, provider, and steps to reproduce. Do not post API keys or personal health data. Support development: https://ko-fi.com/ericmccormick

## v2.3.3 — Gesture and calendar flick fixes

- Fixed **Show Next Calendar Event** (shake action 3) being rejected by the watch's live settings handler, which erroneously selected the alternate Weather panel.
- Removed the hard tap-detection prerequisite for shake actions. High/Short now uses a 160 mg change threshold, two motion impulses, and a 100 ms duration; Medium and Low require more deliberate motion. Sensor samples are batched at 10 Hz (4 per callback) for lower CPU wakeups.
- Retained independent gesture sensitivity, duration, action settings, existing preferred lower panel, 7-second temporary display, and configured calendar filtering.
- Note: Continuous low-rate accelerometer listening may consume more power than the old tap-gated implementation. Actual sensitivity and battery use require physical watch testing.

## v2.3.4 — SDK-default accelerometer sampling

Changed gesture polling from 10 Hz (100 ms/sample) to the Pebble SDK default of **25 Hz (40 ms/sample)**, batching five samples per callback (~200 ms per batch). Low, Medium, and High sensitivity remain independent thresholds on the maximum per-axis change between adjacent acceleration samples (460, 290, and 160 milligravity, respectively). Low requires three qualifying motion impulses; Medium and High require two. These numbers are tuning starting points, not Pebble system gesture classifications. Short, Medium, and Long continue to require 100, 350, and 700 ms of qualifying motion. Continuous sampling may affect battery life; validate on watch.

## v2.3.5 — Adjustable acceleration threshold

Replaced the three fixed Low/Medium/High shake sensitivity presets with a phone-settings **100–500 mg slider**, in 10 mg increments (default 290 mg). Lower values trigger on gentler movement; higher values require stronger movement. The threshold measures the maximum per-axis acceleration change between consecutive 25 Hz samples, not absolute wrist acceleration. The separate Short/Medium/Long duration control remains unchanged. Existing preset values migrate automatically: Low→460 mg, Medium→290 mg, High→160 mg. Users' panel actions and other settings are preserved.

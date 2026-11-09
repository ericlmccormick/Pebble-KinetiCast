# KinetiCast — Health and Weather

Pebble Time 2 watchface combining clock, weather and health information.

**Current source version:** 2.4.2 (see `package.json`). **Target:** Emery / Pebble Time 2.

## v2.4.0 — Calendar, voice and gesture upgrades

Released feature changes since the published 2.3 version:

- **Next Event panel:** Show the next upcoming calendar event's title and countdown as the default lower panel or as a temporary wrist-flick view. Choose All Calendars or a discovered individual calendar from the native Pebble Calendar plugin.
- **Persistent calendar countdown:** Optional automatic calendar panel when an event is 5, 10, 15, 20, 25 or 30 minutes away. It remains visible until the event starts, using the same calendar selection as the shake preview, then returns to the configured default view.
- **Independent shake actions:** Temporarily show another panel, show the next calendar event, announce the time through Universal TTS, display shake-strength diagnostics, or disable shake actions.
- **Tunable shake detection:** SDK-default 25 Hz accelerometer sampling, independently configurable Short/Medium/Long gesture duration, and a 100–2,600 mg per-axis acceleration-change threshold slider in 50 mg steps.
- **Shake calibration:** Seven-second diagnostic showing measured peak change and selected threshold (above/below), to help fine-tune wrist-flick activation.
- **Weather+ integration and robustness:** Shared Weather+ plugin support, full-calendar-day forecast highs/lows, provider fallback, data handling and caching refinements.
- **Reliability and compatibility:** Corrected calendar flick action routing, preserved stored preferences and legacy weather providers, plus expanded automated checks.

**Requirements:** Native Pebble Calendar plugin and permissions for calendar features; configured Universal TTS plugin and a speaker-equipped watch for spoken time. Emery/Pebble Time 2 target.

## Features and setup

The manifest enables health, location and phone configuration. Watchface settings include time format, weather provider, location (GPS or manual), weather update frequency, temperature/distance units, appearance, and health/sleep display preferences. The OpenWeather provider requires a user-supplied API key; other provider requirements depend on the selection.

Install the watchface, grant requested permissions, then open its settings from the Pebble phone app. Configure weather location/provider before troubleshooting blank forecasts. Health readings depend on watch sensors and Pebble Health data availability.

## Weather+ compatibility

New installs default to the Weather+ shared source. Existing saved weather providers, location, units and credentials are preserved. Weather+ owns its own location, provider, temperature units and 15-minute cache; the watchface retains walking distance, health, appearance, and sleep settings. KinetiCast reads full-calendar-day `daily_high` and `daily_low` rather than aggregating the remaining hours of the day. If Weather+ is unavailable, legacy providers continue to serve as a fallback.

## Independent shake behavior and spoken time

The lower-panel default (Health, Weather, or Next Event) is separate from the Shake Watch Action (Show Other Panel, Show Next Event, Speak Time via Universal TTS, Show Shake Strength, or Do Nothing). Existing installations default to the original panel-swap behavior; no user settings are reset.

Speak Time requires a speaker-capable watch, the [Universal TTS plugin](https://github.com/ericlmccormick/Pebble-Universal-TTS) installed/configured with a working voice, and permission to invoke it. The watch sends its local clock time to the phone-side SDK, which requests the selected provider and streams ADPCM audio back for watch playback. No credentials are stored in KinetiCast.

Shake acceleration threshold is adjustable from 100 to 2,600 mg in 50 mg steps, and shake length can be Short, Medium or Long. The detector verifies acceleration changes sustained for the selected duration; longer, less-sensitive gestures are recommended for spoken time. The gesture detector now listens to batched 25 Hz accelerometer samples directly, without waiting for Pebble's relatively forceful tap interrupt. This increases responsiveness but may increase battery use compared with tap-only detection. Saved preferences persist across restarts. The legacy high/short behavior remains until users save new gesture settings.

## Next calendar event panel

Select **Next Calendar Event** as the default lower panel, or **Show Next Calendar Event** on a shake for seven seconds. The display includes the next future appointment title and a watch-local minute countdown. Use the native Pebble Calendar plugin; no external calendar credentials are stored. The phone settings offer **All Calendars** or names discovered in the current plugin events (up to ten events/seven days); the plugin does not expose a separate exhaustive calendar registry. Previously discovered names are retained. Missing permissions or data display an unavailable/empty state rather than fabricating an event.\n\n## Development

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

## v2.3.6 — Shake strength calibration mode

Choose **Show Shake Strength (Test, 7 seconds)** under Shake Watch Action. A diagnostic overlay appears over the lower part of the watchface showing **Peak: X mg** and **Set: Y mg (ABOVE/BELOW)**, then disappears after seven seconds. Peak is the largest change on a single acceleration axis between adjacent 25 Hz samples observed during a 320 ms measurement window. Diagnostic mode starts measuring at 60 mg, below the user-configured 100–500 mg action threshold, so you can see sub-threshold motions. A short cooldown reduces repeated pop-ups. The ABOVE/BELOW indication compares only acceleration strength; ordinary actions also require qualifying motion impulses and the selected shake duration. The existing lower panel and other shake actions remain unchanged. These readings should be calibrated on the actual watch; ordinary wrist movement can sometimes cause a test reading.

## v2.3.8 — Expanded shake threshold

Shake Acceleration Threshold now ranges from **100 to 2,600 mg**, in **50 mg increments**. The phone slider, settings normalization, on-watch persistence and strength test overlay all use the same value. Existing slider choices are rounded to the nearest 50 mg step; legacy Low/Medium/High settings migrate to 450/300/150 mg. The 25 Hz sensor rate and Short/Medium/Long duration settings are unchanged. These values are per-axis differences between adjacent 40 ms samples, not overall acceleration magnitude.

## v2.3.8 — Persistent calendar countdown

The optional **Persistent Calendar Notification** toggle automatically changes the watchface's lower panel to **Next Calendar Event** when the next matching event is within a configurable lead time. The **Show Before Event** dropdown appears only while the toggle is on, with choices of 5, 10, 15, 20, 25 or 30 minutes (default 15). The event title and live countdown stay visible until the event starts, then the normal default lower panel returns. The native Calendar plugin's existing **Next Event Calendar** filter (All Calendars or an individually discovered calendar) applies to both shake previews and persistent notifications. With no matching event, the lower panel stays on its normal selection. The watch stores toggle and lead time locally and reevaluates on every clock minute, settings update, or incoming event; timed callbacks enter at the configured lead-time boundary and restore the default at the actual event start. Persistent notifications take priority over shake previews and strength-test overlays. No sound, buzz, or phone notification is generated. Enable native Pebble Calendar permissions to receive events.

## v2.4.1 — Power and efficiency improvements

- **Optional gesture power saver:** Responsive mode retains the user-tested continuous 25 Hz sampling (5 samples/batch, ~432,000 callbacks per day); Battery Saver uses the Pebble tap interrupt to activate short 25 Hz bursts, with lower idle sensor activity but potentially misses gentle flicks. The sampling frequency itself is unchanged.
- **Change-driven rendering:** Forecast day labels regenerate only when date, units or forecast temperatures change; health labels and goal canvas redraw when their actual values change; the heart-rate history graph and calendar countdown redraw only when the displayed data changes. Battery indicator redraws only on battery-level change.
- **Health controls:** Optional Live Health Updates toggle. When disabled, the watch still updates displayed health metrics once per minute rather than responding to every movement/heart-rate callback.
- **Calendar optimization:** No subscription unless Next Event is the default panel, next-event shake action is selected, or persistent calendar notification is enabled. At most one application-level source read per hour while active; unsubscribe after data arrives. Only the next event is transmitted to the watch and persisted locally; minute-by-minute countdown stays on-watch. Disabling all calendar features stops future reads and clears the watch's one event. The native Calendar plugin's own background behavior is separate and not controlled by KinetiCast.
- **Weather+ optimization:** Suppress unchanged Weather+ payloads and avoid forcing weather refreshes when a shake briefly reveals another panel or when unrelated settings are saved.
- **Timer efficiency:** The persistent calendar's event boundary timer is retained instead of canceled/recreated every minute.
- **Power activity information:** Settings summarize theoretical sensor callback rates, calendar source read rate, weather source and live-health mode. These are workload indicators, *not* measured per-feature current draw or battery percentage. Users can disable gesture processing, live health events, calendar views/notifications, or alter weather refresh settings.

**Trade-off:** Hourly calendar snapshots can miss events created or modified between refreshes. Tap-armed gestures save idle work at the expense of gentle-flick sensitivity. Neither feature's battery savings are quantified until physical watch testing.

### Weather activity control

The **Enable Weather Updates** toggle defaults on. Turning it off unsubscribes from Weather+, disables built-in forecast requests, and keeps the last locally saved weather values displayed (which may become stale). This allows users who prefer battery savings to stop weather traffic entirely. Turning it back on re-subscribes to Weather+ or performs a built-in weather refresh. No automatic downloads are triggered by shake panel previews.

## v2.4.2 — Settings refresh

Reorganized the phone configuration into **Watchface**, **Weather**, **Calendar**, **Wrist Gestures**, **Health & Sleep**, and **Power & Diagnostics**. Reduced descriptive text, moved each option beside its related control, and reordered dropdowns logically (especially wrist actions, theme, weather providers and sleep timeout). Unneeded fields now hide automatically based on the provider, weather enable switch, calendar features, gesture action, GPS mode and sleep-summary switch. Settings keys, saved values, defaults and service behavior remain compatible with v2.4.1.

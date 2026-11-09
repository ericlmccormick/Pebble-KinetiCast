# KinetiCast v2.4.0 — Release notes

Upgrade from the published v2.3 release.

## What's new

- **Next Event calendar panel:** Add the title of your next appointment and a live countdown to the lower watchface panel. Use it as the default display or temporarily show it with a wrist flick.
- **Calendar filtering:** Choose all calendars or a specific calendar discovered through the native Pebble Calendar plugin.
- **Persistent event countdown:** Optionally display the next matching event automatically from 5–30 minutes before its start, in 5-minute increments. The panel remains visible until the event starts and then returns to your normal default view.
- **More shake actions:** Choose between switching panels, showing the next event, speaking the current time, showing a shake-strength diagnostic, or disabling shake actions.
- **Adjustable wrist-flick response:** Set the acceleration-change threshold from 100–2,600 mg in 50 mg increments, plus independently selectable Short/Medium/Long shake duration. Uses Pebble's 25 Hz sampling with batched readings.
- **Shake-strength calibration:** Temporarily show the measured peak acceleration change and whether it was above or below your configured threshold to help find a comfortable setting.
- **Spoken time:** Universal TTS plugin integration can read the watch's local time aloud on speaker-equipped watches.
- **Weather improvements:** Weather+ plugin integration, full-calendar-day high/low temperatures, shared caching and compatibility with existing built-in weather providers.
- **Fixes and reliability:** Fixed shake action routing that previously opened Weather instead of the selected calendar panel; added calendar timing, settings and shake regression tests; maintained existing preferences.

## Setup and compatibility

Built for Pebble Time 2 (Emery). Calendar features require the native Pebble Calendar plugin and permission to access selected device calendars. Spoken time requires the Universal TTS plugin, a configured provider and compatible speaker hardware.

The new calendar notification is visual only; it does not create a sound or phone notification. Calendar availability and the list of selectable calendars depend on events returned by the phone plugin.

Source: https://github.com/ericlmccormick/Pebble-KinetiCast

Support: https://ko-fi.com/ericmccormick

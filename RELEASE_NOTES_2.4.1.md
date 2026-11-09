# KinetiCast v2.4.1 — Power-efficiency update

## Highlights

- **Reduced unnecessary drawing:** Rebuild forecast labels only when forecasts, units or date change. Update health text and goal rings only when values change. Redraw the heart-rate graph only when its history changes, the calendar countdown when its text changes, the date once daily and the battery when its percentage changes. Stop periodic redraws of unchanged weather arcs.
- **Gesture Battery Saver (optional):** Retains the normal 25 Hz accelerometer sample rate during detection, but arms short, 2.1-second 25 Hz bursts using Pebble's tap interrupt rather than sampling continuously. The original continuous 25 Hz mode remains the default for reliable, gentle wrist-flick detection. Disable shake actions to stop all watchface gesture sampling.
- **Calendar reads at most hourly:** KinetiCast only subscribes to the native Calendar source if Next Event is the default panel, Show Next Event is selected as its shake action, or persistent notifications are enabled. The source subscription is released after one response. Only the next matching event is sent and stored on the watch. The watch independently updates the countdown every minute without phone communication. Turning all features off stops KinetiCast calendar reads.
- **Less phone/watch data traffic:** Suppresses unchanged Weather+ transmissions and duplicate next-event transmissions. Stops forcing a weather refresh when shaking to another panel or saving unrelated settings.
- **Calendar timing:** Retains the exact lead-time and event-start timers rather than recreating them every minute.
- **Selectable live health cadence:** Live Health Updates on (default) responds to changes in heart rate/movement; off updates displayed health metrics once per minute.
- **Disable weather polling:** Enable Weather Updates toggle is on by default. Turning it off stops KinetiCast's Weather+ subscription and built-in forecast requests. Previously saved forecast data stays visible and may become stale.
- **Power activity summary:** Phone settings display estimated gesture callback activity, calendar source frequency, weather mode, health cadence, plus calendar/weather message counts for the current phone-side session. These are usage indicators, **not electrical power or per-feature battery drain measurements**.

## Trade-offs and caveats

- Tap-armed mode may miss light wrist flicks due to Pebble's tap threshold. Keep Responsive mode for best gesture reliability.
- Hourly calendar reads can miss newly created or modified appointments until the next snapshot. Calendar notification countdowns themselves continue on the watch.
- Disabling weather updates leaves outdated, cached readings visible. Re-enable updates to resume live forecasts.
- KinetiCast cannot stop the Pebble Calendar or Weather+ plugins' own independent background operations. It controls only its own requests and subscriptions.
- Battery savings require comparison on actual watch hardware under equivalent usage. No per-feature mA/mWh readings are provided by the available watchface APIs.

## Compatibility

Pebble Time 2 (Emery), firmware-compatible Pebble SDK 4.44 toolchain. No changes to plugin permission requirements or existing event/action message keys. New settings are optional and default to the pre-update behavior.

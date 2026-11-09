// Regression checks for independent shake action and Universal TTS routing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const c=fs.readFileSync('src/c/main.c','utf8');
const js=fs.readFileSync('src/pkjs/index.js','utf8');
const manifest=require('../package.json');
assert.equal(manifest.version,'2.3.5');
for(const key of ['COMMAND','TEXT','CHUNK','SHAKE_ACTION','SHAKE_SENSITIVITY','SHAKE_LENGTH'])assert.ok(Number.isInteger(manifest.pebble.messageKeys[key]));
assert.equal(new Set(Object.values(manifest.pebble.messageKeys)).size,Object.keys(manifest.pebble.messageKeys).length);
assert.ok(manifest.pebble.usesPermissions.some(p=>p.name==='UniversalTtsSpeak'&&p.plugin==='2c5edc42-b096-4f76-b284-1f27907e6502'));
assert.match(js,/messageKey": "DEFAULT_VIEW"/);
assert.match(js,/messageKey": "SHAKE_ACTION"/);
assert.match(js,/'SHAKE_ACTION': parseInt\(settings.SHAKE_ACTION, 10\) \|\| 0/);
assert.match(js,/ttsClient\.handleMessage\(e.payload\)/);
assert.match(js,/e.payload.COMMAND === 'SPEAK_REQUEST'/);
assert.match(c,/PERSIST_KEY_SHAKE_ACTION 34/);
assert.match(c,/s_shake_action = \(action >= 0 && action <= 3\) \? action : 0/);
assert.match(c,/if \(s_shake_action == 0 \|\| s_shake_action == 3\)[\s\S]*?execute_panel_transition\(true\)/);
assert.match(c,/else if \(s_shake_action == 1\)[\s\S]*?speak_local_time\(\)/);
assert.match(c,/universal_tts_handle_message\(iter\)/);
assert.match(c,/app_message_open\(4096, 512\)/);
for(const f of ['src/c/universal_tts.c','src/c/universal_tts.h','src/pkjs/universal_tts.js'])assert.ok(fs.existsSync(f),f);
console.log('Shake action / Universal TTS integration checks passed');

assert.match(js,/"type": "slider", "messageKey": "SHAKE_SENSITIVITY"/);
assert.match(js,/"min": 100, "max": 500, "step": 10/);
assert.match(js,/normalizeShakeThreshold\(settings.SHAKE_SENSITIVITY\)/);
assert.match(c,/value == 0 \? 460 : \(value == 1 \? 290 : 160\)/);
assert.match(c,/value >= 100 && value <= 500/);
assert.match(js,/messageKey": "SHAKE_LENGTH"/);
assert.match(js,/'SHAKE_SENSITIVITY': normalizeShakeThreshold\(settings.SHAKE_SENSITIVITY\)/);
assert.match(js,/'SHAKE_LENGTH':/);
assert.match(c,/accel_data_service_subscribe\(5, shake_data_handler\)/);
assert.match(c,/accel_service_set_sampling_rate\(ACCEL_SAMPLING_25HZ\)/);
assert.match(c,/s_shake_length == 2 \? 700/);
assert.match(c,/return s_shake_sensitivity;/);
assert.match(c,/shake_data_handler\(AccelData \*data, uint32_t count\)/);

// Regression: the watch must accept calendar action 3 in BOTH load and
// live settings paths. Previously the inbox silently reset it to action 0.
const cases=Array.from(c.matchAll(/s_shake_action = \(action >= 0 && action <= 3\) \? action : 0/g));
assert.equal(cases.length,2,'Persisted and incoming shake action must accept 3');
assert.match(c,/s_panel_override = s_shake_action == 3 \? 2 : -1/);
assert.match(c,/if \(s_shake_action == 0 \|\| s_shake_action == 3\)/);
assert.match(c,/update_shake_subscription\(void\)/);
assert.match(c,/return s_shake_sensitivity >= 400 \? 3 : 2/);
assert.match(c,/s_shake_length == 2 \? 700 : \(s_shake_length == 1 \? 350 : 100\)/);
assert.doesNotMatch(c,/accel_tap_service_subscribe\(/,'No tap-gated gesture detector');
assert.doesNotMatch(c,/s_shake_timeout_timer/,'No tap-gated two-second window');
console.log('Calendar action 3 and independent gentle-flick sensitivity regression checks passed');

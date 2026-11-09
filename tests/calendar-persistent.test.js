// Persistent calendar lead-time, settings visibility, and watch takeover regression tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js','utf8');
const native = fs.readFileSync('src/c/main.c','utf8');
const manifest = require('../package.json');
const customClay = require('../src/pkjs/custom-clay');
assert.equal(manifest.version, '2.4.1');
assert.equal(manifest.pebble.messageKeys.PERSISTENT_CALENDAR_ENABLE,43);
assert.equal(manifest.pebble.messageKeys.PERSISTENT_CALENDAR_MINUTES,44);

// Configuration values must be the six supported 5-minute increments.
const prefix = source.slice(source.indexOf('var clayConfig ='), source.indexOf('var clay ='));
const config = vm.runInNewContext(prefix + '\nclayConfig', {});
const items = config.reduce((a,x)=>a.concat(x.items||[]), []);
const toggle = items.find(x=>x.messageKey === 'PERSISTENT_CALENDAR_ENABLE');
const lead = items.find(x=>x.messageKey === 'PERSISTENT_CALENDAR_MINUTES');
assert.equal(toggle.type, 'toggle');
assert.equal(toggle.defaultValue, false);
assert.equal(lead.type, 'select');
assert.equal(lead.defaultValue, '15');
assert.deepEqual(Array.from(lead.options, x=>Number(x.value)),[5,10,15,20,25,30]);

// The dropdown hides immediately when disabled and responds while editing.
let enabled = false, visible = null, onChange;
const fakeToggle = {get:()=>enabled,on:(name,fn)=>{if(name==='change')onChange=fn;}};
const fakeLead = {hide:()=>{visible=false;},show:()=>{visible=true;}};
const buildEvents={};
const page = {
  EVENTS:{AFTER_BUILD:'after_build'},
  on:(name,cb)=>{buildEvents[name]=cb;},
  getItemByMessageKey:key=>key==='PERSISTENT_CALENDAR_ENABLE'?fakeToggle:
    key==='PERSISTENT_CALENDAR_MINUTES'?fakeLead:null
};
customClay.call(page);
buildEvents.after_build();
assert.equal(visible,false);
assert.equal(typeof onChange,'function');
enabled=true;onChange();assert.equal(visible,true);
enabled=false;onChange();assert.equal(visible,false);

// The selected calendar filter remains the one used by the existing next-event
// feed; no independent / conflicting filter should be introduced.
assert.match(source, /var filter=String\(readSettings\(\).CALENDAR_FILTER\|\|'__all__'\)/);
assert.match(source, /'PERSISTENT_CALENDAR_ENABLE': settingEnabled\(settings.PERSISTENT_CALENDAR_ENABLE, false\) \? 1 : 0/);
assert.match(source, /'PERSISTENT_CALENDAR_MINUTES': persistentCalendarMinutes\(settings.PERSISTENT_CALENDAR_MINUTES\)/);

// Countdown takeover must start strictly before the event and no earlier than
// the configured lead time. Remaining visible after start would be a regression.
assert.match(native, /static bool calendar_takeover_due_at\(time_t now\)/);
assert.match(native, /seconds > 0 && seconds <= s_persistent_calendar_minutes \* 60/);
assert.match(native, /uint32_t next_transition = remaining > lead_seconds/);
assert.match(native, /\(desired_transition - \(uint32_t\)now\) \* 1000/);
assert.match(native, /next_transition > 0 && next_transition <= 1800/);
assert.match(native, /update_persistent_calendar\(\);\s*update_calendar_countdown\(\);/);
assert.match(native, /int target = s_calendar_takeover_active \? 2 :/);
assert.match(native, /&& !s_calendar_takeover_active\)/);
assert.match(native, /if \(!s_shake_test_panel \|\| s_calendar_takeover_active\) return;/);
assert.match(native, /persist_write_bool\(PERSIST_KEY_PERSISTENT_CALENDAR, s_persistent_calendar_enabled\)/);
assert.match(native, /persist_write_int\(PERSIST_KEY_PERSISTENT_CALENDAR_MINUTES, s_persistent_calendar_minutes\)/);
assert.match(native, /if \(minutes >= 5 && minutes <= 30 && minutes % 5 == 0\)/);

// Reference decision table for boundaries (watch performs same integer math).
function due(now,start,enabled,minutes,status=1) {
  const seconds = start-now;
  return Boolean(enabled && status===1 && start>0 && seconds>0 && seconds<=minutes*60);
}
const event = 1_800_000_000;
assert.equal(due(event-901,event,true,15),false,'More than fifteen minutes away');
assert.equal(due(event-900,event,true,15),true,'At lead boundary');
assert.equal(due(event-1,event,true,15),true,'Last second before event');
assert.equal(due(event,event,true,15),false,'At event start');
assert.equal(due(event+1,event,true,15),false,'After event start');
assert.equal(due(event-600,event,false,15),false,'Toggle disabled');
assert.equal(due(event-600,event,true,15,0),false,'Empty calendar');
assert.equal(due(event-600,event,true,15,2),false,'Unavailable calendar');
assert.equal(due(event-1800,event,true,30),true,'Thirty-minute window');
assert.equal(due(event-1800,event,true,5),false,'Five-minute window');
console.log('Persistent calendar timing, settings visibility, and panel priority checks passed');

assert.match(source, /CALENDAR_READ_INTERVAL_MS = 60 \* 60 \* 1000/);
assert.match(source, /if \(!calendarFeaturesEnabled\(\)\) \{/);
assert.match(source, /stopCalendarSource\(\); \/\/ do not retain an always-active calendar subscription/);
assert.match(source, /calendarTimer=setInterval/);
assert.match(source, /if \(sig === calendarLastSent\) return/);

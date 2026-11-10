// Event handoff: 15 minutes after start, advance from cached calendar data,
// never start a new native Calendar source read solely to satisfy a wrist shake.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const c=fs.readFileSync('src/c/main.c','utf8');
const src=fs.readFileSync('src/pkjs/index.js','utf8');
const manifest=require('../package.json');
assert.equal(manifest.version,'2.4.4');
assert.equal(manifest.pebble.messageKeys.REQUEST_NEXT_EVENT,48);
assert.match(c,/static void request_calendar_handoff\(void\)/);
assert.match(c,/\(int64_t\)now - \(int64_t\)s_calendar_start < 15 \* 60/);
assert.match(c,/s_calendar_handoff_requested_start == s_calendar_start/);
assert.match(c,/dict_write_uint8\(iter, MESSAGE_KEY_REQUEST_NEXT_EVENT, 1\)/);
assert.match(c,/request_calendar_handoff\(\);\s*update_calendar_countdown\(\);/);
assert.match(c,/s_calendar_handoff_requested_start = 0; \/\/ retry a missed handoff on reconnect/);
assert.match(c,/Waiting for update/);
assert.match(src,/if \(e\.payload\.REQUEST_NEXT_EVENT !== undefined\) \{[\s\S]*?sendNextCalendarEvent\(false\);[\s\S]*?return;/);
// Run actual phone calendar adapter against a cached source snapshot.
const begin=src.indexOf('var calendarSubscription = null;');
const end=src.indexOf('var ttsClient = null;',begin);
assert.ok(begin>0&&end>begin);
const now=Date.now();
const settings={DEFAULT_VIEW:'0',SHAKE_ACTION:'3',CALENDAR_FILTER:'__all__'};
let messages=[],sourceReads=0,onData;
const storage={};
const context={
 console:{log(){}},Date,Math,JSON,Number,isFinite,parseInt,
 localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},
 readSettings:()=>settings,
 settingEnabled:(v,defaultValue)=>v==null?defaultValue:Boolean(v),
 Pebble:{
  sendAppMessage:(msg,success)=>{messages.push(msg);if(success)success();},
  subscribeToSource:args=>{sourceReads++;onData=args.onData;return {unsubscribe(){}}}
 },
 setInterval:()=>1,clearInterval:()=>{},
 Clay:function(config){this.config=config;},customClay:function(){},
 clayConfig:[{items:[{messageKey:'CALENDAR_FILTER',options:[]}]}]
};
vm.createContext(context);
vm.runInContext(src.slice(begin,end),context);
context.startCalendarSource();
assert.equal(sourceReads,1);
const prop=s=>({shortText:{text:s}});
const stamp=ms=>({timestamp:{value:Math.floor(ms/1000)}});
onData({instances:[
 {properties:{title:prop('Started meeting'),starts_at:stamp(now-16*60000),calendar:prop('Work')}},
 {properties:{title:prop('Next meeting'),starts_at:stamp(now+24*60000),calendar:prop('Work')}},
 {properties:{title:prop('Tomorrow'),starts_at:stamp(now+24*3600000),calendar:prop('Work')}}
]});
assert.equal(messages.at(-1).NEXT_EVENT_TITLE,'Next meeting');
const prior=messages.length;
context.sendNextCalendarEvent(false); // handoff uses same cached snapshot
assert.equal(messages.length,prior,'identical next event must not be resent');
assert.equal(sourceReads,1,'handoff must not re-open Calendar plugin');
settings.CALENDAR_FILTER='Personal';context.sendNextCalendarEvent(false);
assert.equal(messages.at(-1).NEXT_EVENT_STATUS,0);
assert.equal(messages.at(-1).NEXT_EVENT_TITLE,'');
settings.DEFAULT_VIEW='0';settings.SHAKE_ACTION='2';
const quiet=messages.length;
context.sendNextCalendarEvent(false);
assert.equal(messages.length,quiet,'disabled calendar must send nothing');
console.log('Event +15-minute handoff and cached next-event tests passed');

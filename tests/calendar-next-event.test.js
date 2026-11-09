const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/pkjs/index.js','utf8');
const c=fs.readFileSync('src/c/main.c','utf8');
const manifest=require('../package.json');
assert.equal(manifest.version,'2.3.4');
for(const k of ['NEXT_EVENT_TITLE','NEXT_EVENT_START','NEXT_EVENT_STATUS','CALENDAR_FILTER'])assert.ok(Number.isInteger(manifest.pebble.messageKeys[k]),k);
assert.ok(manifest.pebble.usesPermissions.includes('Calendar'),'native Calendar permission');
assert.match(source,/category:'calendar',item:'event'/);
assert.match(source,/messageKey": "CALENDAR_FILTER"/);
assert.match(source,/Show Next Calendar Event \(7 seconds\)/);
assert.match(c,/s_default_view == 2 \? 126 : 222/);
assert.match(c,/MESSAGE_KEY_NEXT_EVENT_START/);
assert.match(c,/update_calendar_countdown\(void\)/);
const start=source.indexOf('var calendarSubscription = null;');
const end=source.indexOf('var ttsClient = null;',start);
assert.ok(start>=0&&end>start,'calendar adapter bounds');
let settings={CALENDAR_FILTER:'__all__'};
let names=[];
let sent=[];
let onData;
let storage={};
const ctx={
 console:{log(){}},Date,Math,JSON,Number,isFinite,parseInt,
 localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v;}},
 readSettings:()=>settings,
 Pebble:{
  sendAppMessage:(m,ok)=>{sent.push(m);if(ok)ok();},
  subscribeToSource:args=>{onData=args.onData;return {unsubscribe(){}};}
 },
 Clay:function(config){this.config=config;},
 customClay:function(){},
 clayConfig:[{items:[{messageKey:'CALENDAR_FILTER',options:[]}]}],
 setInterval:()=>1
};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
ctx.startCalendarSource();
assert.equal(typeof onData,'function');
function prop(text){return {shortText:{text}};}
function stamp(n){return {timestamp:{value:n}};}
let future=Math.floor(Date.now()/1000)+1800;
onData({instances:[
 {properties:{title:prop('Personal appointment'),starts_at:stamp(future+1200),calendar:prop('Personal')}},
 {properties:{title:prop('Work meeting'),starts_at:stamp(future),calendar:prop('Work')}}
]});
assert.equal(sent.at(-1).NEXT_EVENT_TITLE,'Work meeting');
assert.equal(sent.at(-1).NEXT_EVENT_STATUS,1);
assert.deepEqual(Array.from(ctx.calendarNames()),['Personal','Work']);
settings.CALENDAR_FILTER='Personal';
ctx.sendNextCalendarEvent(true);
assert.equal(sent.at(-1).NEXT_EVENT_TITLE,'Personal appointment');
ctx.updateCalendarSelectOptions();
assert.deepEqual(Array.from(ctx.clayConfig[0].items[0].options.map(x=>x.label)),['All Calendars','Personal','Work']);
settings.CALENDAR_FILTER='Unreported';
ctx.sendNextCalendarEvent(true);
assert.equal(sent.at(-1).NEXT_EVENT_STATUS,0);
onData({instances:[{properties:{title:prop('Invalid')}}]});
assert.equal(ctx.calendarEvents.length,2,'invalid source cannot erase events');
console.log('Calendar event selection, source filtering, and discovered dropdown tests passed');

// Moon Image uses astronomical phase, not illumination alone:
// waxing and waning crescents differ even at identical illumination.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const catalog=require('../src/pkjs/corner-catalog');
const source=fs.readFileSync('src/c/corner_render.inc','utf8');
const main=fs.readFileSync('src/c/main.c','utf8');
const clock=Date.UTC(2000,0,6,18,14,0)/1000;
const cycle=2551443;
const phase=(time)=>Math.floor(((((Math.trunc(time)-clock)%cycle)+cycle)%cycle)*1000/cycle);
const illumination=p=>Math.round(50*(1-Math.cos(2*Math.PI*p/1000)));
assert.ok(catalog.groups.astronomy.some(e=>e[0]===77&&e[1]==='Moon image'),
  'Image-only moon option is exposed under Sun & Moon');
assert.ok(catalog.groups.astronomy.some(e=>e[0]===76&&/Moon image \+ illumination/.test(e[1])),
  'Existing Moon image + illumination option remains separately selectable');
assert.equal(new Set(Object.values(catalog.groups).flat().map(e=>e[0])).size,
  Object.values(catalog.groups).flat().length,'Stable complication IDs stay unique');
assert.equal(catalog.chosenMetric({CORNER_BR_GROUP:'astronomy',
  CORNER_BR_ASTRONOMY:'76'},'BR'),76);
assert.equal(catalog.chosenMetric({CORNER_BR_GROUP:'astronomy',
  CORNER_BR_ASTRONOMY:'77'},'BR'),77);
assert.equal(phase(clock),0);
assert.equal(phase(clock+cycle/4),249);
assert.equal(phase(clock+cycle/2),499);
assert.ok(illumination(phase(clock))<=1);
assert.ok(illumination(phase(clock+cycle/4))>=49);
assert.ok(illumination(phase(clock+cycle/2))>=99);
assert.ok(illumination(250)===illumination(750),
  'Same illumination can occur on waxing and waning moons');
assert.match(source,/static int moon_cycle_thousandths\(time_t utc\)/);
assert.match(source,/static int moon_illumination\(int phase\)/);
assert.match(source,/static void corner_moon_image\(GContext \*ctx,GRect b,time_t now,bool show_percent\)/);
assert.match(source,/if\(metric==76\|\|metric==77\)\{corner_moon_image\(ctx,b,now,metric==76\);return;\}/);
assert.match(source,/int radius=show_percent\?\(b.size.h-24\)\/2:\(b.size.h-8\)\/2;/,
 'Image-only uses more of the available corner than image plus percentage');
assert.doesNotMatch(source,/corner_text\(ctx,"MOON"/,
 'Neither graphical moon option prints a redundant MOON label');
assert.match(source,/if\(show_percent\) \{[\s\S]*?snprintf\(text,sizeof\(text\),"%d%%",illumination\)/,
 'Only percent variant prints illumination');
assert.match(source,/if\(phase<500\)[\s\S]*?left=center\.x\+terminate;[\s\S]*?right=center\.x\+half;[\s\S]*?else \{[\s\S]*?left=center\.x-half;[\s\S]*?right=center\.x-terminate;/,
  'Waxing illuminates right side; waning illuminates left side');

assert.match(source,/graphics_draw_circle\(ctx,center,radius\)/);
assert.match(source,/moon_illumination\(phase\)/);
assert.match(source,/case 74:case 75:/,'Existing phase and illumination options remain');
assert.match(main,/if\(s_corner_mode\)corner_redraw\(\);/,
  'Moon phase refreshes from clock ticks without phone traffic');
assert.ok(!require('../src/pkjs/weather-push').watchedKeys({
  CORNER_TL_GROUP:'astronomy',CORNER_TL_ASTRONOMY:'76',
  CORNER_TR_GROUP:'health',CORNER_TR_HEALTH:'32',
  CORNER_BL_GROUP:'health',CORNER_BL_HEALTH:'32',
  CORNER_BR_GROUP:'health',CORNER_BR_HEALTH:'32',
  CENTER_VIEW:1,SHAKE_ACTION:'2'
},catalog).includes('WX_SUNRISE'),
'Moon image does not require Weather+ subscription');
console.log('Moon-phase image, waxing/waning orientation, illuminated fraction, source independence passed');

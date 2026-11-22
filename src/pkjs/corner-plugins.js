// Read-only complication adapter for the Pebble plugin preview.
// Subscriptions exist only for selected plugin corners. No actions or credentials.
var active = [];
var generation = 0;
function cleanup() {
  generation++;
  active.forEach(function(s){if(s && typeof s.unsubscribe==='function')
    try{s.unsubscribe();}catch(e){}});
  active = [];
}
function catalogEntries(pebble) {
  if (!pebble || typeof pebble.enumeratePlugins !== 'function') return [];
  var list;
  try {
    list=pebble.enumeratePlugins();
    list=Array.isArray(list)?list:(list && (list.plugins||list.items||list.results))||[];
  } catch(e) {return [];}
  var options=[];
  list.forEach(function(plugin) {
    var uuid=typeof plugin==='string'?plugin:
      plugin&&(plugin.uuid||plugin.pluginUuid||plugin.appUuid||plugin.id||
      (plugin.manifest&&plugin.manifest.uuid));
    if(!uuid||!plugin||!Array.isArray(plugin.sources)) return;
    var name=plugin.displayName||plugin.name||String(uuid).slice(0,8);
    plugin.sources.forEach(function(source) {
      if(!source||!Array.isArray(source.items)||!source.properties)return;
      Object.keys(source.properties).forEach(function(key){
        var shapes=source.properties[key];
        if(!Array.isArray(shapes)||!shapes.some(function(s){
          return /^(numericValue|shortText|longText|boolean|timestamp)$/.test(s);
        }))return;
        source.items.forEach(function(item){
          options.push({label:String(name).slice(0,22)+' · '+
            String(item).slice(0,15)+' / '+String(key).slice(0,20),
            value:[uuid,source.category,item,key].join('|')});
        });
      });
    });
  });
  return options.slice(0,180);
}
function populatePluginOptions(pebble,config,settings) {
  var options=[{label:'Choose a published plugin field',value:''}].concat(catalogEntries(pebble));
  var section=config.filter(function(item){return item.type==='section';})
    .find(function(item){return item.items.some(function(x){return x.messageKey==='CORNER_TL_GROUP';});});
  if(!section)return;
  ['TL','TR','BL','BR'].forEach(function(slot){
    var selected=String(settings['CORNER_'+slot+'_PLUGIN']||'');
    var choices=options.slice();
    if(selected&&!choices.some(function(o){return o.value===selected;}))
      choices.push({label:'Previously chosen plugin (may be unavailable)',value:selected});
    var item=section.items.find(function(x){return x.messageKey==='CORNER_'+slot+'_PLUGIN';});
    if(item){item.options=choices;item.defaultValue=selected;}
  });
}
function textOf(property) {
  if(!property)return '--';
  if(property.shortText && property.shortText.text!=null) return String(property.shortText.text);
  if(property.numericValue && isFinite(Number(property.numericValue.value)))
    return String(property.numericValue.value)+(property.numericValue.unit||'');
  if(property.boolean && typeof property.boolean.value==='boolean')
    return property.boolean.value?'On':'Off';
  if(property.timestamp && Number(property.timestamp.value)>0)
    return new Date(Number(property.timestamp.value)*1000).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  if(property.longText && property.longText.text!=null) return String(property.longText.text);
  return '--';
}
function send(pebble,slot,name,value) {
  var d={};
  d['CORNER_'+slot+'_LABEL']=String(name||'PLUGIN').slice(0,19);
  d['CORNER_'+slot+'_VALUE']=String(value||'--').slice(0,23);
  pebble.sendAppMessage(d,function(){},function(e){
    console.log('KinetiCast: plugin complication delivery failed '+String(e));
  });
}
function subscribeReading(pebble,slot,spec,index,token) {
  if (!pebble || typeof pebble.subscribeToSource !== 'function' || !spec)return;
  var req={category:spec.category,item:spec.item,properties:[spec.property],
    limit:Math.min(40,Math.max(1,index+1)),
    onData:function(data){
      if(generation!==token)return;
      var entries=data&&data.instances||[];
      var picked=entries[index];
      if(!picked){send(pebble,slot,spec.property,'--');return;}
      var p=picked.properties||{};
      var displayName=p.name&&p.name.shortText&&p.name.shortText.text||spec.property;
      send(pebble,slot,displayName,textOf(p[spec.property]));
    },
    onError:function(e) {
      if(generation!==token)return;
      console.log('KinetiCast plugin source error: '+String(e&&e.code||e));
      send(pebble,slot,spec.property,'--');
    }};
  if(spec.uuid)req.plugin=spec.uuid;
  try {active.push(pebble.subscribeToSource(req));}
  catch(e){console.log('KinetiCast plugin subscribe failed: '+String(e));}
}
function parseSpec(text) {
  if(!text)return null;
  var parts=String(text).split('|');
  if(parts.length!==4||!parts[1]||!parts[2]||!parts[3])return null;
  return {uuid:parts[0],category:parts[1],item:parts[2],property:parts[3]};
}
function apply(pebble,settings,catalog) {
  cleanup();
  if(Number(settings.CORNER_MODE||0)!==1)return;
  var token=generation;
  var selected=catalog.slots.map(function(slot){
    return {slot:slot,metric:catalog.chosenMetric(settings,slot)};
  }).filter(function(x){return x.metric>=90&&x.metric<=95;});
  if(!selected.length)return;
  selected.filter(function(x){return x.metric===95;}).forEach(function(x) {
    var s=parseSpec(settings['CORNER_'+x.slot+'_PLUGIN']);
    var index=Number(settings['CORNER_'+x.slot+'_INDEX']||0);
    if(!isFinite(index)||index<0||index>20)index=0;
    if(s)subscribeReading(pebble,x.slot,s,index,token);
    else send(pebble,x.slot,'PLUGIN','Select source');
  });
  var favorites=selected.filter(function(x){return x.metric>=90&&x.metric<=94;});
  if(!favorites.length || typeof pebble.subscribeToSource!=='function')return;
  try {
    active.push(pebble.subscribeToSource({category:'preferences',item:'complications',
      onData:function(data){
        if(generation!==token)return;
        // New preferences replace subscriptions to their previous readings.
        // Keep the preferences subscription at index zero or in the active set.
        if(active.length>1){
          var roots=active.filter(function(s){return s&&s._kcPreferences;});
          // Some native subscription objects are not extensible, so avoid relying on tags.
          // Do not unsubscribe the preferences source during a resubscription.
        }
        favorites.forEach(function(x){
          var list=data&&data.instances||[];
          var pos=x.metric-90;
          var entry=list[pos]&&list[pos].properties;
          if(!entry){send(pebble,x.slot,'FAVORITE','--');return;}
          var str=function(k){return entry[k]&&entry[k].shortText&&entry[k].shortText.text||'';};
          var s={category:str('category'),item:str('item'),property:str('property')};
          var index=Number(entry.index&&entry.index.numericValue&&entry.index.numericValue.value)||0;
          if(s.category&&s.item&&s.property)
            subscribeReading(pebble,x.slot,s,index,token);
          else send(pebble,x.slot,'FAVORITE','--');
        });
      },
      onError:function(e){console.log('KinetiCast favorites unavailable '+String(e&&e.code||e));}
    }));
  }catch(e){console.log('KinetiCast preferences subscription failed '+String(e));}
}
module.exports={apply:apply,populatePluginOptions:populatePluginOptions,
  catalogEntries:catalogEntries,textOf:textOf,parseSpec:parseSpec,cleanup:cleanup};

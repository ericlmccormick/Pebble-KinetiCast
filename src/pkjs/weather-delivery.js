// Serialized, acknowledgement-based AppMessage weather transport.
// Comparing acknowledged displayed fields avoids duplicate Bluetooth traffic.
// Most recent data wins when the plugin updates during an in-flight send.
function create(pebble,helpers,options){
  options=options||{};
  var delivered={},pending=null,busy=false,retryTimer=null;
  var generation=0;
  function stopRetry(){
    if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
  }
  function reset(){
    generation++;
    stopRetry();
    delivered={};
    // An in-flight message might finish but must not corrupt new state.
    pending=null;
    busy=false;
  }
  function flush(){
    if(busy||!pending||retryTimer)return;
    var item=pending;
    pending=null;
    var chosen=helpers.pick(item.data,item.keys);
    var delta=helpers.changed(chosen,delivered,item.force);
    if(!Object.keys(delta).length){
      if(item.done)item.done(true,false);
      flush();
      return;
    }
    busy=true;
    var token=generation;
    pebble.sendAppMessage(delta,function(){
      if(token!==generation)return;
      busy=false;
      helpers.apply(delivered,delta);
      if(item.done)item.done(true,true);
      flush();
    },function(err){
      if(token!==generation)return;
      busy=false;
      if(item.done)item.done(false,false);
      // Keep the newest payload; retry without acknowledging failed values.
      if(!pending)pending={data:item.data,keys:item.keys,force:item.force,done:null};
      else pending.force=pending.force||item.force;
      if(options.onError)options.onError(err);
      if(!retryTimer)retryTimer=setTimeout(function(){
        retryTimer=null;
        flush();
      },2000);
    });
  }
  function submit(data,keys,force,done){
    if(!data||!keys||!keys.length){if(done)done(true,false);return;}
    if(pending&&pending.done)pending.done(true,false); // superseded snapshot
    pending={data:data,keys:keys,force:!!force||(pending&&pending.force),done:done||null};
    flush();
  }
  function snapshot(){return Object.assign({},delivered);}
  return {submit:submit,reset:reset,snapshot:snapshot};
}
module.exports={create:create};


var os = require("os");
const cloudgatePubSub = require('./cloudgate-pubsub.js');
var hostname = os.hostname();

/*
const WebSocket = require('ws');
var ws = null;
setTimeout(function(){
    ws = new WebSocket('ws://localhost:28570/ws');
    ws.on('open', function open() {
        //ws.send('Hey from client');
    });
    ws.on('message', function incoming(data) {
        //console.log("Msg received on client from gatemaster")
        //console.log(data);
    });

}, 1000);
*/

var localStats = {};
setInterval(function(){

    for (var key in localStats){
        var obj = { a: "MemIncr", k: key, v: localStats[key].total, c: localStats[key].context };
        delete localStats[key]; //clean local stats
        DoPost(obj); //send to master        
    }

}, 1000);

var parentPort, Worker, isMainThread, threadId;
threadId = 0;

try{
   parentPort = require('worker_threads').parentPort;
   Worker = require('worker_threads').Worker;
   isMainThread = require('worker_threads').isMainThread;
   threadId = require('worker_threads').threadId;
}
catch(ex){

}


var memory = {}
var localGlobalObjects = {};

module.exports = {
  getLocalObject: function(key){
      return localGlobalObjects[key];
  },
  setLocalObject: function(key, value){
      localGlobalObjects[key] = value;
  },
  setMemory: function(mem){
      //this is used for restoring the memory state from cold storage
      memory = mem;
  },
  getObject: function(key, context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //TODO: think about expires / refresh
    //console.log(memory[key]);
    //console.log("get " + context + "/" + key);
    if ( memory[context][key] != null ){
        //console.log("cached: " + key)
        //return JSON.parse(memory[key]); //JSON.parse is SUUUUPER slow, let's avoid it by storing objects pre parsed in memory!        
        return memory[context][key];         
    }
    else{
        return null;
    }
  },
  setObject: function(key, value, context, source) {

    if ( context == null ) {
        return;
    }

    //console.log("setObject key: " + key + " - context: " + context);
    
    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory
    memory[context][key] = value; 

    //console.log("set " + context + "/" + key);

    //TODO: pubsub update for other nodes
    //DO NOT PROPAGATE ResponseCache context!! Infinite loop prevention
    //DO NOT PROPAGATE EVENTS from pubsub origin!! Infinite loop prevention
    if ( context != "ResponseCache" && context != "LOCAL" && context != "LOCAL" && source == null ){
        var obj = {
            a: "MemSetObj",
            k: key,
            v: value,
            c: context
        };
        //parentPort.postMessage(obj);
        DoPost(obj);
    }

  },
  get: function(key, context) {
    
    if ( memory[context] == null ) { memory[context] = {}; }

    if ( memory[context][key] != null ){
        return memory[context][key];         
    }
    else{
        return null;
    }

  },
  set: function(key, value, context, source) {

    if ( context == null ) {
        return;
    }

    //console.log("set key: " + key + " - context: " + context + " - " + source);

    if ( memory[context] == null ) { memory[context] = {}; }


    
    ///////////////////FIFO CACHE////////////////////
    var maxCacheItemSize = 1048576 * 10; //10MB 
    
    var curSize = value.length;
    if ( curSize == null && value.content != null){
        curSize = value.content.byteLength;
        //console.log("bin size: " + curSize);
    }

    //console.log(key + " cache, size: " + curSize + " vs maxCacheItemSize: " + maxCacheItemSize );
    if ( curSize > maxCacheItemSize ) {
        //console.log(key + " skipped because too big for the cache, size: " + curSize + " vs maxCacheItemSize: " + maxCacheItemSize );
        //DO NOT STORE ITEMS ABOVE maxCacheItemSize
        return;
    }
    /////////////////////////////////////////////////
    
    

    //store in memory 
    memory[context][key] = value;  

    //DO NOT PROPAGATE ResponseCache context!! Infinite loop prevention
    //DO NOT PROPAGATE EVENTS from pubsub origin!! Infinite loop prevention
    if ( context != "ResponseCache" && context != "LOCAL" && context != "TEMP" && source == null ){
        var obj = {
            a: "MemSet",
            k: key,
            v: value,
            c: context
        };
        //parentPort.postMessage(obj);
        DoPost(obj);
    }

    //cleanup old ResponseCache entries if above the limit
    var nbMaxEntries = 1000; //max 1000 items keeped in the cache
    if ( context == "ResponseCache"){
        var keys = Object.keys(memory[context]);
        var nbKeys = keys.length;
        if (nbKeys > nbMaxEntries) {
            //console.log("LRU, deleting key 0: " + keys[0]);
            delete memory[context][ keys[0] ];
            //console.log("New count: " + Object.keys(memory[context]).length);
        }
    }
    
  },
  incr: function(key, addVal, context, source) {

    //console.log("set key: " + key + " - context: " + context);

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    if ( memory[context][key] == null ) { memory[context][key] = 0; }
    memory[context][key] += addVal; 

    //store in agregated stats synchronized once per seconde
    if ( context == "STATS" && source == null ){
        if ( localStats[key] != null ){
            localStats[key].total += addVal;
        }
        else{
            localStats[key] = {};
            localStats[key].total = addVal;
            localStats[key].context = context;
        }
    }
    
  },
  remove: function(key, context, source) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    delete memory[context][key];  

    //DO NOT PROPAGATE ResponseCache context!! Infinite loop prevention
    //DO NOT PROPAGATE EVENTS from pubsub origin!! Infinite loop prevention
    if ( context != "ResponseCache" && context != "LOCAL" && context != "TEMP" && source == null ){
        var obj = {
            a: "MemDel",
            k: key,
            c: context
        };
        //parentPort.postMessage(obj);
        DoPost(obj);
    }
    
  },
  clear: function(context, source) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    memory[context] = {}; 

    //DO NOT PROPAGATE ResponseCache context!! Infinite loop prevention
    //DO NOT PROPAGATE EVENTS from pubsub origin!! Infinite loop prevention
    if ( context != "ResponseCache" && context != "LOCAL" && context != "TEMP" && source == null ){
        var obj = {
            a: "MemClear",
            c: context
        };
        DoPost(obj);        
    }
    
  },
  debug: function(context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //console.log(memory);
    return memory;
    
  },
  Post: function(obj) {
    DoPost(obj)
  }
}


function DoPost(obj){
    
    //POST to Master thread for local replication in all threads
    if ( parentPort != null ){
        parentPort.postMessage(obj);
    }

    //POST TO GateMaster for global replication in all nodes
    obj.source = hostname;
    cloudgatePubSub.postToServer(obj);
    //console.log("Worker Posting " + obj.a + "/" + obj.k + " to GateMaster");
    
}
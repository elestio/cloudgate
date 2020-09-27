#!/usr/bin/env node

//const { Worker, isMainThread, threadId } = require('worker_threads');

//Handle multithreading (require node 12+), single thread mode stay compatible with node 10
var Worker, isMainThread, threadId;
threadId = 0;

try{
   Worker = require('worker_threads').Worker;
   isMainThread = require('worker_threads').isMainThread;
   threadId = require('worker_threads').threadId;
}
catch(ex){
    //worker_threads not supported, fallback to single thread mode
    const main = require('./main.js');
}

if ( Worker == null ){
    //multithreading not supported, stop execution here
    return;
}

const fs = require('fs');
const path = require('path')

const resolve = require('path').resolve;
const os = require('os');
const tools = require('./lib/tools.js');
const memory = require('./modules/memory');
const cloudgatePubSub = require('./modules/cloudgate-pubsub.js');
var shell = require('shelljs');
const { v4: uuidv4 } = require('uuid')

var argv = require('optimist')(process.argv)
.boolean('cors')
.boolean('log-ip')
.argv;


tools.ProcessCommandLine(argv);
if (argv.create || argv.load || argv.unload || argv.list)
{
    return;
}

var nbThreads = os.cpus().length;
var paramCores = argv.cores || argv.c;
if ( paramCores != "" && paramCores != null ){
    var nbCores = parseInt(paramCores);
    if (!isNaN(nbCores) && nbCores > 0){
        nbThreads = parseInt(paramCores);
    }
}

if ( process.env.THREADS ){
    if (!isNaN(process.env.THREADS) && process.env.THREADS > 0){
        nbThreads = parseInt(process.env.THREADS);
    }
}


//load config file Settings
if (isMainThread) {
    
    if ( argv.memstate != null && argv.memstate != ""){
        var memoryPath = argv.memstate;
        
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
        }
    }

    //Importance order: ENV > ARGS > Conf
    if ( process.env.THREADS == null || process.env.THREADS == "") {
        if ( paramCores == "" || paramCores == null ) {
            if ( memory.get("THREADS", "SETTINGS") != null && memory.get("THREADS", "SETTINGS") != "" ) {
                nbThreads = parseInt(memory.get("THREADS", "SETTINGS"));
            }
        }   
    }

    if ( process.env.APP_ROOT == null || process.env.APP_ROOT == "") {
        var paramAppRoot = argv.r || argv.rootfolder;
        if ( paramAppRoot == "" || paramAppRoot == null ) {
            if ( memory.get("APP_ROOT", "SETTINGS") != null && memory.get("APP_ROOT", "SETTINGS") != "" ) {
                argv.r = memory.get("APP_ROOT", "SETTINGS");
            }
        }   
    }
}


if ( isMainThread ){

    var appPath = argv["_"][2];
    if ( appPath == null ){
        appPath = __dirname;
    }
    //console.log(appPath)

    //if no root path is passed, let's build it based on provided app Path
    if ( argv.r == null) {       
        
        if ( !appPath.startsWith("/") ){
            argv.r = require("path").join(__dirname, appPath);
        }
        else{
            //argv.r = appPath;
            argv.r = "./";
        }
        
        process.argv.push("-r");
        process.argv.push( resolve(argv.r) );
    }

    //console.log("Root: " + __dirname);   
    //console.log("Root2: " + argv.r);   
    //console.log(process.argv);   
    
}

//change root dir (for code loading in nodejs, require, ...)
if (process.env.NODE_ROOT){
    process.chdir(process.env.NODE_ROOT);
}
/*else if ( argv.rootfolder != null && argv.rootfolder != ""){
    process.chdir( resolve(argv.rootfolder) );
    //console.log("changing curDIR to: " + argv.rootfolder);
}*/
else if ( argv.r != null && argv.r != "" && !argv.r.startsWith("/snapshot")){
    //console.log("changing curDIR to: " + argv.r);
    process.chdir(argv.r);
}

//console.log("Current Working Directory: " + process.cwd());







//try to implement memory cache only in the master thread and childrens asking data to the master
//https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/threads.md

//Export a function that queues pending work.
/*
const queue = [];
exports.asyncQuery = (sql, ...parameters) => {
  return new Promise((resolve, reject) => {
    queue.push({
      resolve,
      reject,
      message: { sql, parameters },
    });
  });
};
*/


var workersList = [];
if (isMainThread) {
    /* Main thread loops over all CPUs */
    process.argv.push("--nbThreads");
    process.argv.push(nbThreads);

    for ( var i = 0; i < nbThreads; i++ ){
        /* Spawn a new thread running this source file */
        var worker = new Worker(__filename);

        worker.on('message', HandleMessage);
        worker.on('error', HandleError);
        worker.on('exit', (code) => {
            if (code !== 0)
            console.log(`Worker stopped with exit code ${code}`);
        });
       

        var obj = { argv: process.argv };
        worker.postMessage(obj);

        //obj = { display: "test123" };
        //worker.postMessage(obj);

        workersList.push(worker);      
    }
}
else
{
    //console.log(process.argv);
    const main = require('./main.js');
}

var globalStats = {};
function HandleMessage(msg){
    
    //this is in the MASTER thread
    
    //console.log("msg received from a child worker");
    //console.log(msg);

    /*
    if ( msg.source != os.hostname() && msg.source != null){
        for (var i = 0; i<workersList.length; i++){
            workersList[i].postMessage(msg);
            //console.log("propagated without change: ");
            //console.log(msg);
        }
        return;
    }
    */

    if ( msg.a == 'MemIncr') {
        var obj = msg;
        if ( globalStats[msg.k] != null ){
            globalStats[msg.k].total += obj.v;
        }
        else{
            globalStats[msg.k] = {};
            globalStats[msg.k].total = obj.v;
            globalStats[msg.k].context = obj.c;
        }

        var newObj = { a: 'MemSet', k: obj.k, v: globalStats[msg.k].total, c: obj.c };
        for (var i = 0; i<workersList.length; i++){
            workersList[i].postMessage(newObj);
        }
        
    }
    else {
        for (var i = 0; i<workersList.length; i++){
            workersList[i].postMessage(msg);
            //console.log("propagated without change: ");
            //console.log(msg);
        }
    }

}

function HandleError(err){
    console.log("err received from a child worker");
    console.log(err);
}


function ExecuteQuery(cpool, query) {
  return new Promise(function(resolve, reject) {

      cpool.query(query, function(error, results, fields) {
          if (error) {
              resolve(error);
          }
          else{
              resolve(results);
          }
      });
  });
}
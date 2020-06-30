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

const os = require('os');
const memory = require('./modules/memory');
const cloudgatePubSub = require('./modules/cloudgate-pubsub.js');

var argv = require('optimist')(process.argv)
.boolean('cors')
.boolean('log-ip')
.argv;


//help
if (argv.h || argv.help) {
    console.log([
        '',
        'USAGE: cloudgate [path] [options]',
        '',
        '[GENERAL]',
        '  -r --rootfolder [path] root folder for your app',
        '  -c --cores [nbCores]    Number of CPU cores to use (default: ALL cores), Eg.: --cores 4',
        '  -p --port [port]    Port to use [8080]',
        '  -h --help          Print this list and exit.',
        '  -v --version       Print the version and exit.',
        '  -w --watch   Activate file change watch to auto invalidate cache [default: disabled]',
        '  -d --debug    Activate the console logs for debugging',
        //'  -a           Address to use [0.0.0.0]', //when used we can't get the visitor ip!
        '',
        '[SSL]',
        '  -S --ssl     Enable https.',
        '  --sslport    SSL Port (default: 443)',
        '  --ssldomain  Domain name on which you want to activate ssl (eg: test.com)',
        '  --sslcert  optional path to your SSL cert. E.g: /etc/letsencrypt/live/yourdomain.com/cert.pem',
        '  --sslkey  optional path to your SSL key. E.g: /etc/letsencrypt/live/yourdomain.com/privkey.pem',
        '',
        '[ADMIN]',
        '  --admin 1    Enable Admin Remote API (default: disabled)',
        '  --adminpath /cgadmin    Declare the virtual path of the admin api',
        '  --admintoken XXXXXXXX    The admin token to use for authentication of the REST API & Websocket',
        '',
        '[CLUSTER]',
        '  --master     Declare this host as the master',
        '  --salve [Master IP or Domain]:[Port]@[Token]     Declare this host as a slave connecting to a master'
        //'  -C --cert    Path to ssl cert file (default: cert.pem).',
        //'  -K --key     Path to ssl key file (default: key.pem).',

    ].join('\n'));
    
    process.exit();
}


//change root dir (for code loading in nodejs, require, ...)
if (process.env.NODE_ROOT){
    process.chdir(process.env.NODE_ROOT);
}
else if ( argv.rootfolder != null && argv.rootfolder != ""){
    process.chdir(argv.rootfolder);
}
else if ( argv.r != null && argv.r != ""){
    process.chdir(argv.r);
}

//console.log("Current Working Directory: " + process.cwd());


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

//console.log(nbThreads);

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
    const main = require('./main.js'); //HERE we should pass ARGS!!
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
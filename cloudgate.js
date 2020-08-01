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
        '  --memstate [path] path pointing to your memorystate.json, optional',
        '  -r --rootfolder [path] root folder for your app',
        '  -c --cores [nbCores]    Number of CPU cores to use (default: ALL cores), Eg.: --cores 4',
        '  -p --port [port]    Port to use [8080]',
        '  -oc --outputcache [0 or 1] Default is 0, disabled. When enabled this will cache all GET requests until file is changed on disk.',
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
        '  --salve [Master IP or Domain]:[Port]@[Token]     Declare this host as a slave connecting to a master',
        //'  -C --cert    Path to ssl cert file (default: cert.pem).',
        //'  -K --key     Path to ssl key file (default: key.pem).',
        '',
        '[APPS]',
        '--list               Return an array of loaded apps path',
        '--load     [path]    Load the app located in the target path, the folder must contain appconfig.json',
        '--unload   [path]    Unload the app located in the target path',
        '--create   [path]    Create a new app based on a template in the target path'

    ].join('\n'));
    
    process.exit();
}

if (argv.create) {
    
    var targetPath = argv.create;
    //check if the folder exist to avoid accidental overwrite
    if (fs.existsSync(targetPath) && !(tools.isDirEmpty(targetPath))) {
        console.log("This folder already exist and contains files, to avoid overwriting please provide a new path to be created");
        process.exit();
    }

    if (targetPath == true) {
        console.log("You must provide a target path where your new app will be created");
        process.exit();
    }

    //convert to absolute path
    targetPath = resolve(targetPath);

    //create the new folder
    console.log("Creating folder: " + targetPath);
    shell.mkdir('-p', targetPath);

    //ask the user which template to use    
    var templates = tools.GetDirectoriesArray("./apps/");

    //prompt the user to select a template
    (async () => {
        var promptMSG = `Select a template: `;
        for (var i = 0; i < templates.length; i++){
            promptMSG += "\n" + i + ") " + templates[i];
        }
        promptMSG += "\nType your choice and press Enter\n";
        var resp = await tools.readLineAsync(promptMSG);
        
        var selectedTemplate = "";
        try{
            var choiceID = parseInt(resp);
            selectedTemplate = templates[choiceID];
            if ( selectedTemplate == null ){
                throw "Invalid_choice";
            }
        }
        catch(ex){
            console.log("Invalid choice selected, operation aborted");
            process.exit();
        }

        //Domain to listen to
        promptMSG = "Virtual host name, Eg: www.example.com, leave empty to catch all\n";
        var domain = await tools.readLineAsync(promptMSG);
        if ( domain == "" ){
            domain = "*";
        } 
        //console.log("Virtual host: " + resp);

        var reverseURL = "";
        if ( selectedTemplate == "ReverseProxy" ){
            promptMSG = "Url of your target service to reverse proxy, Eg: https://www.google.com/\n";
            reverseURL = await tools.readLineAsync(promptMSG);
            if ( reverseURL == "" ){
                reverseURL = "https://www.google.com/";
            } 
        }
        
        //copy template to target path
        shell.cp('-R', './apps/' + selectedTemplate + "/*", targetPath);
        console.log("Your new app have been created in path: " + targetPath);

        //change the domain in the appconfig.json
        tools.ReplaceInFile('["*"]', '["' + domain + '"]', targetPath + path.sep + "appconfig.json");

        //if we are using the reverse proxy template, set the reverse url
        if ( reverseURL != "" ){
            tools.ReplaceInFile('https://www.google.com/', reverseURL, targetPath + path.sep + "appconfig.json");
        }
        
        process.exit();
    })();
   
    return;
}

if (argv.load) {
    
    if ( !argv.memstate ){
        console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
        process.exit();
    }

    //Loading memorystate.json
    var memoryPath = argv.memstate;
    if (fs.existsSync(memoryPath)) {
        var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
        memory.setMemory(JSON.parse(memorySTR));
    }


    var appPath = resolve(argv.load);

    console.log("loading app: " + appPath);
    var loader = require("./loaders/app-loader.js");
    var result = loader.load(appPath);
    console.log(result);

    //Get a new memory dump
    var fullMemory = memory.debug();
    //delete response cache because it's huge and temporary
    delete fullMemory["ResponseCache"];
    delete fullMemory["STATS"];
    delete fullMemory["TEMP"];
    delete fullMemory["undefined"];
    //save to disk
    fs.writeFileSync(memoryPath, JSON.stringify(fullMemory, null, 4), 'utf-8');

    process.exit();
}

if (argv.unload) {
    
    if ( !argv.memstate ){
        console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
        process.exit();
    }

    //Loading memorystate.json
    var memoryPath = argv.memstate;
    if (fs.existsSync(memoryPath)) {
        var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
        memory.setMemory(JSON.parse(memorySTR));
    }

    var appPath = resolve(argv.unload);

    console.log("unloading app: " + appPath);
    
    //find the target App in memory
    var mainMemory = memory.debug().GLOBAL;
    var list = Object.keys(mainMemory);
    var targetAppConfig = null;
    for (var i = 0; i < list.length; i++ ){
        var root = mainMemory[list[i]].root;
        if (root == appPath || root == appPath + "/"){
            targetAppConfig = mainMemory[list[i]];
            break;
        }
    }
    
    //clean appconfig cache
    if ( targetAppConfig != null ){
        for ( var i = 0; i < targetAppConfig.domains.length; i++){
            memory.remove(targetAppConfig.domains[i], "GLOBAL");
        }
        memory.remove(targetAppConfig.mainDomain, "GLOBAL");       
    }

    //Get a new memory dump
    var fullMemory = memory.debug();
    //delete response cache because it's huge and temporary
    delete fullMemory["ResponseCache"];
    delete fullMemory["STATS"];
    delete fullMemory["TEMP"];
    delete fullMemory["undefined"];
    //save to disk
    fs.writeFileSync(memoryPath, JSON.stringify(fullMemory, null, 4), 'utf-8');

    process.exit();
}

if (argv.list) {
    
    if ( !argv.memstate ){
        console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
        process.exit();
    }

    //Loading memorystate.json
    var memoryPath = argv.memstate;
    if (fs.existsSync(memoryPath)) {
        var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
        memory.setMemory(JSON.parse(memorySTR));
    }

    var mainMemory = memory.debug().GLOBAL;
    var list = Object.keys(mainMemory);
    var finalList = [];
    for (var i = 0; i < list.length; i++ ){
        if ( mainMemory[list[i]].root != null ){
            finalList.push(mainMemory[list[i]].root);
        }
    }
    console.log(finalList);

    process.exit();
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
        if ( appPath.startsWith(".") ){
            argv.r = require("path").join(__dirname, appPath);
        }
        else{
            argv.r = appPath;
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
else if ( argv.rootfolder != null && argv.rootfolder != ""){
    process.chdir( resolve(argv.rootfolder) );
    //console.log("changing curDIR to: " + argv.rootfolder);
}
else if ( argv.r != null && argv.r != ""){
    process.chdir(argv.r);
    //console.log("changing curDIR to: " + argv.r);
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
    for ( var i = 0; i < nbThreads; i++ ){
        /* Spawn a new thread running this source file */
        var worker = new Worker(__filename);

        worker.on('message', HandleMessage);
        worker.on('error', HandleError);
        worker.on('exit', (code) => {
            if (code !== 0)
            console.log(`Worker stopped with exit code ${code}`);
        });


        process.argv.push("--nbThreads");
        process.argv.push(nbThreads);
        

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
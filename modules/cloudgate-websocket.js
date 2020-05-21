const os = require('os');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const clearModule = require('clear-module');

const { v4: uuidv4 } = require('uuid')
const si = require('systeminformation');

const tools = require('../lib/tools.js');
const memory = require('../modules/memory');
const appLoader = require('../loaders/app-loader.js');
const cloudgatePubSub = require('../modules/cloudgate-pubsub.js');

var functionsCache = {};

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

module.exports = {
    name: "cloudgate-websocket",
    open: (appConfig, reqInfos, res, req, memory, msgBody, isBinary) => {
        return Executor(appConfig, reqInfos, res, req, memory, "open", msgBody, isBinary,
            function (event, ctx, callback){
                //console.log("open websocket");

                var serverConfig = memory.getObject("AdminConfig", "GLOBAL");

                var params = qs.parse(event.query);                
                if (params.token == serverConfig.admintoken){
                    
                    var resp = { body: "<b>CloudGate Remote Shell (Host: " + os.hostname() + ", Process: " + process.pid + ", ThreadID: " + threadId + ") </b>" };
                    SendRespObj(resp, res, memory);
                }
                else{
                    res.send("Unauthorized");
                    setTimeout(function(){
                        res.close();
                    }, 500);
                }

            }
        );
    },
    message: (appConfig, reqInfos, res, req, memory, msgBody, isBinary) => {
        return Executor(appConfig, reqInfos, res, req, memory, "message", msgBody, isBinary,
            async  function (event, ctx, callback){
                //console.log("msg websocket: " + event.body);

                var obj = null;
                try{
                    obj = JSON.parse( decodeURIComponent(event.body) );
                }
                catch(ex){
                                        
                    var errResp = {
                        action: "error",
                        origTS: obj.ts,
                        body: "INVALID MESSAGE: must be in json"
                    }
                    SendRespObj(resp, res, memory);

                    return;
                }

                if ( obj.body == "[HEARTBEAT]" ){
                    //ignore heartbeats, nothing to do here ...
                    return;
                }

                //echo the current message
                var resp = { action: "echo", body: "<b>" + obj.body + "</b>" };
                SendRespObj(resp, res, memory);
                
                var command = obj.body.split(' ')[0].toLowerCase();
                var origCommand = obj.body.split(' ')[0];

                if ( command == "/help" ){
                    resp = {
                        action: "help",
                        origTS: obj.ts,
                        body: ` <b>Displaying help instructions</b>
                        ⇒ /help - Display this list of commands
                        ⇒ /list - Display the list of apps running in memory
                        ⇒ /load [APP_PATH] - Load/Reload an app from disk
                        ⇒ /unload [APP_PATH] - remove a running app from memory, APP_PATH can also be set to * to clear everything
                        ⇒ /modules - Display the list of loaded modules
                        ⇒ /cache [KEY] - Display cache content, KEY is optional
                        ⇒ /clearcache - remove all output cache in memory
                        ⇒ /stats - Display global statistics about this node
                        ⇒ /info - Display cloudgate informations about this node
                        ⇒ /ex [command] - Execute a shell command on this node
                        ⇒ /js [command] - Execute a javascript command on this node (useful for debugging)
                        ⇒ /si - Display system informations about this node
                        ⇒ /cluster - Display informations about the cluster
                        ⇒ /create - form a new cluster with the current host as Master
                        ⇒ /join [Master IP or Domain]:[Port]@[Token] - join an existing cluster
                        ⇒ /leave - remove this node from the cluster`
                    }
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/join" ){

                    var command = obj.body.replace(origCommand, "");

                    if ( command == "") {
                        resp = { origTS: obj.ts, body: "1 argument is expected, you must indicate a command to execute" };
                        SendRespObj(resp, res, memory);
                        return;
                    }

                    var result = "";
                    try{

                        var masterEndpoint = command.split('@')[0];
                        var host = masterEndpoint.split(':')[0].trim();
                        var port = parseInt(masterEndpoint.split(':')[1]);
                        var token = command.split('@')[1];

                        memory.set("isMaster", false, "LOCAL");
                        //memory.set("Master", masterEndpoint, "CLUSTER"); //not needed, we should get this by replication

                        cloudgatePubSub.startClient(host, port, memory, token);
                        result = "Joining cluster " + masterEndpoint + " ...";
                    }
                    catch(ex){
                        result = ex.message;
                    }

                    resp = { origTS: obj.ts, body: JSON.stringify(result) };
                    SendRespObj(resp, res, memory);

                }
                else if (command == "/ex"){
                    
                    //console.log(obj.body);
                    var command = obj.body.replace(origCommand, "").trim().split(' ')[0];
                    var args = obj.body.replace("/ex ", "").replace(command + " ", "").replace(command, "").split(' ');
                    if ( args == null || args[0] == '' ) { args = []; }
                    //console.log(command);
                    //console.log(args);

                    try{
                        var child = require('child_process').spawn(command, args); 
                        child.stdout.setEncoding('utf8');
                        child.stdout.on('data', function(data) {
                            resp = { origTS: obj.ts, body: "<pre>" + data + "</pre>" };
                            SendRespObj(resp, res, memory);
                        });
                        child.stderr.on('data', function(data) {
                            //console.log(data);
                            resp = { origTS: obj.ts, body: "<pre>" + data + "</pre>" };
                            SendRespObj(resp, res, memory);
                        });
                        child.on('error', function(err) {
                            resp = { origTS: obj.ts, body: "<pre>" + err + "</pre>" };
                            SendRespObj(resp, res, memory);
                        });
                    }
                    catch(ex){
                        resp = { origTS: obj.ts, body: "<pre>" + ex.message + "</pre>" };
                        SendRespObj(resp, res, memory);
                    }
                    
                }
                else if ( command == "/js" ){

                    var command = obj.body.replace(origCommand, "");

                    if ( command == "") {
                        resp = { origTS: obj.ts, body: "1 argument is expected, you must indicate a command to execute" };
                        SendRespObj(resp, res, memory);
                        return;
                    }

                    var result = "";
                    try{
                        result = eval(command);
                    }
                    catch(ex){
                        result = ex.message;
                    }

                    resp = { origTS: obj.ts, body: JSON.stringify(result) };
                    SendRespObj(resp, res, memory);

                }
                else if ( command == "/clearcache" ){

                    var appPath = obj.body.replace(origCommand, "");
                    
                    //TODO: clear only the app reponse cache and not for the whole server and all apps!
                    memory.clear("ResponseCache");
                    
                    resp = { action: "clearcache", origTS: obj.ts,  body: "OK" };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/load" ){

                    var appPath = obj.body.replace(origCommand, "");

                    if ( appPath == "") {
                        resp = { origTS: obj.ts, body: "1 argument is expected, you must indicate appPath to load" };
                        SendRespObj(resp, res, memory);
                        return;
                    }

                    var fullPath = tools.safeJoinPath(__dirname, "../", appPath.replace("appconfig.json", ""));                    
                    clearModule.match( new RegExp("^" + fullPath) ); //clear from cache all code starting with the appPath
                    
                    //TODO: clear only the app reponse cache and not for the whole server and all apps!
                    memory.clear("ResponseCache");
                    
                    var result = appLoader.load(appPath);

                    resp = { action: "load", origTS: obj.ts,  body: result };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/unload" ){
                    var appPath = obj.body.replace(origCommand, ""); 

                    if ( appPath == "") {
                        resp = { origTS: obj.ts, body: "1 argument is expected, you must indicate the appPath to unload or * to unload everything" };
                        SendRespObj(resp, res, memory);
                        return;
                    }

                    var fullPath = tools.safeJoinPath(__dirname, "../", appPath.replace("appconfig.json", ""));
                    var resp = { action: "unload", origTS: obj.ts, body: "Clearing cache for: " + fullPath + "*" };
                    SendRespObj(resp, res, memory);

                    if (appPath == "*"){
                        clearModule.all();
                    }
                    else{
                        clearModule.match( new RegExp("^" + fullPath) );
                    }

                    //TODO: clear only the app reponse cache and not for the whole server and all apps!
                    memory.clear("ResponseCache");

                    

                    //find the target App in memory
                    var mainMemory = memory.debug().GLOBAL;
                    var list = Object.keys(mainMemory);
                    var targetAppConfig = null;
                    for (var i = 0; i < list.length; i++ ){
                        var root = mainMemory[list[i]].root;
                        if (root == appPath){
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
                        
                        //TODO: improve ResponseCache precision
                        memory.clear("ResponseCache");
                        
                        resp = { action: "unload", origTS: obj.ts,  body: "ResponseCache cleared for: " + appPath };
                        SendRespObj(resp, res, memory);
                    }

                    memory.set("mustSaveConfig", 1, "TEMP");
                    
                }
                else if ( command == "/cache" ){
                    var key = obj.body.replace(origCommand, "").trim();
                    if ( key != ""){
                        var resp = { action: "cache", origTS: obj.ts, body: JSON.stringify(memory.debug().GLOBAL[key]) };
                        SendRespObj(resp, res, memory);
                    }
                    else{
                        
                        var resp = { action: "cache", origTS: obj.ts, body: JSON.stringify(memory.debug().GLOBAL) };
                        SendRespObj(resp, res, memory);
                    }
                }
                else if ( command == "/stats" ){
                    
                    var resp = { action: "stats", origTS: obj.ts, body: JSON.stringify(memory.debug().STATS) };
                    SendRespObj(resp, res, memory);
                    
                }
                else if ( command == "/cluster" ){
                    
                    var resp = { action: "stats", origTS: obj.ts, body: JSON.stringify(memory.debug().CLUSTER) };
                    SendRespObj(resp, res, memory);
                    
                }
                else if ( command == "/ping" ){
                    var resp = { action: "ping", origTS: obj.ts, body: "pong" };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/modules" ){
                    var list = Object.keys(require('module')._cache);
                    var resp = { action: "modules", origTS: obj.ts, body: JSON.stringify(list) };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/list" ){
                    var mainMemory = memory.debug().GLOBAL;
                    var list = Object.keys(mainMemory);
                    var finalList = {};
                    for (var i = 0; i < list.length; i++ ){
                        finalList[mainMemory[list[i]].root] = 1;
                    }
                    var resp = { action: "list", origTS: obj.ts, body: JSON.stringify(Object.keys(finalList)) };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/info" ){
                    
                    var nbHTTP = memory.get("http.requests", "STATS");
                    if ( nbHTTP == null ) { nbHTTP = 0; }

                    var nbWebsocket = memory.get("websocket.requests", "STATS");
                    if ( nbWebsocket == null ) { nbWebsocket = 0; }

                    var connectedWS = memory.get("websocket.connected", "STATS");
                    if ( connectedWS == null ) { connectedWS = 0; }

                    var dataIN_HTTP = memory.get("http.data.in", "STATS");
                    if ( dataIN_HTTP == null ) { dataIN_HTTP = 0; }
                    var dataOUT_HTTP = memory.get("http.data.out", "STATS");
                    if ( dataOUT_HTTP == null ) { dataOUT_HTTP = 0; }

                    var dataIN_WS = memory.get("websocket.data.in", "STATS");
                    if ( dataIN_WS == null ) { dataIN_WS = 0; }
                    var dataOUT_WS = memory.get("websocket.data.out", "STATS");
                    if ( dataOUT_WS == null ) { dataOUT_WS = 0; }

                    var startTime = memory.get("StartTime", "STATS");
                    var uptime = (+new Date()) - startTime;

                    var content = `
                    <b>CloudGate full-stack server</b><br/>
                    <br/>
                    <b>Start time:</b> ${startTime} - Uptime: ${uptime}<br/>
                    <br/>
                    <b>Total requests served:</b><br/> 
                    HTTP(S): ${nbHTTP} - WEBSOCKET: ${nbWebsocket}<br/>
                    <br/>
                    <b>Connected users:</b><br/> 
                    WEBSOCKET: ${connectedWS}<br/>
                    <br/>
                    <b>Total traffic:</b><br/> 
                    IN: ${dataIN_HTTP + dataIN_WS} - OUT: ${dataOUT_HTTP + dataOUT_WS}<br/>
                    <br/>
                    <b>Cluster info:</b><br/> 
                    ClusterKey: e94e735a-02f1-40bf-b7f1-947b5e4be3ea <br/> 
                    Master: 116.202.112.237:3000<br/> 
                    nodes: 1.1.1.1, 2.2.2.2, 3.3.3.3<br/>
                    <br/>
                    `;

                    content = content.replace(/\n/g, "");

                    var resp = { action: "info", origTS: obj.ts, body: content };
                    SendRespObj(resp, res, memory);
                }
                else if ( command == "/si" )
                {
                    var cpuData = await si.cpu();
                    var networkData = await si.networkInterfaces();
                    var networkStats = await si.networkStats();
                    var hddData = await si.diskLayout();
                    var currentLoad = await si.currentLoad();
                    var osInfo = await si.osInfo();
                    var memoryInfo = await si.mem();
                    var timeInfo = si.time();

                    var content = `
                    <b>System Info</b><br/>
                    <br/>

                    <b>TIME:</b> ${JSON.stringify(timeInfo)}<br/>
                    <br/>

                    <b>OS:</b> ${JSON.stringify(osInfo)}<br/>
                    <br/>

                    <b>MEMORY:</b> ${JSON.stringify(memoryInfo)}<br/>
                    <br/>

                    <b>CPU:</b> ${JSON.stringify(cpuData)}<br/>
                    <br/>

                    <b>LOAD:</b> ${JSON.stringify(currentLoad)}<br/>
                    <br/>

                    <b>STORAGE:</b> ${JSON.stringify(hddData)}<br/>
                    <br/>

                    <b>NETWORK:</b> ${JSON.stringify(networkData)}<br/>
                    ${JSON.stringify(networkStats)}
                    <br/>
                    
                    `;

                    content = content.replace(/\n/g, "");

                    var resp = { action: "systeminfo", origTS: obj.ts, body: content };
                    SendRespObj(resp, res, memory);
                }
                else {
                    var resp = { action: "obj.body", origTS: obj.ts, body: "Command not recognized ... try <b>/help</b>" };
                    SendRespObj(resp, res, memory);
                }
                

            }
        );
    },
    close: (appConfig, reqInfos, res, req, memory) => {
        return Executor(appConfig, reqInfos, res, req, memory, "close", "", false,
            function (event, ctx, callback){
                //console.log("close websocket");
            } 
        );
    }
}


function Executor(appConfig, reqInfos, res, req, memory, subFunction, msgBody, isBinary, fnToExecute) {

    reqInfos.isBinary = isBinary;
    if (!isBinary) {
        if (msgBody != null) {
            reqInfos.body = decodeURIComponent(tools.ab2str(msgBody));
        }
        reqInfos.isBinary = false;
    }
    else {
        reqInfos.body = msgBody;
        reqInfos.isBinary = true;
    }

    //console.log(reqInfos.body);

    reqInfos.ws = res;

    return new Promise(async function(resolve, reject) {

        

        var event = reqInfos;
        var ctx = {
            succeed: function(result) {
                //console.log(result)
            },
            fail: function(error) {
                console.log(error);
            }
        };
        var callback = function(err, response) {

            if (err != null) {
                console.log(err);
            } else {
                //console.log(response);
            }

            if (response == null) {
                resolve({
                    processed: true
                });
            }
            else if (typeof response == "object") {
                resolve({
                    processed: true,
                    headers: response.headers,
                    content: response.content
                });
            }
            else {
                resolve({
                    processed: true,
                    content: response
                });
            }


        };

        var result = fnToExecute(event, ctx, callback);
        if (result) {
            if (result.then) {
                result.then(ctx.succeed, ctx.fail);
            } else {
                ctx.succeed(result);
            }
        }
        return;

        // No matching endpoint
        resolve({
            processed: false
        });
    });
}

function SendRespObj(resp, res, memory) {
    var strResp = JSON.stringify(resp);
    res.send(strResp);  
    memory.incr("websocket.data.out", strResp.length, "STATS");

    //TODO: we need a better implementation here with full logging of this for security reasons
    /*
    var serverConfig = memory.getObject("AdminConfig", "GLOBAL");
    if ( resp.action != null ){
        tools.debugLog("WS-Cloudgate|" + resp.action, 200, strResp.length, res.reqInfos, serverConfig);
    }
    */
}
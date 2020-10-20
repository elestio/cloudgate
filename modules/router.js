var fs = require('fs');
const memory = require('../modules/memory');
const sharedmem = require('../modules/shared-memory');
const staticFiles = require('../modules/static-files');
const apiFunctions = require('../modules/api-functions.js');
const websocketFunctions = require('../modules/websocket-functions.js');
const cloudgateWebsocket = require('../modules/cloudgate-websocket.js');
const cloudgateAPI = require('../modules/cloudgate-api.js');
const apiDB = require('../modules/api-db.js');
const dynamicDatasource = require('../modules/dynamic-datasource.js');
const tools = require('../modules/tools.js');

//In-memory cache
var cache = {};

var HLRU = require('hashlru');
var lru = HLRU(500); //max 500 items in the LRU Cache. TODO: this should be configurable

var _serverConfig = null;

module.exports = {
    start: (app, serverConfig) => {

        // reset rateLimiter every 60 seconds (maxRequestsPerMinutePerIP)
        app.rateLimiterMemory = {};
        setInterval(() => {
            app.rateLimiterMemory = {};
        }, 60*1000);

        var modules = [apiFunctions, apiDB, staticFiles];

        if ( _serverConfig == null ){
            _serverConfig = serverConfig;
        }

        //console.log(serverConfig.outputcache)
        if ( serverConfig.outputcache ){
            lru = HLRU(500);
        }
        else{
            lru = HLRU(1);
        }

        memory.set("StartTime", (+new Date()), "STATS")

        //REST
        app.any('/*', async (res, req) => {

            //Ensure this request is notified on aborted
            res.onAborted(() => {
                res.aborted = true;
            });

            //185K RPS per core - best perf possible
            //res.end("Hello World");
            //return;

            //test raw performance without any processing pipeline
            var tmpUrl = req.getUrl();
            if ( tmpUrl == "/cloudgate/debug/raw") {
                res.end("Hello World!");
                return;
            }

            //UPDATE STATS
            memory.incr("http.requests", 1, "STATS");
            //console.log("New request on a node");

            try {
                var host = req.getHeader('host');
                var subDomain = host.split('.')[0];
                var domain = host.substring(host.indexOf('.') + 1).split(':')[0];
                var reqInfos = {
                    url: req.getUrl(),
                    host: host,
                    query: req.getQuery(),
                    method: req.getMethod(),
                    ip: tools.getIP(req, res),
                    headers: {},
                    req: req,
                }

                //TODO: Ratelimiter based on IP, using sharedmem incr

                //handle cloudgate commands (control + replication)
                if ( serverConfig && serverConfig.adminEnabled == "1" ){
                    if ( reqInfos.url == serverConfig.adminpath){
                        
                        var result = await cloudgateAPI.process(reqInfos, res, req, memory, serverConfig);

                        //console.log("write status: " + result.status + " for path: " + reqInfos.url )

                        res.writeStatus("" + (result.status || 200));
                        for (var key in result.headers) {
                            res.writeHeader(key, result.headers[key] + "");
                        }

                        if (result.content != null) {
                            if (typeof result.content === 'object') {
                                //res.write(JSON.stringify(processResult.content));
                                res.write(result.content);
                            }
                            else {
                                res.write(result.content);
                            }
                        }

                        tools.debugLog("CloudGateAPI", (result.status || 200), result.content.length, reqInfos, serverConfig);

                        res.end();
                        return;
                    }
                }

                var appConfig = memory.getObject(subDomain + "." + domain, "GLOBAL");

                //TOO SLOW BECAUSE OF JSON.parse
                /*
                var appConfigJSON = sharedmem.getString("/domains/" + subDomain + "." + domain);
                if ( appConfigJSON != null && appConfigJSON != ""){
                    appConfig = JSON.parse(appConfigJSON);
                }
                else{
                    appConfig = null;
                }
                */
                
                //handle *
                if (appConfig == null) {
                    appConfig = memory.getObject("*", "GLOBAL"); //avoid constant call to redis
                    
                    //TOO SLOW BECAUSE OF JSON.parse
                    /*
                    appConfigJSON = sharedmem.getString("/domains/*");
                    if ( appConfigJSON != null && appConfigJSON != ""){
                        //appConfig = JSON.parse(appConfigJSON);
                    }
                    else{
                        appConfig = null;
                    }
                    */
                }

                //handle *.XXXXX.xxx
                if (appConfig == null) {
                    appConfig = memory.getObject("*." + domain, "GLOBAL"); //avoid constant call to redis
                    
                    //TOO SLOW BECAUSE OF JSON.parse
                    /*
                    appConfigJSON = sharedmem.getString("/domains/*." + domain);
                    if ( appConfigJSON != null && appConfigJSON != ""){
                        //appConfig = JSON.parse(appConfigJSON);
                    }
                    else{
                        appConfig = null;
                    }
                    */
                }
                
                if (typeof (appConfig) == 'undefined' || appConfig == null) {

                    if ( result != null && result.content != null ){
                        tools.debugLog("GLOBAL", 404, result.content.length, reqInfos, serverConfig);
                    }
                                        
                    res.writeStatus("404");
                    res.writeHeader("target", subDomain + "." + domain);
                    res.end("No app configured for vhost [" + subDomain + "." + domain + "]");
                    return;
                }

                // Implements a basic rate limiter for app level
                var rateLimiterKey = "/RLIP/" + reqInfos.ip ;
                var curRateLimitForIP = app.rateLimiterMemory[rateLimiterKey];
                if ( curRateLimitForIP == null ) {
                    app.rateLimiterMemory[rateLimiterKey] = 0;
                    curRateLimitForIP = 0;
                }
                var maxRequestsPerMinutePerIP = appConfig.maxRequestsPerMinutePerIP;
                if ( appConfig.maxRequestsPerMinutePerIP != null && curRateLimitForIP >= maxRequestsPerMinutePerIP && appConfig.maxRequestsPerMinutePerIP > 0) {

                    //let's wait instead of answering immediately to prevent DOS attacks
                    await tools.sleep(1000*serverConfig.nbThreads);
                    //then stop the process and return a 503
                    res.writeStatus("503 Service Unavailable");
                    res.end("You are sending too many request, please slow down.");
                    return;
                }
                app.rateLimiterMemory[rateLimiterKey] += 1;
                //sharedmem.incInteger(reqInfos.ip, 1, "/RLIP/");

                //force main domain & SSL
                /*
                if ( appConfig.mainDomain != null && appConfig.mainDomain != "" && appConfig.mainDomain != subDomain + "." + domain ){
                //should redirect to maindomain 
                console.log("redirect to: " + appConfig.mainDomain);    
                res.writeStatus("301");
    
                var protocol = "http://";
                if ( appConfig.forceSSL == true ){
                    protocol = "https://";
                }
                res.writeHeader("location", protocol + appConfig.mainDomain + reqInfos.url + reqInfos.query);
    
                res.end("No app configured for vhost [" + subDomain + "." + domain + "]");
                return ;
                }
                */


                //handle redirects & rewriting from appconfig

                if ( appConfig.redirects != null )
                {
                    var redirectRules = appConfig.redirects;
                    var endpointTarget = decodeURIComponent(reqInfos.url.split('?')[0]);
                    var matchingPrefix = "";
                    var cleanPath = endpointTarget;
                    var targetPath = redirectRules[cleanPath];

                    if ( targetPath != null ){
                        if ( targetPath.startsWith("http") ){
                            res.writeStatus("301");
                            res.writeHeader("location", targetPath);
                            res.end("");
                        }
                        else{
                            //redirect on the same site, we can just change the current event and continue execution
                            reqInfos.url = targetPath;
                        }
                        
                    }
                }

                //rewritings
                var isRewriten = false;
                if ( appConfig.rewritings != null )
                {

                    var rewritingRules = appConfig.rewritings;
                                        
                    var endpointTarget = decodeURIComponent(reqInfos.url.split('?')[0]);
                    var matchingPrefix = "";
                    var cleanPath = endpointTarget;
                    var targetPath = rewritingRules[cleanPath];

                    //console.log(reqInfos)

                    //if not found, check if we have a rule with a wildcard (*) matching
                    var paramInfos = {
                        name: "",
                        value: ""
                    }
                    if (targetPath == null) {
                        var rulesList = Object.keys(rewritingRules);
                        
                        for (var i = 0; i < rulesList.length; i++) {
                            var curRule = rulesList[i];
                            if (curRule.indexOf('%') > -1) {

                                //find all params in the rule with regex
                                //TODO: finish regex implementation here!
                                var ruleUrl = curRule + "/"; //final slash added to make working the regex rule below
                                var allParams = tools.getAllMatches(/%(.*?)%/g, ruleUrl);

                                var origUrl = endpointTarget;
                                var newUrl = targetPath;
                                var finalParams = {};

                                var prefix = curRule.split('/')[1];
                                var paramName = curRule.split('%')[1];
                                if (endpointTarget.startsWith("/" + prefix + "/")) {

                                    //find values for the params
                                    var tmpUrlParts = ruleUrl.split('/');
                                    for(var part=0; part < tmpUrlParts.length ; part++ ){
                                        var curPart =  tmpUrlParts[part];
                                        for (var aparam = 0; aparam < allParams.length; aparam++){
                                            if ( curPart == allParams[aparam][0] ) {
                                                var value = endpointTarget.split("/")[part];
                                                finalParams[allParams[aparam][1]] = value;
                                            }
                                        }
                                    }

                                    //console.log(reqInfos)
                                    //console.log(curRule)
                                    //console.log(finalParams);
                                    targetPath = rewritingRules[curRule];

                                }
                            }
                        }
                        
                    }

                    //TODO: Improvements needed!
                    //change the reqInfos event to point to the real path
                    //console.log(reqInfos)
                    if ( targetPath != null && reqInfos.url.indexOf(".") == -1 ){
                        
                        reqInfos.url = targetPath;

                        var paramsKeys = Object.keys(finalParams);
                        var newQuery = "";

                        
                        for (var kparam = 0; kparam < paramsKeys.length; kparam++){
                            var curKParam = paramsKeys[kparam];
                            //console.log(curKParam);
                            //console.log(finalParams[curKParam]);
                            //newUrl = newUrl.replace("%" + curKParam + "%", finalParams[curKParam]);
                            if ( newQuery == "" ){
                                newQuery += curKParam + "=" + encodeURIComponent(finalParams[curKParam]);
                            }
                            else{
                                newQuery += "&" + curKParam + "=" + encodeURIComponent(finalParams[curKParam]);
                            }
                        }
                        

                        
                        if ( reqInfos.query == ""){
                            reqInfos.query = newQuery;
                        }
                        else{
                            reqInfos.query += "&" + newQuery;
                        }
                        reqInfos.GET = finalParams;
                        


                        //console.log(reqInfos)
                        //console.log("processed file: " + reqInfos.url)
                    }

                    //console.log(reqInfos)
                 

                    //console.log(targetPath)
                    //console.log(reqInfos)

                    isRewriten = true;
                                        
                }

                //console.log(appConfig);
                //console.log(__dirname);

                //Caching: think about caching of GET only!
                var cacheKey = null;
                if (reqInfos.method == "get") {
                    cacheKey = host + reqInfos.url + reqInfos.query;
                    
                    //if ( serverConfig.outputcache )
                    {
                        //var cacheContent = memory.get(cacheKey, "ResponseCache");
                        var cacheContent = lru.get(cacheKey);
                        //var cacheContent = sharedmem.getString(cacheKey, "RESPONSECACHE");
                        
                        if (cacheContent != null && cacheContent != "") {

                            //cacheContent = JSON.parse(cacheContent);

                            if ( serverConfig.debug){
                                console.log("Serving from cache:" + cacheKey)  ;
                            }

                            //console.log("cachefound for: " + cacheKey + " - " + host)
                            var totalBytesSent = 0;

                            var processResult = cacheContent;
                            processResult.headers["core-cache"] = 1;
                            
                            res.writeStatus("" + (processResult.status || 200));
                            for (var key in processResult.headers) {
                                res.writeHeader(key, processResult.headers[key] + "");
                                totalBytesSent += key.length + processResult.headers[key].length;
                            }
                            res.writeHeader("processing", "<1ms");

                            if (processResult.content != null) {
                                
                                if ( processResult.content.length != null ){
                                    totalBytesSent += processResult.content.length;
                                    //console.log("content: " + totalBytesSent);
                                }
                                
                                res.end(processResult.content);
                            }

                            if ( totalBytesSent != null ){
                                //console.log("Adding: " + totalBytesSent);
                                memory.incr("http.data.out", totalBytesSent, "STATS");
                            }

                            tools.debugLog("HTTP", (processResult.status || 200), totalBytesSent, reqInfos, serverConfig);
                            
                            return;
                        }
                    }
                    
                }

                var beginPipeline = process.hrtime();
                var hasBeenProcessed = false;
                var processResult = null;
                for (var i = 0; i < modules.length; i++) {

                    //var begin = process.hrtime();
                    var module = modules[i];
                    var result = await module.process(appConfig, reqInfos, res, req, memory, serverConfig, app);
                    //const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                    //console.log("Module: " + i + " - " + (nanoSeconds/1000000) + "ms");

                    //Dynamic Datasource (only for static files + html files only)
                    //if (modules[i].name == "static-files" && (reqInfos.url == "/" || reqInfos.url.endsWith('.html') || reqInfos.url.endsWith('.htm') || reqInfos.url.split('.').length == 1) && result.status != 404) {
                    //console.log(result)
                    if (modules[i].name == "static-files" && result.status == 200 && result.headers && result.headers["Content-Type"] && result.headers["Content-Type"].indexOf("text/html") > -1) {
                        //console.log("Processing Dynamic Datasource");
                        result = await dynamicDatasource(result, reqInfos.query, appConfig, reqInfos, res, req, memory, serverConfig, app, apiDB);

                        //add base href if rewriten url
                        var rawContent = await tools.gunzip(result.content);
                        rawContent = rawContent.replace("<head>", "<head> <base href='/'>");
                        result.content = tools.GzipContent(rawContent);
                    }
                    
                 
                    //SPA routing - Redirect all 404 to index.html
                    if ( appConfig.redirect404toIndex == true ){
                        if (modules[i].name == "static-files" && result.status == 404 && reqInfos.url != "/" && reqInfos.url != "/index.html") {
                            
                            //let's redirect that to index.html (SPA routing)
                            //console.log(result);
                            //console.log('inside 404 redirect!!!!');

                            if (reqInfos.url.indexOf('?') > -1 )
                            {
                                reqInfos.url = "/index.html?" + reqInfos.url.split('?')[1];
                            }
                            else{
                                reqInfos.url = "/index.html";
                            }
                            result = await module.process(appConfig, reqInfos, res, req, memory, serverConfig);
                        }
                    }
                       

                    if (result && result.processed) {
                        
                        hasBeenProcessed = true;
                        processResult = result;

                        //keep in cache only static files response
                        //if (modules[i].name == "static-files" || modules[i].name == "api-functions" && reqInfos.method == "get") {
                        
                        if (modules[i].name == "static-files" ) {

                            //if ( serverConfig.outputcache )
                            {
                                //keep in cache only if no error
                                if ( processResult.error == null || processResult.error.trim() == "" )
                                {
                                    //console.log("cache written for " + reqInfos.url);
                                    //console.log(processResult);
                                    
                                    //memory.set(cacheKey, processResult, "ResponseCache");
                                    //sharedmem.setString(cacheKey, JSON.stringify(processResult), "RESPONSECACHE");;
                                    lru.set(cacheKey, processResult);
                                    
                                }
                                else{
                                    //console.log( "test: " + processResult.error);
                                }
                            }
                            
                        }
                        break;
                    }
                }

                const nanoSecondsPipeline = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
                //console.log("processing Pipeline: " + (nanoSecondsPipeline/1000000) + "ms");

                if (!res.aborted) {
                    if (!hasBeenProcessed) {
                        processResult = {
                            status: 404,
                            headers: {
                                "cache-control": "public, max-age=30",
                                "expires": new Date(Date.now() + 30 * 1000).toUTCString(),
                                "last-modified": new Date(Date.now()).toUTCString(),
                                "content-type": "text/html;charset=utf-8;",
                            }
                        }
                        var path404 = tools.safeJoinPath(__dirname, '..', './default/404.html')
                        // TODO : handle path to 404 in the config file
                        //404
                        processResult.content = "404 - Page not found"
                    }

                    var totalBytesSent = 0;

                    // FINAL WRITING
                    if ( memory.getObject("AdminConfig", "GLOBAL").debug == true ){
                        console.log(processResult);
                    }

                    //console.log(processResult);

                    if ( isNaN(processResult.status) ){
                        processResult.status = 200;
                    }

                    res.writeStatus("" + (processResult.status || 200));
                    for (var key in processResult.headers) {
                        if ( key.toLowerCase() != "content-length" ){
                            res.writeHeader(key, processResult.headers[key] + ""); //force casting the header value to string, other data types are not allowed in headers
                        }
                        totalBytesSent += key.length + processResult.headers[key].length;
                    }

                    //add processingTime header
                    res.writeHeader("processing", (nanoSecondsPipeline/1000000).toFixed(2) + "ms");
                     
                    //Add HSTS to reach A+ on SSL Labs test
                    if ( appConfig.HSTS == true ){
                        res.writeHeader("strict-transport-security", "max-age=31536000; includeSubDomains;");
                    }

                    //CORS
                    if ( appConfig.CORS != null && appConfig.CORS["access-control-allow-origin"] != null) {
                        res.writeHeader("access-control-allow-headers", "Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Origin, X-Session-ID" );
                        res.writeHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS" );
                        res.writeHeader("access-control-allow-origin", appConfig.CORS["access-control-allow-origin"] );
                    }
                    
                    if (processResult.content != null && processResult.content != "") {
                        if (typeof processResult.content === 'object') {
                            //res.write(processResult.content);
                            if ( Buffer.isBuffer(processResult.content) ){
                                res.write(processResult.content);
                                //console.log("not stringify");
                            }
                            else{
                                res.write(JSON.stringify(processResult.content));
                                //console.log("stringify");
                            }
                        }
                        else {

                            //check if the response is in JSON
                            processResult.origContent = processResult.content;
                            try{
                                processResult.content = JSON.parse(processResult.content);
                            }
                            catch(ex){

                            }
                            
                            //console.log(processResult.content.isBase64);

                            if ( processResult.content != null && processResult.content.isBase64 ){
                                //if content is encoded in B64
                                var buffer = tools.decodeB64(processResult.content.data);
                                res.write(buffer);
                            }
                            else{
                                res.write(processResult.origContent);
                            }

                        }
                        totalBytesSent += processResult.content.length;
                    }
                    res.end();

                    memory.incr("http.data.out", totalBytesSent, "STATS");
                    tools.debugLog("HTTP", (processResult.status || 200), totalBytesSent, reqInfos, serverConfig);

                }
                return;
            }
            catch (ex) {

                //console.log(ex);
                var erroMSG = ex + ""; //force a cast to string
                if (erroMSG.indexOf("Invalid access of discarded") == -1) {
                    console.log("Error11819: ");
                    console.log(ex);
                    res.end("404 NOT FOUND"); //but in fact an error occured ...
                }

            }

        })

        //WEBSOCKET
        app.ws('/*', {

            /* Options */
            compression: 0,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 60*60*24*1, //1 day

            /* Handlers */
            upgrade: async (res, req, context) => {


                var host = req.getHeader('host');
                var subDomain = host.split('.')[0];
                var domain = host.substring(host.indexOf('.') + 1).split(':')[0];
                var reqInfos = {
                    host: host,
                    subDomain: subDomain,
                    domain: domain,
                    url: req.getUrl(),
                    query: req.getQuery(),
                    method: req.getMethod(),
                    ip: tools.getIP(req, res),
                    headers: {},
                }

                //overide publish to allow multithread replication of publish()
                var uApp = {
                    publish: function(channel, msg){
                        
                        //publish on the current Thread
                        app.publish(channel, msg);

                        //send a copy to other threads
                        if ( parentPort != null ){
                            var clusteredProcessIdentifier = require('os').hostname() + "_" + require('worker_threads').threadId;
                            var content = msg;
                            var obj = { type: "CG_WS_MSG", channel: channel, message: content, source: clusteredProcessIdentifier };
                            parentPort.postMessage(obj);
                        }
                    }
                }

                //reqInfos.app = app;
                reqInfos.app = uApp;

                req.forEach((k, v) => {
                    reqInfos.headers[k] = v;
                });

                var appConfig = memory.getObject(subDomain + "." + domain, "GLOBAL");
                //handle *
                if (appConfig == null) {
                    appConfig = memory.getObject("*", "GLOBAL");
                }

                //handle *.XXXXX.xxx
                if (appConfig == null) {
                    appConfig = memory.getObject("*." + domain, "GLOBAL"); //avoid constant call to redis
                }

                //console.log("websocket appconfig: " + JSON.stringify(appConfig));

                if (typeof (appConfig) == 'undefined' || appConfig == null) {
                    tools.debugLog("WS", 404, 0, ws.reqInfos, serverConfig);
                    res.end(`{"error": "No app configured", "vhost": "${subDomain + "." + domain}"}`);
                    return;
                }

                res.upgrade({
                    url: req.getUrl(),
                    reqInfos: reqInfos,
                    appConfig: appConfig,
                    req: req
                },
                req.getHeader('sec-websocket-key'),
                req.getHeader('sec-websocket-protocol'),
                req.getHeader('sec-websocket-extensions'),
                context);

                //handle cloudgate commands (control + replication)
                if ( _serverConfig && _serverConfig.adminEnabled == "1" ){
                    if ( reqInfos.url == _serverConfig.adminpath){
                        var result = await cloudgateWebsocket.upgrade(appConfig, reqInfos, null, req, memory);
                        if ( result.content != null ){
                            tools.debugLog("CloudGateWS-UPGRADE", (result.status || 200), result.content.length, reqInfos, serverConfig);
                            if ( req != null ){
                                //res.end(result.content);
                            }
                        }
                        return;
                    }
                }
                else {
                    if ( reqInfos.url == _serverConfig.adminpath){
                        //Admin API is not enabled
                        console.log("Admin API is not enabled");
                        return;
                    }
                }

                //handle normal apps
                var result = await websocketFunctions.upgrade(appConfig, reqInfos, null, req, memory);
                if ( result.content != null ){
                    tools.debugLog("WS-UPGRADE", (result.status || 200), result.content.length, reqInfos, serverConfig);
                    if ( req != null ){
                        //res.end(result.content);
                    }
                }

            },
            open: async (ws) => {
                //Code to execute each time a new websocket is established (eg: authentication, count connected users, ...)

                //UPDATE STATS
                memory.incr("websocket.connected", 1, "STATS");
                memory.incr("websocket.requests", 1, "STATS");
                
                //handle cloudgate commands (control + replication)
                if ( _serverConfig && _serverConfig.adminEnabled == "1" ){
                    if ( ws.reqInfos.url == _serverConfig.adminpath){
                        var result = await cloudgateWebsocket.open(ws.appConfig, ws.reqInfos, ws, ws.req, memory);
                        if ( result.content != null ){
                            tools.debugLog("CloudGateWS", (result.status || 200), result.content.length, ws.reqInfos, serverConfig);
                            ws.send(result.content, false, false);
                        }
                        return;
                    }
                }
                else {
                    if ( ws.reqInfos.url == _serverConfig.adminpath){
                        //Admin API is not enabled
                        console.log("Admin API is not enabled");
                        ws.send("Admin API is not enabled", false, false);
                        return;
                    }
                }

                //handle normal apps
                var result = await websocketFunctions.open(ws.appConfig, ws.reqInfos, ws, ws.req, memory);
                if ( result.content != null ){
                    tools.debugLog("WS", (result.status || 200), result.content.length, ws.reqInfos, serverConfig);
                    ws.send(result.content, false, false);
                }
                
            },
            message: async (ws, message, isBinary) => {

                //UPDATE STATS
                memory.incr("websocket.requests", 1, "STATS");
                memory.incr("websocket.data.in", message.byteLength, "STATS");


                // Implements a basic rate limiter for app level
                var rateLimiterKey = "/RLIP/" + ws.reqInfos.ip ;
                var curRateLimitForIP = app.rateLimiterMemory[rateLimiterKey];
                if ( curRateLimitForIP == null ) {
                    app.rateLimiterMemory[rateLimiterKey] = 0;
                    curRateLimitForIP = 0;
                }
                var maxRequestsPerMinutePerIP = ws.appConfig.maxRequestsPerMinutePerIP;
                if ( ws.appConfig.maxRequestsPerMinutePerIP != null && curRateLimitForIP >= maxRequestsPerMinutePerIP && ws.appConfig.maxRequestsPerMinutePerIP > 0) {

                    //let's wait instead of answering immediately to prevent DOS attacks
                    await tools.sleep(1000*serverConfig.nbThreads);

                    //then stop the process and return a 503
                    var rlResponse = { "status": "Error", "cause": "RateLimited", "details": "You are sending too many request, please slow down" };
                    ws.send(JSON.stringify(rlResponse), false, false);
                    return;
                }
                app.rateLimiterMemory[rateLimiterKey] += 1;
                //sharedmem.incInteger(reqInfos.ip, 1, "/RLIP/");


                try{
                    
                    //handle cloudgate commands (control + replication)
                    if ( _serverConfig && _serverConfig.adminEnabled == "1" ){
                        if ( ws.reqInfos.url == _serverConfig.adminpath){
                            var result = await cloudgateWebsocket.message(ws.appConfig, ws.reqInfos, ws, null, memory, message, isBinary);
                            //response is done directly in cloudgateWebSocket (because it can respond multiple things)
                            return;
                        }
                    }

                    //handle normal apps
                    var result = await websocketFunctions.message(ws.appConfig, ws.reqInfos, ws, null, memory, message, isBinary);
                    if ( result != null && result.content != null ){

                        memory.incr("websocket.data.out", result.content.length, "STATS");
                        ws.send(result.content, false, false);

                        if ( ws.reqInfos != null){
                            tools.debugLog("WS", (result.status || 200), result.content.length, ws.reqInfos, serverConfig);
                        }
                    }
                }
                catch(ex){
                    console.log("Error while executing a websocket function: " + ex.message);
                    console.log(ex);
                }
 
            },
            drain: (ws) => {
                console.log("Warning: Router DRAIN! We should slow down");
            },
            close: async (ws, code, message) => {
                /* The library guarantees proper unsubscription at close */
                //redis.incrby("/counter/users", -1);

                //UPDATE STATS
                memory.incr("websocket.connected", -1, "STATS");

                try{

                    //handle cloudgate commands (control + replication)
                    if ( _serverConfig && _serverConfig.adminEnabled == "1" ){
                        if ( ws.reqInfos.url == _serverConfig.adminpath){
                            var result = await cloudgateWebsocket.close(ws.appConfig, ws.reqInfos, ws, null, memory, message, false);
                            return;
                        }
                    }

                    //handle normal apps
                    var result = await websocketFunctions.close(ws.appConfig, ws.reqInfos, ws, null, memory);
                }
                catch(ex){
                    console.log(ex);
                }

            }
        })

        //multithread communication
        var parentPort = null;
        try{
            parentPort = require('worker_threads').parentPort;
        } catch(ex){}
        
        if (parentPort != null) {
            parentPort.on('message', (msg) => {

                var clusteredProcessIdentifier = require('os').hostname() + "_" + require('worker_threads').threadId;
                if ( msg.source == clusteredProcessIdentifier ){
                    //same computer, let's discard it!
                    //console.log("Thread replication discarded because it's from the same origin!");
                }
                else if ( msg.type == "CG_WS_MSG" ){
                    app.publish(msg.channel, msg.message);
                    //console.log("msg received: ");
                    //console.log(msg);
                }
                
            });
        }

    }
}
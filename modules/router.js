var fs = require('fs');
const memory = require('../modules/memory');
const staticFiles = require('../modules/static-files');
const apiFunctions = require('../modules/api-functions.js');
const websocketFunctions = require('../modules/websocket-functions.js');
const apiDB = require('../modules/api-db.js');
const tools = require('../lib/tools.js');

//In-memory cache
var cache = {};

module.exports = {
    start: (app) => {
        var modules = [apiFunctions, apiDB, staticFiles];

        //REST
        app.any('/*', async (res, req) => {

            //Ensure this request is notified on aborted
            res.onAborted(() => {
                res.aborted = true;
            });

            //170K RPS per core - best perf possible
            //res.end("Hello World");
            //return;

            //console.log(tools.getIP(req, res));

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

                //console.log("ip: " + JSON.stringify(res.getRemoteAddress()));


                var appConfig = memory.getObject(subDomain + "." + domain, "GLOBAL");
                //console.log("appconfig key: " + subDomain + "." + domain);
                //console.log(memory.debug());
                
                //handle *
                if (appConfig == null) {
                    appConfig = memory.getObject("*", subDomain + "." + domain, "GLOBAL"); //avoid constant call to redis
                }
                
                if (typeof (appConfig) == 'undefined' || appConfig == null) {
                    res.writeStatus("404");
                    res.writeHeader("target", subDomain + "." + domain);
                    res.end("No app configured for vhost [" + subDomain + "." + domain + "]");
                    return;
                }

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

                //Caching: think about caching of GET only!
                var cacheKey = null;
                if (reqInfos.method == "get") {
                    cacheKey = host + reqInfos.url + reqInfos.query;
                }

                //console.log(memory.debug());
                //console.log("cachekey")
                //console.log(cacheKey + " - " + host);
                
                //console.log(memory.debug());
                var cacheContent = memory.get(cacheKey, "ResponseCache_" + appConfig.root);
                if (cacheContent != null) {

                    //console.log("cachefound for: " + cacheKey + " - " + host)
                    
                    var processResult = cacheContent;
                    res.writeStatus("" + (processResult.status || 200));
                    for (var key in processResult.headers) {
                        res.writeHeader(key, processResult.headers[key]);
                    }
                    if (processResult.content != null) {
                        res.end(processResult.content);
                    }
                    return;
                }




                //res.end("after reading config");
                //return;



                //var beginPipeline = process.hrtime();

                var hasBeenProcessed = false;
                var processResult = null;
                for (var i = 0; i < modules.length; i++) {

                    //console.log(modules[i]);

                    //var begin = process.hrtime();
                    var module = modules[i];
                    var result = await module.process(appConfig, reqInfos, res, req, memory);
                    //const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                    //console.log("Module: " + i + " - " + (nanoSeconds/1000000) + "ms");

                    if (result && result.processed) {
                        hasBeenProcessed = true;
                        processResult = result;

                        //keep in cache only static files response
                        if (modules[i].name == "static-files") {
                            memory.set(cacheKey, processResult, "ResponseCache_" + appConfig.root);
                            //console.log("cache set for: " + cacheKey + "|" + appConfig.root);
                        }


                        break;
                    }
                }

                //const nanoSecondsPipeline = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
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
                        var content404 = "";
                        var cache404 = memory.get(path404, appConfig.root);
                        if (cache404 != null) {
                            //console.log("cached");
                            processResult.headers['core-cache'] = '1';
                            processResult.headers['Content-Encoding'] = 'gzip';
                            processResult.content = cache404;
                            //res.writeHeader("core-cache", "1");
                            //res.writeHeader("Content-Encoding", "gzip");
                            //res.end(cache404);
                        }
                        else {
                            content404 = fs.readFileSync(path404, { encoding: 'utf8' });
                            processResult.headers['Content-Encoding'] = 'gzip';
                            processResult.content = tools.GzipContent(content404);
                            memory.set(path404, processResult.content, appConfig.root);
                            //tools.GzipResponse(res, content404);
                        }
                    }

                    //console.log(processResult);

                    //console.log(memory.debug());

                    // FINAL WRITING
                    res.writeStatus("" + (processResult.status || 200));
                    for (var key in processResult.headers) {
                        res.writeHeader(key, processResult.headers[key]);
                    }

                    if (processResult.content != null) {
                        if (typeof processResult.content === 'object') {
                            //res.write(JSON.stringify(processResult.content));
                            res.write(processResult.content);
                        }
                        else {
                            res.write(processResult.content);
                        }
                    }
                    res.end();
                    //res.end(processResult.content);

                }
                return;
            }
            catch (ex) {

                //console.log(ex);
                var erroMSG = ex + ""; //force a cast to string
                if (erroMSG.indexOf("Invalid access of discarded") == -1) {
                    console.log("Error11819: ");
                    console.log(ex);

                    //console.trace("I am here");

                    res.end("404 NOT FOUND"); //but in fact an error occured ...
                }

            }

        })

        //WEBSOCKET
        app.ws('/*', {

            /* Options */
            compression: 0,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 1800,

            /* Handlers */
            open: async (ws, req) => {
                //Code to execute each time a new websocket is established (eg: authentication, count connected users, ...)

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
                    ip: tools.getIP(req, ws),
                    headers: {},
                    app: app
                }

                req.forEach((k, v) => {
                    reqInfos.headers[k] = v;
                });
                ws.reqInfos = reqInfos;
                ws.req = req;

                var appConfig = memory.getObject(subDomain + "." + domain, "GLOBAL");
                //handle *
                if (appConfig == null) {
                    appConfig = memory.getObject("*", subDomain + "." + domain, "GLOBAL"); //avoid constant call to redis
                }

                //console.log("websocket appconfig: " + JSON.stringify(appConfig));

                if (typeof (appConfig) == 'undefined' || appConfig == null) {
                    ws.send(`{"error": "No app configured", "vhost": "${subDomain + "." + domain}"}`, false, false);
                    ws.close();
                }

                ws.appConfig = appConfig;

                var result = await websocketFunctions.open(appConfig, reqInfos, ws, req, memory);
                if ( result.content != null ){
                    ws.send(result.content, false, false);
                }
                

            },
            message: async (ws, message, isBinary) => {

                try{
                    var result = await websocketFunctions.message(ws.appConfig, ws.reqInfos, ws, null, memory, message, isBinary);
                    if ( result.content != null ){
                        ws.send(result.content, false, false);
                    }
                }
                catch(ex){
                    console.log("Error while executing a websocket function: " + ex.message);
                    console.log(ex);
                }
 
            },
            drain: (ws) => {

            },
            close: async (ws, code, message) => {
                /* The library guarantees proper unsubscription at close */
                //redis.incrby("/counter/users", -1);

                try{
                    var result = await websocketFunctions.message(ws.appConfig, ws.reqInfos, ws, null, memory);
                }
                catch(ex){
                    console.log(ex);
                }

            }
        })

    }
}

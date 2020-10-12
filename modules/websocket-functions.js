var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('../lib/tools.js');
var sharedmem = require("./shared-memory");
const apiDB = require('./api-db');

var functionsCache = {};

module.exports = {
    name: "websocket-functions",
    process: (appConfig, reqInfos, res, req, memory) => {
        return new Promise(async function(resolve, reject) {

            
            // No matching endpoint
            resolve({
                processed: false
            });
        });
    },
    upgrade: (appConfig, reqInfos, res, req, memory) => {
        return Executor(appConfig, reqInfos, res, req, memory, "upgrade");
    },
    open: (appConfig, reqInfos, res, req, memory) => {
        return Executor(appConfig, reqInfos, res, req, memory, "open");
    },
    message: (appConfig, reqInfos, res, req, memory, msgBody, isBinary) => {
        return Executor(appConfig, reqInfos, res, req, memory, "message", msgBody, isBinary);
    },
    close: (appConfig, reqInfos, res, req, memory) => {
        return Executor(appConfig, reqInfos, res, req, memory, "close");
    }
}


function Executor(appConfig, reqInfos, res, req, memory, subFunction, msgBody, isBinary) {

    if ( memory.getObject("AdminConfig", "GLOBAL").debug == true && reqInfos != null ){
        console.log("[" + new Date().toISOString() + "] [WS] [" + subFunction + "] " + reqInfos.host + reqInfos.url + " - Query: " + reqInfos.query + " - SourceIP: " + reqInfos.ip + " - Body: " + reqInfos.body );
    }

    reqInfos.isBinary = isBinary;
    if ( !isBinary ) {
        if ( msgBody != null) {
            reqInfos.body = decodeURIComponent(tools.ab2str(msgBody));
        }
        reqInfos.isBinary = false;
    }
    else{
        reqInfos.body = msgBody;
        reqInfos.isBinary = true;
    }

     //console.log(reqInfos.body);
     //console.log(appConfig);

    reqInfos.ws = res;

    return new Promise(async function(resolve, reject) {

            var functionsList = appConfig.websocketEndpoints;
            if ( functionsList == null ){
                functionsList = [];
            }

            var endpointTarget = reqInfos.url.split('?')[0];
            var apiEndpoint = functionsList[endpointTarget];

            //if not found, check if we have a rule with a wildcard (*) matching
            if (functionsList[endpointTarget] == null) {
                var routes = Object.keys(functionsList);
                for (var i = 0; i < routes.length; i++){
                    var curRoute = routes[i];
                    if ( curRoute.indexOf('*') > -1){
                        var prefix = curRoute.split('*')[0];
                        if ( endpointTarget.startsWith(prefix) ){
                            apiEndpoint = functionsList[curRoute];
                        }
                    }
                }
            }

            if (typeof (apiEndpoint) != 'undefined' && apiEndpoint[subFunction] != null ) {

                // Implements a basic rate limiter for endpoint level
                if( reqInfos.ws == null ){
                    reqInfos.ws = {};
                }
                if( reqInfos.ws.rateLimiterMemory == null ){
                    reqInfos.ws.rateLimiterMemory = {};
                }

                var rateLimiterKey = "/RLIP/" + reqInfos.ip + "/WS" + endpointTarget;
                var curRateLimitForIP = null;
                if ( reqInfos.ws.rateLimiterMemory != null ){
                    curRateLimitForIP = reqInfos.ws.rateLimiterMemory[rateLimiterKey];
                }
                
                if ( curRateLimitForIP == null ) {
                    reqInfos.ws.rateLimiterMemory[rateLimiterKey] = 0;
                    curRateLimitForIP = 0;
                }
                var maxRequestsPerMinutePerIP = apiEndpoint.maxRequestsPerMinutePerIP;
                if ( apiEndpoint.maxRequestsPerMinutePerIP != null && curRateLimitForIP >= maxRequestsPerMinutePerIP && apiEndpoint.maxRequestsPerMinutePerIP > 0) {

                    //let's wait 1 second instead of answering immediately to prevent DOS attacks
                    await tools.sleep(1000*serverConfig.nbThreads);
                    //await tools.sleep(1000);

                    //then stop the process and return a 503
                    resolve({
                        status: "503",
                        processed: true,
                        content: `You are sending too many request, please slow down.`
                    });
                    return;
                }
                reqInfos.ws.rateLimiterMemory[rateLimiterKey] += 1;


                var functionIndexFile = apiEndpoint[subFunction].split('.')[0];
                var functionHandlerFunction = apiEndpoint[subFunction].split('.')[1];                
                //var functionPath = tools.safeJoinPath("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
                var functionPath = "";
                if (appConfig.root.startsWith("./")) {
                    functionPath = tools.safeJoinPath("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
                }
                else {
                    functionPath = tools.safeJoinPath(appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
                }

                // TODO : check not using ../ (lower level from app root)

                //AWS Lambda Executor (tested at 2K RPS with -c128 in wrk on Hetzner to AWS direction)
                if (appConfig.AWS != null) {

                    var begin = process.hrtime();

                    var aws = require('aws-sdk');
                    var lambda = new aws.Lambda({ region: appConfig.AWS.region, accessKeyId: appConfig.AWS.accessKeyId, secretAccessKey: appConfig.AWS.secretAccessKey });
                    var params = {
                        FunctionName: apiEndpoint[subFunction],
                        InvocationType: "RequestResponse",
                        LogType: "Tail",
                        Payload: JSON.stringify(reqInfos)
                    };
                    lambda.invoke(params, function(err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        }
                        else {
                            var logs = new Buffer.from(data.LogResult, 'base64').toString('utf8');

                            //console.log(payload);  
                            //console.log(logs);  

                            var payload = JSON.parse(data.Payload);

                            const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                            var durationMS = (nanoSeconds / 1000000);
                            //console.log("Lambda exec: " + durationMS + "ms");

                            if (typeof payload == "object") {
                                resolve({
                                    processed: true,
                                    status: payload.status,
                                    headers: payload.headers,
                                    content: payload.content,
                                    logs: logs,
                                    durationMS: durationMS
                                });
                            }
                            else {
                                resolve({
                                    status: 200,
                                    processed: true,
                                    content: payload,
                                    logs: logs,
                                    durationMS: durationMS
                                });
                            }

                        }

                    });
                    return;
                }

                curFunction = require(functionPath);
                if (curFunction[functionHandlerFunction] == undefined) {
                    // TODO : Handle error here AND RETURN
                }

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

                    if (response == null){
                        resolve({
                            processed: true
                        });
                    }
                    else if (typeof response === "object") {

                        if ( Buffer.isBuffer(response.content) ){
                            resolve({
                                processed: true,
                                headers: response.headers,
                                content: response.content
                            });
                        }
                        else{
                            resolve({
                                processed: true,
                                headers: response.headers,
                                content: JSON.stringify(response.content)
                            });
                        }
                    }
                    else {
                        resolve({
                            processed: true,
                            content: response
                        });
                    }


                };

                ctx.sharedmem = sharedmem;
                ctx.apiDB = apiDB;
                ctx.appConfig = appConfig;

                var result = curFunction[functionHandlerFunction](event, ctx, callback);
                if (result) {
                    if (result.then) {
                        result.then(ctx.succeed, ctx.fail);
                    } else {
                        ctx.succeed(result);
                    }
                }
                return;
            }
            // No matching endpoint
            //resolve({ processed: false });
            resolve({ 
                processed: true, 
                status: "404",
                content: JSON.stringify({"status" : "error", "body": "No websocket endpoint is matching this route: " + endpointTarget })
            });
        });
}
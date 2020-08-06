var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('../lib/tools.js');

const https = require('https');
const Axios = require('axios');
const axios = Axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

var functionsCache = {};
var proxyCache = {};

var sharedmem = require("./shared-memory");
const apiDB = require('./api-db');

module.exports = {
    name: "api-functions",
    process: (appConfig, reqInfos, res, req, memory, serverConfig, app) => {
        return new Promise(async function(resolve, reject) {

            var functionsList = appConfig.apiEndpoints;
            if (functionsList == null) {
                functionsList = [];
            }

            var endpointTarget = decodeURIComponent(reqInfos.url.split('?')[0]);
            var matchingPrefix = endpointTarget;
            var apiEndpoint = functionsList[endpointTarget];

            //if not found, check if we have a rule with a wildcard (*) matching
            if (functionsList[endpointTarget] == null) {
                var routes = Object.keys(functionsList);
                for (var i = 0; i < routes.length; i++) {
                    var curRoute = routes[i];
                    if (curRoute.indexOf('*') > -1) {
                        var prefix = curRoute.split('*')[0];
                        if (endpointTarget.startsWith(prefix)) {
                            apiEndpoint = functionsList[curRoute];
                            matchingPrefix = prefix;
                        }
                    }
                }
            }

            //console.log(appConfig);

            if (typeof (apiEndpoint) != 'undefined') {

                //read headers
                req.forEach((k, v) => {
                    reqInfos.headers[k] = v;
                });

                //read the body only if needed
                if (reqInfos.method != "get") {
                    reqInfos.body = await tools.getBody(req, res);
                }

                var apiSrc = apiEndpoint.src;
                if (apiSrc.startsWith("http://") || apiSrc.startsWith("https://")) {

                    var skipPrefix = false;
                    if (apiEndpoint.skipPrefix == true) {
                        skipPrefix = true;
                    }

                    //reverse proxy
                    try {

                        //TODO: populate the correct headers before sending the proxied query
                        delete reqInfos.headers["host"];

                        //we should return the correct status code to be able to handle 304 ...
                        delete reqInfos.headers["if-none-match"];
                        delete reqInfos.headers["if-modified-since"];

                        //we should be able to handle GZIP before sending accept-encoding
                        delete reqInfos.headers["accept-encoding"];

                        var finalPath = reqInfos.url;
                        if (skipPrefix) {
                            finalPath = reqInfos.url.replace(matchingPrefix.replace("*", ""), "");
                        }
                        else {
                            if (finalPath.startsWith("/")) {
                                finalPath = finalPath.substring(1, finalPath.length);
                            }
                        }

                        

                        //console.log(finalPath);

                        var finalUrl = (apiSrc + finalPath);

                        var host = finalUrl.split('/')[2];
                        reqInfos.headers["Host"] = host;
                        reqInfos.headers["path"] = finalPath;

                        if ( reqInfos.query != null && reqInfos.query != ""){
                            finalUrl = finalUrl + "?" + reqInfos.query;
                        }

                        //AXIOS
                        var optAxios = {
                            url: finalPath,
                            method: reqInfos.method.toUpperCase(),
                            headers: reqInfos.headers,
                            responseType: 'stream'
                        };
                        if (reqInfos.body != null) {
                            optAxios.data = reqInfos.body;
                        }


                        //TODO: fix issue when proxying google.com!
                        if ( memory.getObject("AdminConfig", "GLOBAL").debug == true ){
                            console.log("Fetching remote url: " + finalUrl);
                            console.log(reqInfos.query);
                            console.log(optAxios);
                        }
                        

                        axios(finalUrl, optAxios)
                            .then(async function(response) {

                                //handle byte ranges
                                if ( response.status == 206 || response.status == "206" || response.headers && response.headers["content-range"] != null ){
                                    res.writeStatus("206");
                                }
                                
                                //console.log(response.request.headers);
                                //console.log(response.headers);
                                //console.log(response.status);

                                
                                try 
                                {


                                    for (var key in response.headers) {
                                        if (key.toUpperCase() != 'CONTENT-LENGTH' && key.toUpperCase() != 'TRANSFER-ENCODING' && key.toUpperCase() != 'X-FRAME-OPTIONS') 
                                        {
                                            var value = response.headers[key] + "";
                                            res.writeHeader(key, value);
                                        }
                                    }

                                    //disable various securities of the remote host
                                    res.writeHeader("access-control-allow-headers", "Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Origin, X-Session-ID" );
                                    res.writeHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS" );
                                    res.writeHeader("access-control-allow-origin", "*" );


                                    const stream = response.data;
                                    //tools.pipeStreamOverResponse(res, stream, stream.length, memory);
                                    //return;

                                    //console.log("TEST 00000");

                                    stream.on('data', (chunk) => {
                                        //console.log("Chunk received: " + chunk.length);
                                        //console.log(typeof chunk);
                                        //console.log(chunk);
                                        if (!res.aborted) {
                                            res.write(chunk);
                                        }
                                    });
                                    stream.on('end', () => {
                                        //console.log("end of chunks!");
                                        if (!res.aborted) {
                                            res.end();
                                        }
                                    });
                                }
                                catch (ex) 
                                {
                                    var erroMSG = ex + ""; //force a cast to string
                                    if (erroMSG.indexOf("Invalid access of discarded") == -1) {
                                        console.log("Error46110: ");
                                        console.log(ex);
                                    }
                                }
                                
                                return;
                            })
                            .catch(function(error) {
                                res.writeStatus("500")
                                res.end(error.message);
                                return;
                            });

                        return;

                    }
                    catch (ex) {
                        var erroMSG = ex + ""; //force a cast to string
                        if (erroMSG.indexOf("Invalid access of discarded") == -1) {
                            console.log("Error16810: ");
                            console.log(ex);
                        }
                    }

                }

                if (apiEndpoint.handler == null) {
                    return;
                }

                var functionIndexFile = apiEndpoint.handler.split('.')[0];
                var functionHandlerFunction = apiEndpoint.handler.split('.')[1];
                // TODO : check path doesn't crash
                let supportedTypes = ['nodejs12.x', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SQLSELECT', 'SQLINSERT', 'SQLUPDATE', 'SQLDELETE'];
                if (!supportedTypes.includes(apiEndpoint.type)) {
                    resolve({
                        status: "415",
                        processed: true,
                        content: `${apiEndpoint.type} is not supported on Cloudgate`
                    });
                } else {
                    if (apiEndpoint.type !== 'nodejs12.x') {
                        let sqlRequest = fs.readFileSync(`${apiEndpoint.src}${functionIndexFile}.sql`, 'utf-8');
                        console.log(sqlRequest);
                        let rows = apiDB.ExecuteQuery(appConfig, sqlRequest);
                        resolve({
                            processed: true,
                            content: rows,
                            status: 200
                        })
                        return;
                    }
                }
                var functionPath = "";
                if (appConfig.root.startsWith("./")) {
                    functionPath = tools.safeJoinPath("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
                }
                else {
                    functionPath = tools.safeJoinPath(appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
                }

                // TODO : check not using ../ (lower level from app root)


                //AWS Lambda Executor (tested at 2K RPS with -c128 in wrk on Hetzner to AWS direction)
                if (appConfig.AWS != null && appConfig.TypeAPI == "LAMBDA") {

                    var begin = process.hrtime();

                    var apiGatewayEvent = {
                        httpMethod: reqInfos.method.toUpperCase(),
                        path: reqInfos.url,
                        queryStringParameters: qs.parse(reqInfos.query),
                        headers: reqInfos.headers
                    };

                    var aws = require('aws-sdk');
                    var lambda = new aws.Lambda({ region: appConfig.AWS.region, accessKeyId: appConfig.AWS.accessKeyId, secretAccessKey: appConfig.AWS.secretAccessKey });
                    var params = {
                        FunctionName: apiEndpoint.src,
                        InvocationType: "RequestResponse",
                        LogType: "Tail",
                        Payload: JSON.stringify(apiGatewayEvent)
                    };
                    lambda.invoke(params, function(err, data) {
                        if (err) {
                            //console.log(err, err.stack); 

                            const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                            var durationMS = (nanoSeconds / 1000000);
                            resolve({
                                processed: true,
                                status: 500,
                                error: err.code,
                                content: err.code + ": " + err.message + "\nPlease check your AWS credentials / region / bucket in appConfig.json",
                                durationMS: durationMS
                            });

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
                                    status: payload.statusCode,
                                    headers: payload.headers,
                                    content: payload.body,
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

                try {
                    curFunction = require(functionPath);
                }
                catch (ex) {
                    resolve({
                        processed: true,
                        content: ex.message + "\nTrace: " + ex.stack
                    });
                    return;
                }

                if (curFunction[functionHandlerFunction] == undefined) {
                // TODO : Handle error here AND RETURN
                }
                var path = reqInfos.url;
                if ( curRoute != null && curRoute.endsWith('/*')) {
                    path = reqInfos.url.substring(curRoute.length - 3);
                }
                //console.log(path);
                var event = {
                    httpMethod: reqInfos.method.toUpperCase(),
                    method: reqInfos.method.toUpperCase(),
                    url: path,
                    path: path,
                    ip: reqInfos.ip,
                    query: reqInfos.query,
                    queryStringParameters: qs.parse(reqInfos.query),
                    body: reqInfos.body,
                    headers: reqInfos.headers
                };

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

                    //prevent a crash if the cloud function don't return anything
                    if (response == null){
                        response = {"content": "No content returned by the cloud function ..."};
                    }

                    if ( response.headers == null ){
                        response.headers = {};
                    }

                    if ( response != null && response.headers != null ){
                        response.headers["Access-Control-Allow-Origin"] = "*";
                        response.headers["Access-Control-Allow-Methods"] = "GET,HEAD,OPTIONS,POST,PUT";
                        response.headers["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept, Authorization";
                    }

                    if (typeof response == "object") {
                        resolve({
                            status: (response.status || 200),
                            processed: true,
                            headers: response.headers,
                            content: response.content
                        });
                    }
                    else {

                        if ( !isTypedArray(response) && !isString(response) && !isArrayBuffer(response) ){
                            response = response + ""; //cast to string
                        }

                        resolve({
                            status: (response.status || 200),
                            processed: true,
                            content: response
                        });
                    }


                };
                
                var result = null;
                try {
                    ctx.sharedmem = sharedmem;
                    ctx.apiDB = apiDB;
                    ctx.appConfig = appConfig;
                    let forbiddenEnvVars = ['PATH','LS_COLORS','SSH_CONNECTION','LESSCLOSE','LANG','USER','PWD','HOME','SSH_CLIENT','SSH_TTY','MAIL','TERM','SHELL','NVM_BIN','SHLVL','LOGNAME','PATH','NVM_INC','XDG_SESSION_ID','XDG_RUNTIME_DIR','_']
                    if (apiEndpoint.envVars) {
                        Object.keys(apiEndpoint.envVars).forEach(envVar => {
                            if (forbiddenEnvVars.includes(envVar)) {
                                return;
                            }
                            process.env[envVar] = apiEndpoint.envVars[envVar];
                        });
                    }
                    result = await curFunction[functionHandlerFunction](event, ctx, callback);
                    resolve({
                        status: (result.statusCode || 200),
                        processed: true,
                        headers: result.headers,
                        content: result.body
                    });
                }
                catch (ex) {
                    resolve({
                        processed: true,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
                            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
                        },
                        content: ex.message + "\nTrace: " + ex.stack
                    });
                    return;
                }

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
            resolve({
                processed: false
            });
        });

    }
}


function isTypedArray(a) { return !!(a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT); }

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

const hasArrayBuffer = typeof ArrayBuffer === 'function';
function isArrayBuffer(value) {
  return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
}

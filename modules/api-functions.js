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

module.exports = {
    name: "api-functions",
    process: (appConfig, reqInfos, res, req, memory) => {
        return new Promise(async function(resolve, reject) {

            var functionsList = appConfig.apiEndpoints;
            if (functionsList == null) {
                functionsList = [];
            }

            var endpointTarget = reqInfos.url.split('?')[0];
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
                            finalPath = reqInfos.url.replace(matchingPrefix, "");
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


                        axios(finalUrl, optAxios)
                            .then(async function(response) {

                                //console.log(response.request.headers);
                                console.log(response.headers);
                                console.log(response.status);

                                try {
                                    for (var key in response.headers) {
                                        if (key.toUpperCase() != 'CONTENT-LENGTH') 
                                        {
                                            res.writeHeader(key, response.headers[key]);
                                        }
                                    }

                                    //here we should be able to return 206 ... but it seems to fail
                                    //test url: http://vms2.terasp.net:3000/stream/fYwRsJAPfec
                                    res.writeStatus("" + response.status);
                                    //res.writeStatus("500");

                                    const stream = response.data;
                                    //tools.pipeStreamOverResponse(res, stream, stream.length, memory);

                                    stream.on('data', (chunk) => {
                                        //console.log("Chunk received: " + chunk.length);
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
                                catch (ex) {
                                    var erroMSG = ex + ""; //force a cast to string
                                    if (erroMSG.indexOf("Invalid access of discarded") == -1) {
                                        console.log("Error46110: ");
                                        console.log(ex);
                                    }
                                }

                                return;
                            })
                            .catch(function(error) {
                                console.log(error);
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

                    if (typeof response == "object") {
                        resolve({
                            status: (response.status || 200),
                            processed: true,
                            headers: response.headers,
                            content: response.content
                        });
                    }
                    else {
                        resolve({
                            status: (response.status || 200),
                            processed: true,
                            content: response
                        });
                    }


                };






                var result = null;

                try {
                    result = curFunction[functionHandlerFunction](event, ctx, callback);
                }
                catch (ex) {
                    resolve({
                        processed: true,
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
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('../lib/tools.js');

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
            if (typeof (apiEndpoint) != 'undefined') {
                var functionIndexFile = apiEndpoint[subFunction].split('.')[0];
                var functionHandlerFunction = apiEndpoint[subFunction].split('.')[1];
                // TODO : check path doesn't crash
                var functionPath = tools.safeJoinPath("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
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
            resolve({
                processed: false
            });
        });
}
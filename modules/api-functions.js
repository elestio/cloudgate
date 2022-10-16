var zlib = require('zlib');
var fs = require('fs');
var util = require('util');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('./tools.js');

var StdOutFixture = require('./fixture-output');
var fixture = new StdOutFixture();


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
var coregate = require('../coregate.js');

var cacheSQLFunctionsSource = {}; //TODO: cache invalidation should be handled (api, fs events)

module.exports = {
    name: "api-functions",
    process: (appConfig, reqInfos, res, req, memory, serverConfig, app, event) => {
        return new Promise(async function(resolve, reject) {

            var beginPipeline = process.hrtime();

            process.env['APPCONFIG_PATH'] = `${appConfig.root}/appconfig.json`;
            var functionsList = appConfig.apiEndpoints;
            if (functionsList == null) {
                functionsList = [];
            }
            var endpointTarget = decodeURIComponent(reqInfos.url.split('?')[0]);
            var matchingPrefix = endpointTarget;
            var cleanPath = endpointTarget;
            var apiEndpoint = functionsList[cleanPath];

            //if not found, check if we have a rule with a wildcard (*) matching
            if (functionsList[endpointTarget] == null) {
                var routes = Object.keys(functionsList);
                for (var i = 0; i < routes.length; i++) {
                    var curRoute = routes[i];
                    if (curRoute.indexOf('*') > -1) {
                        var prefix = curRoute.split('*')[0];
                        if (endpointTarget.startsWith(prefix) && reqInfos.url.indexOf(".well-known/acme-challenge") == -1) {
                            apiEndpoint = functionsList[curRoute];
                            matchingPrefix = prefix;
                        }
                    }
                }
            }
            //console.log(appConfig);

            if (typeof (apiEndpoint) != 'undefined') {


                // Implements a basic rate limiter for endpoint level
                var rateLimiterKey = "/RLIP/" + reqInfos.ip + "/HTTP/" + endpointTarget;
                var curRateLimitForIP = app.rateLimiterMemory[rateLimiterKey];
                if ( curRateLimitForIP == null ) {
                    app.rateLimiterMemory[rateLimiterKey] = 0;
                    curRateLimitForIP = 0;
                }
                var maxRequestsPerMinutePerIP = apiEndpoint.maxRequestsPerMinutePerIP;

                if ( apiEndpoint.maxRequestsPerMinutePerIP != null && curRateLimitForIP >= maxRequestsPerMinutePerIP && apiEndpoint.maxRequestsPerMinutePerIP > 0) {

                    //console.log("apiEndpoint.maxRequestsPerMinutePerIP: ", apiEndpoint.maxRequestsPerMinutePerIP)
                    //console.log("API RATE LIMITED!")
                    
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
                app.rateLimiterMemory[rateLimiterKey] += 1;

                if ( reqInfos.headers == null || Object.keys(reqInfos.headers).length == 0 ){
                    //read headers
                    req.forEach((k, v) => {
                        reqInfos.headers[k] = v;
                    });
                }
                

                //read the body only if needed
                if (reqInfos.method != "get") {
                    if (reqInfos.body == null){
                        reqInfos.body = await tools.getBody(req, res, true);
                    }
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
                                    
                                    const stream = response.data;
                                    //tools.pipeStreamOverResponse(res, stream, stream.length, memory);
                                    //return;

                                    var respContentType = response.headers["content-type"];
                                    //console.log("response ctype: " + respContentType);
                                    
                                    //do rewriting (TODO: should call a backend function defined in appconfig.json)
                                    if ( respContentType != null && respContentType.indexOf("text/html") > -1 || respContentType.indexOf("text/css") > -1 || respContentType.indexOf("text/javascript") > -1 )
                                    {
                                        //text content, rewrite is possible
                                        var finalContent = await tools.streamToString(stream);

                                        //we can also inject some JS or CSS in the finalContent
                                        //finalContent = finalContent.replace(/Google/g, "Zulu");
                                        //finalContent = finalContent.replace(/<\/html>/g, "<script src='https://yourdomain.com/inject.js'></script></html>");

                                        //console.log("Before postProcessor");
                                        //console.log(apiEndpoint);

                                        var postProcessor = null;
                                        if (apiEndpoint.postProcessor != null) {
                                            postProcessor = apiEndpoint.postProcessor;

                                            curFunction = require( require("path").join(appConfig.root, postProcessor ) );
                                            functionHandlerFunction = apiEndpoint.handler.split('.')[1];
                
                                            var path = reqInfos.url;
                                            if ( curRoute != null && curRoute.endsWith('/*')) {
                                                path = reqInfos.url.substring(curRoute.length - 3);
                                            }
                                            var event = {
                                                httpMethod: reqInfos.method.toUpperCase(),
                                                method: reqInfos.method.toUpperCase(),
                                                url: path,
                                                path: path,
                                                ip: reqInfos.ip,
                                                query: reqInfos.query,
                                                queryStringParameters: qs.parse(reqInfos.query),
                                                body: finalContent,
                                                headers: response.headers
                                            };

                                            //console.log("Executing postProcessor");
                                            var result = await ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig, beginPipeline);
                                            //res.end(result.content);

                                            //todo handle headers from rewriter
                                        }
                                        else{
                                            //no preProcessor defined
                                            res.end(finalContent);
                                        }
                                        
                                    }
                                    else{
                                        //binary content, no rewrite
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

                //undefined function type == nodejs
                if ( apiEndpoint.type == null ){
                    apiEndpoint.type = "nodejs12.x";
                }

                // TODO : check path doesn't crash
                let supportedTypes = ['nodejs6.x', 'nodejs8.x', 'nodejs10.x', 'nodejs12.x', 'nodejs14.x', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SQLSELECT', 'SQLINSERT', 'SQLUPDATE', 'SQLDELETE', 'SQL'];
                if (!supportedTypes.includes(apiEndpoint.type)) {
                    resolve({
                        status: "415",
                        processed: true,
                        content: `${apiEndpoint.type} is not supported on Cloudgate`
                    });
                    return;
                } else {

                    //enforce declared method
                    /*
                    if (apiEndpoint.method !== reqInfos.method.toUpperCase() && apiEndpoint.method != null) {
                        resolve({
                            processed: true,
                            status: '404',
                            content: `Cannot ${reqInfos.method.toUpperCase()} ${apiEndpoint.src}`,
                        })
                        return;
                    }
                    */

                    let contentType = reqInfos.headers['content-type'];
                    var finalQueryObj = {}; var FILES = [];
                    if (reqInfos.method === 'get') {
                        finalQueryObj = parseURLEncParams(reqInfos.query);
                    } else {
                        
                        if (contentType != null && Object.keys(bodyParserTool).includes(contentType.split(';')[0] )) {
                            finalQueryObj = bodyParserTool[contentType.split(';')[0]](reqInfos.body);
                        }
                        else if (contentType != null && contentType.indexOf("multipart/form-data") > -1) {
                            var event = {"httpMethod": reqInfos.method.toUpperCase()};
                            event[reqInfos.method.toUpperCase()] = {};

                            parseFormData(reqInfos.body, contentType, event); //mutate the event to add FILES & POST
                            finalQueryObj = event[event.httpMethod];
                            FILES = event.FILES;
                            //console.log(finalQueryObj);
                        } 
                        else {
                            finalQueryObj = parseAppJsonBody(reqInfos.body);
                        }

                        //console.log(finalQueryObj);
                    }
                    if (apiEndpoint.isPrivate) {
                        if (!finalQueryObj.apiKey) {
                            resolve({
                                processed: true,
                                status: 430,
                                content: 'No apiKey received. Forbidden'
                            });
                            return;
                        } else {
                            if (finalQueryObj.apiKey !== appConfig.globalEnv.APIKEY) {
                                resolve({
                                    processed: true,
                                    status: 430,
                                    content: 'Wrong apiKey received. Forbidden'
                                });
                                return;
                            }
                        }
                        delete finalQueryObj.apiKey;
                    }
                    if (!apiEndpoint.type.includes('nodejs')) {
                        
                        //SQL Source
                        var cacheSQLKey = `${apiEndpoint.src}${functionIndexFile}.sql`;
                        var sqlRequest = "";
                        //sqlRequest = fs.readFileSync(`${apiEndpoint.src}${functionIndexFile}.sql`, 'utf-8');
                        
                        if ( cacheSQLFunctionsSource[cacheSQLKey] == null ){
                            sqlRequest = fs.readFileSync(cacheSQLKey, 'utf-8');
                            cacheSQLFunctionsSource[cacheSQLKey] = sqlRequest;
                        }
                        else{
                            sqlRequest = cacheSQLFunctionsSource[cacheSQLKey];
                        }
                        
                        //VisualSQL + RAW SQL support
                        if (apiEndpoint.type.slice(0,3) === 'SQL' || apiEndpoint.type == 'SELECT' || apiEndpoint.type == 'INSERT' || apiEndpoint.type == 'UPDATE' || apiEndpoint.type == 'DELETE') {
                            let findParam = sqlRequest.split(' ');
                            findParam = findParam.filter((val) => {
                                if (val[0] === '@') {
                                     return val;
                                }
                            });
                            findParam.forEach((param, index) => {
                                param = param.replace('@PARAM_', "");
                                if (finalQueryObj[param]) {
                                    var val = finalQueryObj[param].replace(/\'/g, "''"); //SQL Injection prevention
                                    sqlRequest = sqlRequest.replace(`@PARAM_${param}`, val);
                                    findParam.splice(index, 1);
                                };
                            });
                            if (findParam.length > 0) {
                                resolve({
                                    processed: true,
                                    status: 400,
                                    content: `Parameters : ${findParam.join()} not given.`
                                });
                                return;
                            }
                        }
                        //console.log(sqlRequest);
                        
                        //replace params in SQL Query
                        var allParams = Object.keys(finalQueryObj);
                        if ( allParams != null && allParams.length > 0) {
                            for (var i = 0; i < allParams.length; i++){
                                var curParam = allParams[i];
                                //console.log("replacing @PARAM_" + curParam + " with: " + finalQueryObj[curParam])
                                sqlRequest = tools.replaceAll(sqlRequest, "@PARAM_" + curParam, finalQueryObj[curParam].replace(/\'/g, "''"));
                            }
                        }
                        //console.log(sqlRequest);

                        let rows = await apiDB.ExecuteQuery(appConfig, sqlRequest);
                        //console.log(rows);

                        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
                        var durationMS = (nanoSeconds/1000000).toFixed(2);

                        resolve({
                            processed: true,
                            content: {"Table": rows},
                            headers: {"content-type": "application/json; charset=utf-8", "api": durationMS + "ms"},
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
                    if (appConfig.globalEnv) {
                        process.env.APPID = appConfig.globalEnv.APPID
                        process.env.APIKEY = appConfig.globalEnv.APIKEY
                    }
                    if (apiEndpoint.envVars) {
                        Object.keys(apiEndpoint.envVars).forEach(envVar => {
                            if (forbiddenEnvVars.includes(envVar)) {
                                return;
                            }
                            process.env[envVar] = apiEndpoint.envVars[envVar];
                        });
                    }
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
                event[event.httpMethod] = finalQueryObj;
                event.FILES = FILES;

                /*
                let contentType = reqInfos.headers['content-type'];
                if (contentType != null && contentType.indexOf("multipart/form-data") > -1) {
                    parseFormData(reqInfos.body, contentType, event); //mutate the event to add FILES & POST
                } 
                */
                
                //EXECUTE FUNCTION
                ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig, beginPipeline);

            }
            else{
                // No matching endpoint
                resolve({
                    processed: false
                });
            }
        });

    }
}


let forbiddenEnvVars = ['PATH','LS_COLORS','SSH_CONNECTION','LESSCLOSE','LANG','USER','PWD','HOME','SSH_CLIENT','SSH_TTY','MAIL','TERM','SHELL','NVM_BIN','SHLVL','LOGNAME','PATH','NVM_INC','XDG_SESSION_ID','XDG_RUNTIME_DIR','_']

async function ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig, beginPipeline){

    //console.log("Going to execute: ");
    //console.log(apiEndpoint);

    var ctx = {
        succeed: function(result) {
            //console.log(result)
        },
        fail: function(error) {
            console.log(error);
        }
    };
    var callback = function(err, response, logs) {

        if (err != null) {
            //console.log("isError")
            console.log(err);
        } else {
            //console.log("isResponse")
            //console.log(response);
        }

        //prevent a crash if the cloud function don't return anything
        if (response == null){
            response = {"content": "No content returned by the cloud function ..."};
        }

        var headers = {};
        if ( response != null && response.headers != null ){
            headers = response.headers;
        }

        //ALLOW CORS
        
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "GET,HEAD,OPTIONS,POST,PUT";
        headers["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept, Authorization";

        //add default content-type & charset if nothing is defined
        if ( response != null && headers["Content-Type"] == null && headers["content-type"] == null ){
            headers["Content-Type"] = "application/json; charset=utf-8";
        }
        
        //Cloudbackend support (should be moved to cloudgate-cloudbackend as an exported function)
        if (apiEndpoint.output != null && apiEndpoint.output == "GATEWAYBASE64"){
            try{
                response.body = Buffer.from(response.body, 'base64');
            }
            catch(ex){
                //response.body = "apiEndpoint output is configured as GATEWAYBASE64 but it's returning non base64...";
            }
        }
        if (apiEndpoint.output != null && apiEndpoint.output == "GATEWAY"){
            //console.log(response)
            try{
                //response.content = {"payload": response};
                var newResp = {
                    output: "GATEWAY",
                    statusCode: response.content.statusCode,
                    headers: response.content.headers,
                    content: response.content.body
                }
                response = newResp;
            }
            catch(ex){
                
            }
        }
        if (apiEndpoint.output != null && apiEndpoint.output == "JSON"){
            try{
       
                var fullResp = {
                    status: (response.status || response.statusCode || 200),
                    content: {"payload": response, "logs": logs}
                };
                response = fullResp;
            }
            catch(ex){
                
            }
        }

        //console.log(JSON.stringify(response))
        //console.log(response.content || response.body || response);
        
        //already done globally in router.js
        /*
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000).toFixed(2);
        headers["durationMS"] = durationMS;
        */

        if ( response != null && response.output == "GATEWAY"){
            //console.log("here1: ", response)
            resolve({
                status: (response.status || response.statusCode || 200),
                processed: true,
                headers: response.headers,
                content: response.content || response.body || response
            });
        }
        else if (typeof response == "object") {
       
            var isCompressible = false;
            try{
                if ( headers["Content-Type"] != null ){
                    if (headers["Content-Type"] == "application/json" || headers["Content-Type"].indexOf("text") > -1 || headers["Content-Type"].indexOf("xml") > -1 || headers["Content-Type"].indexOf("csv") > -1 || headers["Content-Type"].indexOf("utf8") > -1 ){
                        isCompressible = true;
                    }
                }
                if ( headers["content-type"] != null ){
                    if (headers["content-type"] == "application/json" || headers["content-type"].indexOf("text") > -1 || headers["content-type"].indexOf("xml") > -1 || headers["content-type"].indexOf("csv") > -1 || headers["content-type"].indexOf("utf8") > -1 ){
                        isCompressible = true;
                    }
                }
            }
            catch(exCompressible){

            }
            
            
            var tmpContent = null;

            if ( headers["Content-Encoding"] == null && isCompressible){
                headers["Content-Encoding"] = "gzip";
                tmpContent = response.content || response.body || response;

                if ( isString(tmpContent) ){
                    tmpContent = tools.GzipContent(tmpContent);
                }
                else{
                    tmpContent = tools.GzipContent(JSON.stringify(tmpContent));
                }
                
            }
            else{
                tmpContent = response.content || response.body || response;
            }
            
            resolve({
                status: (response.status || response.statusCode || 200),
                processed: true,
                headers: headers,
                content: tmpContent
            });
        }
        else {
            //console.log("here3: ", response)
            if ( !isTypedArray(response) && !isString(response) && !isArrayBuffer(response) ){
                response = response + ""; //cast to string
            }
            resolve({
                status: (response.status || 200),
                processed: true,
                headers: headers,
                content: response
            });
        }


    };

    var result = null;
    var execLogs = [];
    
    try {
        ctx.sharedmem = sharedmem;
        ctx.apiDB = apiDB;
        ctx.appConfig = appConfig;
        ctx.apiEndpoint = apiEndpoint;
      
        //CAPTURE console.log()
        
        fixture.capture( function onWrite (string, encoding, fd) {
            execLogs.push(JSON.parse(string));
            // If you return `false`, you'll prevent the write to the original stream (useful for preventing log output during tests.)
            return true;
        });
        

        //DO EXECUTION
        result = await curFunction[functionHandlerFunction](event, ctx, callback);

        /*
        result = await new Promise( function(resolve, reject){
            resolve( curFunction[functionHandlerFunction](event, ctx, callback));
        })
        */

        //RELEASE console.log()
        fixture.release();

        //this seems to works only for async functions ...
        //console.log(execLogs)

        if (apiEndpoint.output != null && apiEndpoint.output == "JSON"){
            try{
                var fullResp = {
                    status: (response.status || response.statusCode || 200),
                    //content: {"payload": JSON.parse(response)}
                    content: JSON.parse(response),
                    logs: execLogs
                };
                result = fullResp;
            }
            catch(ex){
                
            }
        }

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
    else{
        ////DISABLED because it's preventing non async function to work ... (ex: maxsens/api/testQR)
        //no callback from the cloud function, let's return an empty string in this case to avoid infinite wait
        //callback(null, "", execLogs);

        //TODO: implement a timeout (appconfig) and stop execution after a certain amount of time + return logs + TIMEOUT MSG + duration configured
    }
    return;

}

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

function isTypedArray(a) { return !!(a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT); }

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

const hasArrayBuffer = typeof ArrayBuffer === 'function';
function isArrayBuffer(value) {
  return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
}


const parseURLEncParams = (body)  => {
    body = body.toString('utf8');
    body = new URLSearchParams(body);
    let finalBody = {};
    for (const[key, value] of body) {
        finalBody[key] = value;
    }
    return finalBody;
};

const parseAppJsonBody = (body) =>  {
    try {
        body = JSON.parse(body);
    } catch (err) {
        body = {};
    }
    return body;
};


const parseFormData = (body, contentType, event) => {
    
    //console.log(contentType)
    var files = [];
    var keyValues = [];
    var parts = coregate.getParts(body, contentType);
    //console.log(parts)

    for(var i=0; i<parts.length;i++){
        var curPart = parts[i];
        //console.log(curPart.get("name"));
        //console.log(curPart);

        if (curPart["filename"] != null){
            files.push(curPart);
            //console.log("file added for name: " + curPart.get("name"));
        }
        else{
            //set key/values directly on the event.POST/PUT/PATCH
            event[event.httpMethod][curPart["name"]] = Buffer.from( curPart["data"] ).toString();
            //console.log("KV added for name: " + curPart.get("name"));
        }

        /*
        if (curPart.get("filename") != null){
            var newFile = {
                "name": curPart.get("name"),
                "type": curPart.get("type"),
                "filename": curPart.get("filename"),
                "data": curPart.get("data")
            };
            newFile.path = newFile;
            files.push(newFile);
            //console.log("file added for name: " + curPart.get("name"));
        }
        else{
            //set key/values directly on the event.POST/PUT/PATCH
            event[event.httpMethod][curPart.get("name")] = Buffer.from( curPart.get("data") ).toString();
            //console.log("KV added for name: " + curPart.get("name"));
        }
        */
    }
    

    event.FILES = files;
    return event;
}

const bodyParserTool = {
    'application/json': parseAppJsonBody,
    'application/x-www-form-urlencoded': parseURLEncParams
}


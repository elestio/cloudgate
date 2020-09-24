var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('../lib/tools.js');
var multiparty = require('multiparty');

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
                        if (endpointTarget.startsWith(prefix) && reqInfos.url.indexOf(".well-known/acme-challenge") == -1) {
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
                                    if ( respContentType.indexOf("text/html") > -1 || respContentType.indexOf("text/css") > -1 || respContentType.indexOf("text/javascript") > -1 )
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
                                            var result = await ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig);
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
                let supportedTypes = ['nodejs12.x', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SQLSELECT', 'SQLINSERT', 'SQLUPDATE', 'SQLDELETE'];
                if (!supportedTypes.includes(apiEndpoint.type)) {
                    resolve({
                        status: "415",
                        processed: true,
                        content: `${apiEndpoint.type} is not supported on Cloudgate`
                    });
                    return;
                } else {
                    if (apiEndpoint.method !== reqInfos.method.toUpperCase() && apiEndpoint.method != null) {
                        resolve({
                            processed: true,
                            status: '404',
                            content: `Cannot ${reqInfos.method.toUpperCase()} ${apiEndpoint.src}`,
                        })
                        return;
                    }
                    let contentType = reqInfos.headers['content-type'];
                    let finalQueryObj = {};
                    if (reqInfos.method === 'get') {
                        finalQueryObj = parseURLEncParams(reqInfos.query);
                    } else {
                        if (Object.keys(bodyParserTool).includes(contentType)) {
                            finalQueryObj = bodyParserTool[contentType](reqInfos.body);
                        } else {
                            finalQueryObj = parseAppJsonBody(reqInfos.body);
                        }
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
                        let sqlRequest = fs.readFileSync(`${apiEndpoint.src}${functionIndexFile}.sql`, 'utf-8');
                        if (apiEndpoint.type.slice(0,3) === 'SQL') {
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
                
                //EXECUTE FUNCTION
                ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig);

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

async function ExecuteFunction(apiEndpoint, curFunction, functionHandlerFunction, resolve, event, appConfig){

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


function isTypedArray(a) { return !!(a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT); }

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

const hasArrayBuffer = typeof ArrayBuffer === 'function';
function isArrayBuffer(value) {
  return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
}


const parseURLEncParams = (body)  => {
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

const parseFormData = (body) => {
    return Promise((resolve, reject) => {
        let form = new multiparty.Form();
        form.parse(body, (err, fields, files) => {
            Object.keys(fields).forEach((value) => {
                console.log(value);
            })
        });
    })
}

const bodyParserTool = {
    'application/json': parseAppJsonBody,
    'application/x-www-form-urlencoded': parseURLEncParams,
    'multipart/form-data': parseFormData,
}
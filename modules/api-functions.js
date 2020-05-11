var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const tools = require('../lib/tools.js');

var functionsCache = {};

module.exports = {
  name: "api-functions",
  process : (appConfig, reqInfos, res, req, memory) => {
    return new Promise( async function (resolve, reject) {

      var functionsList = appConfig.apiEndpoints;
      if ( functionsList == null ) {
          functionsList = [];
      }

      var endpointTarget = reqInfos.url.split('?')[0];
      var apiEndpoint = functionsList[endpointTarget];
      if (typeof(apiEndpoint) != 'undefined') {
        var functionIndexFile = apiEndpoint.handler.split('.')[0];
        var functionHandlerFunction = apiEndpoint.handler.split('.')[1];
        // TODO : check path doesn't crash
        var functionPath = tools.safeJoinPath("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js');
        // TODO : check not using ../ (lower level from app root)

        //read headers
        req.forEach((k, v) => {
            reqInfos.headers[k] = v;
        });

        //read the body only if needed
        if ( reqInfos.method != "get" ){
            reqInfos.body = await tools.getBody(req, res);
        }
        
        //AWS Lambda Executor (tested at 2K RPS with -c128 in wrk on Hetzner to AWS direction)
        if (appConfig.AWS != null && appConfig.TypeAPI == "LAMBDA"){
            
            var begin = process.hrtime();

            var aws = require('aws-sdk');
            var lambda = new aws.Lambda({ region: appConfig.AWS.region, accessKeyId: appConfig.AWS.accessKeyId, secretAccessKey: appConfig.AWS.secretAccessKey });
            var params = {
                FunctionName: apiEndpoint.src, 
                InvocationType: "RequestResponse", 
                LogType: "Tail", 
                Payload: JSON.stringify(reqInfos)
            };
            lambda.invoke(params, function(err, data) {
                if (err) { 
                    //console.log(err, err.stack); 

                    const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                    var durationMS = (nanoSeconds/1000000);
                    resolve({
                        processed: true,
                        status: 500,
                        error: err.code,
                        content: err.code + ": " + err.message + "\nPlease check your AWS credentials / region / bucket in appConfig.json",
                        durationMS: durationMS
                    });

                }
                else  {  
                    var logs = new Buffer.from(data.LogResult, 'base64').toString('utf8');
                    
                    //console.log(payload);  
                    //console.log(logs);  

                    var payload = JSON.parse(data.Payload);

                    const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
                    var durationMS = (nanoSeconds/1000000);
                    //console.log("Lambda exec: " + durationMS + "ms");

                    if ( typeof payload == "object" ){
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
            return ;
        }

        try{
            curFunction = require(functionPath);
        }
        catch(ex){
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
        var callback = function (err, response) {
          
            if (err != null) {
            console.log(err);
          } else {
            //console.log(response);
          }

          if ( typeof response == "object" ){
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


        

        var result = null;

        try{
            result = curFunction[functionHandlerFunction](event, ctx, callback);
        }
        catch(ex){
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
        return ;
      }
      // No matching endpoint
      resolve({
        processed: false
      });
    });
   
  }
}
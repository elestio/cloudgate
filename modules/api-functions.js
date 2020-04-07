var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const utils = require('../lib/tools.js');

var functionsCache = {};

module.exports = {
  process : (appConfig, req) => {
    return new Promise(function (resolve, reject) {
      var functionsList = appConfig.apiEndpoints;
      var endpointTarget = req.getUrl().split('?')[0];
      var apiEndpoint = functionsList[endpointTarget];
      if (typeof(apiEndpoint) != 'undefined') {
        //console.log(apiEndpoint);
        var functionIndexFile = apiEndpoint.handler.split('.')[0];
        var functionHandlerFunction = apiEndpoint.handler.split('.')[1];
        var functionPath = path.join("../", appConfig.root, apiEndpoint.src, functionIndexFile + '.js').replace(/\\/g, "/");
        // TODO : check not using ../ (lower level from app root)
        curFunction = require(functionPath);
        if (curFunction[functionHandlerFunction] == undefined) {
          console.log("handler not found");
          // TODO : Handle error here AND RETURN
        }
        var event = {};
        var ctx = {
          succeed: function(result) {
            console.log(result)
          },
          fail: function(error) {
            console.log(error);
          }
        };
        var callback = function (err, response) {
          if (err != null) {
            console.log(err);
          } else {
            console.log(response);
          }
          resolve({
            processed: true,
            content: response
          });
        };
        var result = curFunction[functionHandlerFunction](event, ctx, callback);
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
    //prepare functions cache
   /* console.log("Registering API endpoints ...");
    for (var key in functionsList.length) {
      var curFunctionObj = functionsList[key];

      console.log(__dirname + " - " + appConfig.root + " - " + curFunctionObj.handler);
      var functionIndexFile = curFunctionObj.handler.split('.')[0];
      var functionHandlerFunction = curFunctionObj.handler.split('.')[1];
      var functionPath = path.join(appConfig.root, curFunctionObj.src, functionIndexFile + '.js');
      // TODO : check not using ../ (lower level from app root)
      
      var curFunction = require(functionPath);
      if (curFunction[functionHandlerFunction] == undefined) {
        console.log("handler not found");
        // TODO : Handle error here
      }
      functionsCache[curFunctionObj.vpath] = curFunction;
      console.log(curFunctionObj.vpath + " >>> " + curFunctionObj.handler);
    }*/

    //Registering all functions
    /*for (var key in functionsCache)
    {
        app.any(key, async (res, req) => {

            //Ensure this request is notified on aborted
            res.onAborted(() => {
                res.aborted = true;
            });

            try {
                //TODO: could be replaced by firecracker or at least a way to isolate the process (v8 isolate?)
                var baseUrl = req.getUrl().split('?')[0];
                functionsCache[baseUrl](res, req, utils);
            }
            catch (ex) {

                //console.log(ex);
                var erroMSG = ex + ""; //force a cast to string
                if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                    console.log("Error while processing a function: " + JSON.stringify(curFunctionObj));
                    console.log(ex);
                }

            }

        })
    }*/
  }
}
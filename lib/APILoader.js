var zlib = require('zlib');
var fs = require('fs');
const mime = require('mime');
const qs = require('querystring');
const utils = require('./Tools.js');

module.exports = (app, appPath, API_Token) => {

    var jsonContent = fs.readFileSync(appPath);
    var apiDefinition = JSON.parse(jsonContent);
    //console.log(apiDefinition);

    var functionsList = apiDefinition.apiEndpoints;
    var functionsCache = {};

    //prepare functions cache
    console.log("Registering API endpoints ...");
    for (var i = 0; i < functionsList.length; i++) {
        var curFunctionObj = functionsList[i];
        var curFunctionFolder = require('path').dirname(curFunctionObj.handler);
        var curFunctionInit = require(curFunctionObj.handler)(app, curFunctionFolder, API_Token);
        var curFunction = require(curFunctionObj.handler).process;
        functionsCache[curFunctionObj.vpath] = curFunction;
        console.log(curFunctionObj.vpath + " >>> " + curFunctionObj.handler);
    }

    //Registering all functions
    for (var key in functionsCache)
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
    }
   
}
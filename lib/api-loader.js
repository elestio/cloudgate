var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const utils = require('./tools.js');

module.exports = (app, appPath, API_Token) => {

    var jsonContent = fs.readFileSync(appPath);
    var appRoot = path.dirname(appPath);

    var apiDefinition = JSON.parse(jsonContent);
    //console.log(apiDefinition);

    var functionsList = apiDefinition.apiEndpoints;
    var functionsCache = {};

    //prepare functions cache
    console.log("Registering API endpoints ...");
    for (var i = 0; i < functionsList.length; i++) {
        var curFunctionObj = functionsList[i];
        var curFunctionFolder = path.dirname(curFunctionObj.handler);

        console.log(curFunctionFolder);

        //var functionPath = path.join(__dirname, '..', appRoot, curFunctionObj.handler);
        console.log(__dirname + " - " + appRoot + " - " + curFunctionObj.handler);
        var functionPath = path.join(appRoot, curFunctionObj.handler);
        if ( appRoot.startsWith("./") ){
            functionPath = path.join(__dirname, '..', appRoot, curFunctionObj.handler);
        }

        var curFunctionInit = require(functionPath)(app, curFunctionFolder, API_Token);
        var curFunction = require(functionPath).process;
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
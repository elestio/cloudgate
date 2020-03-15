var zlib = require('zlib');
var fs = require('fs');
const mime = require('mime');
const qs = require('querystring');
const utils = require('./Tools.js');

module.exports = (app, appPath, API_Token) => {

    var jsonContent = fs.readFileSync(appPath);
    var apiDefinition = JSON.parse(jsonContent);
    console.log(apiDefinition);

    var functionsList = apiDefinition.apiEndpoints;
    for (var i = 0; i < functionsList.length; i++) {

        var curFunctionObj = functionsList[i];
        var curFunctionFolder = require('path').dirname(curFunctionObj.handler);
        var curFunctionInit = require(curFunctionObj.handler)(app, curFunctionFolder, API_Token);
        var curFunction = require(curFunctionObj.handler).process;
        app.any(curFunctionObj.vpath, async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {
            //TODO: could be replaced by firecracker
            //Or at list a way to isolate the process
            curFunction(res, req);
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

        console.log(curFunction.process);

    }

    app.any('/APPLOADER_TODO', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            var curURL = req.getUrl();
            var body = await utils.getBody(req, res);



            var result = {};
            result.Table = rows;
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            res.writeHeader("core-cache", "0");
            GzipResponse(res, JSON.stringify(result));
            return;


        }
        catch (ex) {

            //console.log(ex);
            var erroMSG = ex + ""; //force a cast to string
            if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                console.log("Error11819: ");
                console.log(ex);
            }

        }

    })
}


function GzipResponse(res, content) {
    res.writeHeader("content-type", "application/json;charset=utf-8;");
    res.writeHeader('Content-Encoding', 'gzip');

    //This is 2 times faster compared to the async
    var buff = zlib.gzipSync(content);
    if (!res.aborted) {
        res.end(buff);
    }
}
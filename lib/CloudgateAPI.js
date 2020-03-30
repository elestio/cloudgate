var zlib = require('zlib');
var fs = require('fs');
const mime = require('mime');
const qs = require('querystring');
const tools = require('./Tools.js');

var Redis = require("ioredis");

//this API is intended to control Cloudgate from remote systems or Web UI (load / reload an app, live stats, firewall rules editor ...)

module.exports = (app, ip, port, API_Token) => {

    var redis = new Redis(port, ip);

    app.any('/cloudgate/App/Add', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            //TODO: implementation

            var result = {}; 
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            tools.GzipResponse(res, JSON.stringify(result));
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

    app.any('/cloudgate/App/Update', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            //TODO: implementation

            var result = {}; 
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            tools.GzipResponse(res, JSON.stringify(result));
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

    app.any('/cloudgate/App/Reload', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            //TODO: implementation

            var result = {}; 
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            tools.GzipResponse(res, JSON.stringify(result));
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

    app.any('/cloudgate/App/Delete', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            //TODO: implementation

            var result = {}; 
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            tools.GzipResponse(res, JSON.stringify(result));
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
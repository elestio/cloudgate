var zlib = require('zlib');
var nbExecs = 0;

module.exports = async (app, curFunctionFolder, API_Token, res, req) => {
        //init: this code is executed only for cold starts
        nbExecs = 0;
}

module.exports.process = (res, req) => {
    
        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });
        

        try {

            var curURL = req.getUrl();

            nbExecs += 1;

            var result = {};
            result.test = "nbExecs: " + nbExecs;
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            res.writeHeader("core-cache", "0");
            
            //GzipResponse(res, JSON.stringify(result));
            res.end(JSON.stringify(result));

            return;


        }
        catch (ex) {

            //console.log(ex);
            var erroMSG = ex + ""; //force a cast to string
            if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                console.log("Error11819: ");
                console.log(ex);
            }

            res.end(ex + "");

        }
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
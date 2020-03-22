var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var os = require("os");

const tools = require('./Tools.js');

module.exports = (app, certPath, rootFolder) => {

    //serv verification payload to letsencrypt
    app.any('/.well-known/*', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        var uri = req.getUrl();
        var filename = path.join(certPath, uri);
        var isForbiddenPath = uri.length < 3 || filename.indexOf(certPath) !== 0;

        if (isForbiddenPath) {
            console.log("certpath: " + certPath);
            logger && logger.info('Forbidden request on LetsEncrypt %s', filename);
            res.writeStatus(403);
            res.end("Forbidden request on LetsEncrypt, isForbiddenPath: " + filename);
            return;
        }

        console.log("LetsEncrypt CA trying to validate challenge: " + filename);

        fs.stat(filename, function(err, stats) {
            if (err || !stats.isFile()) {
                res.writeStatus("404");
                res.end("404 NOT FOUND");
                return;
            }

            res.writeStatus(200);
            //fs.createReadStream(filename, "binary").pipe(res);

            var fileContent = fs.readFileSync(filename);
            //console.log("filename: " + filename);
            res.end(fileContent);

        });

        

    })
}

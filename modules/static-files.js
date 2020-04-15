var fs = require('fs');
const mime = require('mime');
const tools = require('../lib/tools.js');

var rootFolder = null;

var fileMonitorStarted = false;

module.exports = {
    name: "static-files",
    process: (appConfig, reqInfos, res, req, memory) => {

        if (rootFolder == null) {
            rootFolder = tools.safeJoinPath(appConfig.root, appConfig.publicFolder);
        }
        var curURL = reqInfos.url.split('?')[0];

        if (appConfig.AWS == null) {
            if (!fileMonitorStarted) {
                fileMonitorStarted = true;
                console.log("Listening to file changes on: " + rootFolder);
                const chokidar = require('chokidar');
                chokidar.watch(rootFolder, {
                    ignored: /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true
                }).on('all', (event, path) => {
                    //console.log(event, path);
                    if (event == "change") {
                        //invalidate whole app cache, todo: invalidate only the correct cache entries
                        console.log("File update detected: " + path);
                        console.log("Clearing cache for app: " + appConfig.root);
                        memory.clear(appConfig.root);
                    }
                });
            }
        }

        //serve the public folder
        var finalPath = curURL;
        if (finalPath == "/") {
            finalPath = "/index.html"; //default document in a folder
            //console.log(finalPath);
        }

        var result = {
            processed: true,
            status: 200,
            error: '',
            content: '',
            headers: {},
        };



        return new Promise(function(resolve, reject) {

            try {

                //Poison Null Bytes protection
                //Poison null bytes are a way to trick your code into seeing another filename than the one that will actually be opened. This can in many cases be used to circumvent directory traversal protections, to trick servers into delivering files with wrong file types and to circumvent restrictions on the file names that may be used
                if (finalPath.indexOf('\0') !== -1) {
                    result.status = 400;
                    result.error = "Poison Null Bytes detected!";
                    resolve(result);
                    return;
                }

                //protection agains directory traversal
                var fullPath = tools.safeJoinPath(rootFolder, finalPath);
                if (!fullPath.startsWith(rootFolder) && !("./" + fullPath).startsWith(rootFolder)) {
                    result.status = 400;
                    result.error = "Directory traversal detected!";
                    resolve(result);
                    return;
                }


                //define maxAge for caching            
                var maxAge = 30;
                var rawPath = finalPath.split('?')[0];
                var fileExt = "";
                var fileExt = rawPath.split('.').pop().toLowerCase();

                if (fileExt == "" || fileExt == "html" || fileExt == "htm") { maxAge = 5; }
                else if (fileExt == "ico" || fileExt == "png" || fileExt == "jpg" || fileExt == "gif" || fileExt == "svg") { maxAge = 604800; }
                else if (fileExt == "woff" || fileExt == "woff2" || fileExt == "ttf" || fileExt == "otf" || fileExt == "eot") { maxAge = 604800; }
                else if (fileExt == "css" || fileExt == "js" || fileExt == "txt" || fileExt == "json" || fileExt == "xml") { maxAge = 600; }
                else if (fileExt == "xls" || fileExt == "xlsx" || fileExt == "ppt" || fileExt == "pptx" || fileExt == "doc" || fileExt == "docx" || fileExt == "pdf" || fileExt == "zip" || fileExt == "rar") { maxAge = 86400; }
                else if (fileExt == "ogg" || fileExt == "mp3" || fileExt == "mp4" || fileExt == "mov" || fileExt == "wmv" || fileExt == "avi" || fileExt == "webm") { maxAge = 86400; }


                try {
                    //TODO: must be moved in the router because of caching system

                    //handle 304 Not Modified
                    var ifmodifiedsince = reqInfos["if-modified-since"];
                    if (ifmodifiedsince != null && typeof (ifmodifiedsince) != 'undefined' && ifmodifiedsince != "") {
                        var ms = Date.parse(ifmodifiedsince);
                        var now = +new Date();

                        if ((ms) > (now - (maxAge * 1000))) {
                            result.status = 304;
                            resolve(result);
                            return;
                        }
                        else {
                            /*
                            console.log("*****************");
                            console.log("path: " + fullPath);
                            console.log("ms: " + (ms));
                            console.log("maxAge: " + (maxAge*1000));
                            console.log("now: " + (now ));
                            console.log("*****************");
                            */
                        }
                    }
                }
                catch (ex) {
                    if (ex.indexOf("Invalid access of discarded") == -1) {
                        console.log("ShouldNotHappend2451: ");
                        console.log(ex);
                    }
                }

                //set content type
                try {
                    //this will crash if no extension is provided in the url
                    if ( result.headers["Content-Type"] == null || result.headers["Content-Type"] == "" ){
                        result.headers["Content-Type"] = mime.getType(finalPath);
                    }
                    
                }
                catch (ex) {

                }


                var urlParams = reqInfos.query;
                var cacheKey = curURL;//reqInfos.curURL + "?" + urlParams;

                //Handle AWS S3
                if (appConfig.AWS != null) {

                    var aws = require('aws-sdk');
                    var s3 = new aws.S3({ region: appConfig.AWS.region, accessKeyId: appConfig.AWS.accessKeyId, secretAccessKey: appConfig.AWS.secretAccessKey });

                    var s3Path = tools.safeJoinPath(appConfig.publicFolder, finalPath);
                    var getParams = {
                        Bucket: appConfig.AWS.bucket,
                        Key: s3Path
                    }

                    //console.log("bucket: " + appConfig.AWS.bucket + " - s3 path: " + s3RootPath + finalPath);

                    //Fetch or read data from aws s3
                    s3.getObject(getParams, function(err, data) {

                        if (err) {
                            //console.log(err);

                            result.status = 404;
                            result.content = "404 NOT FOUND";
                            result.error = "NOT FOUND";
                            resolve(result);
                            return;

                        } else {
                            //console.log(data.Body.toString()); //this will log data to console

                            result.headers['Last-Modified'] = data.LastModified  + "";
                            result.headers['ETag'] = data.ETag + "";
                            result.headers['Content-Type'] = data.ContentType + "";

                            var processingNeeded = false;
                            if (finalPath.endsWith(".html") || finalPath.endsWith(".css") || finalPath.endsWith(".js") || finalPath.endsWith(".json") || finalPath.endsWith(".xml") || finalPath.endsWith(".txt")) {
                                processingNeeded = 1;
                            }
                            if (processingNeeded) {
                                result.headers['Content-Encoding'] = 'gzip';
                                result.content = tools.GzipContent(data.Body.toString());
                            }
                            else {
                                result.content = data.Body;
                            }

                            resolve(result);
                        }

                    })

                    return;

                }

                //check if file exist
                try {
                    if (fs.existsSync(fullPath)) {
                        //file exists
                        console.log("served from disk: " + fullPath);

                        result.headers["core-cache"] = "0";
                        result.headers["cache-control"] = "public, max-age=" + maxAge;
                        result.headers["expires"] = new Date(Date.now() + maxAge * 1000).toUTCString();
                        result.headers["last-modified"] = new Date(Date.now()).toUTCString();

                        //check if processing is needed or if we should serv the raw file
                        var processingNeeded = false;
                        if (curURL.endsWith(".html") || curURL.endsWith(".css") || curURL.endsWith(".js") || curURL.endsWith(".json") || curURL.endsWith(".xml") || curURL.endsWith(".txt")) {
                            processingNeeded = 1;
                        }
                        if (processingNeeded) {
                            var fileContent = fs.readFileSync(fullPath, { encoding: 'utf8' });
                            result.headers['Content-Encoding'] = 'gzip';
                            result.content = tools.GzipContent(fileContent);
                        }
                        else {
                            var fileContent = fs.readFileSync(fullPath);
                            result.content = fileContent;
                        }

                        result.sourcePath = fullPath;
                    }
                    else {
                        //console.log(finalPath);
                        result.processed = false;
                    }
                }
                catch (err) {
                    var erroMSG = err + ""; //force a cast to string
                    if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                        console.log("Error11818: ");
                        console.log(err);
                    }
                }

            }
            catch (ex) {

                //console.log(ex);
                var erroMSG = ex + ""; //force a cast to string
                if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                    console.log("Error11819: ");
                    console.log(ex);
                }

            }
            resolve(result);
        });
    }
}


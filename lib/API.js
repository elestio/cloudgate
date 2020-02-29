var fs = require('fs');
const mime = require('mime');
const utils = require('../lib/Utils.js');


//In-memory cache
var cache = {};
module.exports = (app, rootFolder) => {

    app.any('/*', async (res, req) => {

        //Absolute Zero overhead test
        //res.end("Hello World!"); //standard output, no gzip
        //return;

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {
            var preparedReq = utils.prepare(res, req);

            if (preparedReq.url == "/debug") {
                var content = "";
                content = "Hello, World! " + (+new Date());
                //content += "<b>DEBUG INFOS - " + new Date() + "</b><br/><br/>\r\n\r\n";
                //content += "Method: " + preparedReq.method + "<br/>\r\n";
                //content += "URL: " + preparedReq.url + "<br/>\r\n";
                //content += "Host: " + preparedReq.header("host") + "<br/>\r\n";
                //content += "Headers: " + JSON.stringify(preparedReq.headers()) + "<br/>\r\n";
                //content += "Remote IP: " + preparedReq.ip + "<br/>\r\n";
                //content += "Request Body : " + body + "<br/>\r\n";
                //content += "Query: " + req.getQuery() + "<br/>\r\n";

                res.end(content); //standard output, no gzip
                return;
            }
            else if (preparedReq.url == "/debug2") {
                //test with GZIP (should be ~3 times slower compared to no gzip)
                var content = "";
                content = "Hello, World! " + (+new Date());
                utils.GzipResponse(res, content);
                return;
            }
            else {
                //serve the public folder
                var finalPath = preparedReq.url;
                if (preparedReq.url == "/") {
                    finalPath = "/index.html"; //default document in a folder
                    //console.log(finalPath);
                }

                var fullPath = rootFolder + finalPath;
                //TODO: enforce security, prevent ../../ and other encoded tricks!

                //console.log(fullPath);

                //define maxAge for caching            
                var maxAge = 30;
                var rawPath = finalPath.split('?')[0];
                var fileExt = rawPath.split('.').pop().toLowerCase();
                if (fileExt == "" || fileExt == "html" || fileExt == "htm") { maxAge = 5; }
                else if (fileExt == "ico" || fileExt == "png" || fileExt == "jpg" || fileExt == "gif" || fileExt == "svg") { maxAge = 604800; }
                else if (fileExt == "woff" || fileExt == "woff2" || fileExt == "ttf" || fileExt == "otf" || fileExt == "eot") { maxAge = 604800; }
                else if (fileExt == "css" || fileExt == "js" || fileExt == "txt" || fileExt == "json" || fileExt == "xml") { maxAge = 600; }
                else if (fileExt == "xls" || fileExt == "xlsx" || fileExt == "ppt" || fileExt == "pptx" || fileExt == "doc" || fileExt == "docx" || fileExt == "pdf" || fileExt == "zip" || fileExt == "rar") { maxAge = 86400; }
                else if (fileExt == "ogg" || fileExt == "mp3" || fileExt == "mp4" || fileExt == "mov" || fileExt == "wmv" || fileExt == "avi" || fileExt == "webm") { maxAge = 86400; }

                try {
                    //handle 304 Not Modified
                    var ifmodifiedsince = preparedReq.getHeader("if-modified-since");
                    if (ifmodifiedsince != null && ifmodifiedsince != "") {
                        var ms = Date.parse(ifmodifiedsince);
                        var now = +new Date();

                        if ((ms) > (now - (maxAge * 1000))) {
                            if (!res.aborted) {
                                res.writeStatus("304");
                                res.end();
                            }

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

                    //write all headers (after 301/304...)
                    if (!res.aborted) {
                        res.writeHeader("cache-control", "public, max-age=" + maxAge);
                        res.writeHeader("expires", new Date(Date.now() + maxAge * 1000).toUTCString());
                        res.writeHeader("last-modified", new Date(Date.now()).toUTCString());
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
                    if (!res.aborted) {
                        res.writeHeader("content-type", mime.getType(finalPath));
                    }
                }
                catch (ex) {

                }

                var urlParams = req.getQuery();
                var cacheKey = preparedReq.url + "?" + urlParams;

                //serve from in-memory LRU cache
                //TODO: implement cache duration / LRU
                if (cache[cacheKey] != null) {
                    //console.log("served from cache" + fullPath);
                    //console.log("Loading file from cache: " + fullPath);

                    if (!res.aborted) {
                        //noit aborted so we can return the awaited response
                        res.writeHeader("core-cache", "1");

                        if (fullPath.endsWith(".html")) {
                            utils.GzipResponse(res, cache[cacheKey]);
                        }
                        else {
                            res.end(cache[cacheKey]);
                        }
                    }

                }
                else {

                    //console.log("Loading file: " + fullPath);

                    //check if file exist
                    try {
                        if (fs.existsSync(fullPath)) {
                            //file exists
                            //console.log("served from disk: " + fullPath);
                            res.writeHeader("core-cache", "0");

                            //check if processing is needed or if we should serv the raw file
                            var processingNeeded = false;
                            if (fullPath.endsWith(".html")) {
                                processingNeeded = 1;
                            }

                            if (processingNeeded) {
                                var fileContent = fs.readFileSync(fullPath, { encoding: 'utf8' });
                                
                                //process dynamic datasource for the page if exist
                                /*
                                if (fileContent.indexOf('meta name="datasource"') > -1) {
                                    fileContent = await dynamicDS(urlParams, fileContent, connection, db);
                                }
                                */

                                //clean appdrag references
                                //fileContent = cleanCode(fileContent);

                                cache[cacheKey] = fileContent; //TODO: Cache duration + LRU

                                /* If we were aborted, you cannot respond */
                                if (!res.aborted) {
                                    //noit aborted so we can return the awaited response
                                    //res.end(fileContent);
                                    utils.GzipResponse(res, fileContent);
                                }

                            }
                            else {
                                var fileContent = fs.readFileSync(fullPath);
                                cache[cacheKey] = fileContent; //TODO: Cache duration + LRU
                                res.end(fileContent);
                            }

                        }
                        else {
                            //404
                            //console.log("404: " + fullPath);
                            res.writeStatus("404");
                            //res.end("404 - Page not found");
                            utils.GzipResponse(res, "404 - Page not found");
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

    })
}


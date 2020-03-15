var fs = require('fs');
var path = require('path');
const mime = require('mime');
const tools = require('../lib/Tools.js');

//In-memory cache
var cache = {};
module.exports = (app, rootFolder, isCaching) => {

    if ( isCaching ){
        //invalidate cache for changed files while the server is running
        console.log("Listening to file changes on: " + rootFolder);
        const chokidar = require('chokidar');
        chokidar.watch(rootFolder, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        }).on('all', (event, path) => {
            //console.log(event, path);
            //invalidate whole cache, todo: invalidate only the correct cache entries
            cache = {};
        });
    }
    

    app.any('/*', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {
            
            var curURL = req.getUrl();

           {
                //serve the public folder
                var finalPath = curURL;
                if (finalPath == "/") {
                    finalPath = "/index.html"; //default document in a folder
                    //console.log(finalPath);
                }

                //Poison Null Bytes protection
                //Poison null bytes are a way to trick your code into seeing another filename than the one that will actually be opened. This can in many cases be used to circumvent directory traversal protections, to trick servers into delivering files with wrong file types and to circumvent restrictions on the file names that may be used
                if (finalPath.indexOf('\0') !== -1) {
                   res.writeStatus("400");
                   res.end("Poison Null Bytes detected!");
                   return;
                }

                //protection agains directory traversal
                var fullPath = path.join(rootFolder, finalPath);
                if (fullPath.startsWith(rootFolder)) {
                   res.writeStatus("400");
                   res.end("Directory traversal detected!");
                   return;
                }

                //console.log(rootFolder + " - " + fullPath);

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
                    var ifmodifiedsince = req.getHeader("if-modified-since");
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
                var cacheKey = req.getUrl() + "?" + urlParams;

                //serve from in-memory LRU cache
                //TODO: implement cache duration / LRU
                if (cache[cacheKey] != null && !isCaching) {
                    //console.log("served from cache" + fullPath);
                    //console.log("Loading file from cache: " + fullPath);

                    if (!res.aborted) {
                        //noit aborted so we can return the awaited response
                        res.writeHeader("core-cache", "1");

                        if (!res.aborted) {
                            res.writeHeader("cache-control", "public, max-age=" + maxAge);
                            res.writeHeader("expires", new Date(Date.now() + maxAge * 1000).toUTCString());
                            res.writeHeader("last-modified", new Date(Date.now()).toUTCString());
                        }

                        if (fullPath.endsWith(".html")) {
                            tools.GzipResponse(res, cache[cacheKey]);
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
                            if (!res.aborted) {
                                res.writeHeader("cache-control", "public, max-age=" + maxAge);
                                res.writeHeader("expires", new Date(Date.now() + maxAge * 1000).toUTCString());
                                res.writeHeader("last-modified", new Date(Date.now()).toUTCString());
                            }

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
                                
                                if ( isCaching ){
                                    cache[cacheKey] = fileContent; //TODO: Cache duration + LRU
                                }
                                

                                /* If we were aborted, you cannot respond */
                                if (!res.aborted) {
                                    //noit aborted so we can return the awaited response
                                    //res.end(fileContent);
                                    tools.GzipResponse(res, fileContent);
                                }

                            }
                            else {
                                var fileContent = fs.readFileSync(fullPath);
                                if ( isCaching ){
                                    cache[cacheKey] = fileContent; //TODO: Cache duration + LRU
                                }
                                res.end(fileContent);
                            }

                        }
                        else {
                            //404
                            //console.log("404: " + fullPath);
                            res.writeStatus("404");
                            //res.end("404 - Page not found");
                            res.writeHeader("content-type", "text/html;charset=utf-8;");
                            tools.GzipResponse(res, "404 - Page not found");
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


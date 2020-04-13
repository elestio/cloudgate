var fs = require('fs');
const mime = require('mime');
const tools = require('../lib/tools.js');

//In-memory cache
var cache = {};
var isCaching = true;
var cacheStarted = false;


module.exports = {
    process : (appConfig, reqInfos) => {

        /*
        if ( !cacheStarted ){
            cacheStarted = true;
            if ( isCaching ){
                //invalidate cache for changed files while the server is running
                console.log("Listening to file changes on: " + appConfig.root);
                const chokidar = require('chokidar');
                chokidar.watch(appConfig.root, {
                    ignored: /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true
                }).on('all', (event, path) => {
                    //console.log(event, path);
                    //invalidate whole cache, todo: invalidate only the correct cache entries
                    cache = {};
                });
            }
        }
        */

        return new Promise(function (resolve, reject) {
            
            var result = {
                processed : true,
                status: 200,
                error: '',
                content: '',
                headers: {},
            };
                        
            var rootFolder = tools.safeJoinPath(appConfig.root, appConfig.publicFolder);           
            
            try {
                var curURL = reqInfos.url;

                //serve the public folder
                var finalPath = curURL;
                if (finalPath == "/") {
                    finalPath = "/index.html"; //default document in a folder
                    //console.log(finalPath);
                }

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

                //console.log(rootFolder + " - " + fullPath);

                
                
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
                    //handle 304 Not Modified
                    var ifmodifiedsince = reqInfos["if-modified-since"];
                    if (ifmodifiedsince != null && typeof(ifmodifiedsince) != 'undefined' && ifmodifiedsince != "") {
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
                    result.headers["content-type"] = mime.getType(finalPath);
                }
                catch (ex) {

                }


                var urlParams = reqInfos.query;
                var cacheKey = fullPath;//reqInfos.curURL + "?" + urlParams;

                //check if processing is needed or if we should serv the raw file
                var processingNeeded = false;
                if (fullPath.endsWith(".html") || fullPath.endsWith(".css") || fullPath.endsWith(".js") || fullPath.endsWith(".json") || fullPath.endsWith(".xml") || fullPath.endsWith(".txt")) {
                    processingNeeded = 1;
                }



                //serve from in-memory LRU cache
                //TODO: implement cache duration / LRU
                if (cache[cacheKey] != null && isCaching) {
                    //console.log("served from cache" + fullPath);
                    //console.log("Loading file from cache: " + fullPath);

                   
                    //not aborted so we can return the awaited response


                    //performance impact adding the 4 headers below is 20-25% of global RPS!!!
                    result.headers['core-cache'] = '1';
                    result.headers['cache-control'] = "public, max-age=" + maxAge;
                    result.headers['expires'] = new Date(Date.now() + maxAge * 1000).toUTCString();
                    result.headers['last-modified'] = new Date(Date.now()).toUTCString();
                    

                    result.status = 200;
                    if (processingNeeded) {
                        result.headers['Content-Encoding'] = 'gzip';
                    }
                    result.content = cache[cacheKey];
                    resolve(result);
                    return ;
                    // Here was a weird if (endswith.html, but inside if and else if the same)
                    

                }
                else {

                    //check if file exist
                    try {
                        if (fs.existsSync(fullPath)) {
                            //file exists
                            //console.log("served from disk: " + fullPath);
                            
                            result.headers["core-cache"] = "0";
                            result.headers["cache-control"] = "public, max-age=" + maxAge;
                            result.headers["expires"] = new Date(Date.now() + maxAge * 1000).toUTCString();
                            result.headers["last-modified"] = new Date(Date.now()).toUTCString();
                            
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
                                //noit aborted so we can return the awaited response
                                //res.end(fileContent);
                                
                                result.headers['Content-Encoding'] = 'gzip';
                                result.content = tools.GzipContent(fileContent);
                                if ( isCaching ){
                                    cache[cacheKey] = result.content; //TODO: Cache duration + LRU
                                }

                            }
                            else {
                                var fileContent = fs.readFileSync(fullPath);
                                if ( isCaching ){
                                    cache[cacheKey] = fileContent; //TODO: Cache duration + LRU
                                }
                                result.content = fileContent;
                            }
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


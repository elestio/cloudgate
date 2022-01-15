var fs = require('fs');
const mime = require('mime');
const tools = require('./tools.js');
const memory = require('./memory');

var fileMonitorStarted = false;
var fileExistCache = {};

module.exports = {
    name: "static-files",
    process: (appConfig, reqInfos, res, req, memory, serverConfig, app) => {

        var rootFolder = tools.safeJoinPath(appConfig.root, appConfig.publicFolder);
        var curURL = decodeURIComponent(reqInfos.url.split('?')[0]);

        if (appConfig.AWS == null || appConfig.TypeFS != "S3" ) {
            if (!fileMonitorStarted && serverConfig.watch == true) {
                fileMonitorStarted = true;
                //console.log("Listening to file changes on: " + rootFolder);
                const chokidar = require('chokidar');
                chokidar.watch(rootFolder, {
                    ignored: /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true
                }).on('all', (event, path) => {
                    //console.log(event, path);
                    if (event == "change") {
                        //invalidate whole app cache, todo: invalidate only the correct cache entries
                        console.log("File update detected: " + path);
                        memory.clear("ResponseCache");
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

        return new Promise( async function(resolve, reject) {

            try {

                //console.log(rootFolder);
                //console.log(finalPath);
                
                //Poison Null Bytes protection
                //Poison null bytes are a way to trick your code into seeing another filename than the one that will actually be opened. This can in many cases be used to circumvent directory traversal protections, to trick servers into delivering files with wrong file types and to circumvent restrictions on the file names that may be used
                if (finalPath.indexOf('\0') !== -1) {
                    result.status = 400;
                    result.error = "Poison Null Bytes detected!";
                    resolve(result);
                    return;
                }

                //protection against directory traversal
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
                else if (fileExt == "ico" || fileExt == "png" || fileExt == "jpg" || fileExt == "jpeg" || fileExt == "gif" || fileExt == "svg") { maxAge = 604800; }
                else if (fileExt == "woff" || fileExt == "woff2" || fileExt == "ttf" || fileExt == "otf" || fileExt == "eot") { maxAge = 604800; }
                else if (fileExt == "css" || fileExt == "js" || fileExt == "txt" || fileExt == "json" || fileExt == "xml") { maxAge = 604800; }
                else if (fileExt == "xls" || fileExt == "xlsx" || fileExt == "ppt" || fileExt == "pptx" || fileExt == "doc" || fileExt == "docx" || fileExt == "pdf" || fileExt == "zip" || fileExt == "rar") { maxAge = 86400; }
                else if (fileExt == "ogg" || fileExt == "mp3" || fileExt == "mp4" || fileExt == "mov" || fileExt == "wmv" || fileExt == "avi" || fileExt == "webm") { maxAge = 86400; }


                try {

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
                    //console.log(finalPath);
                    if ( result.headers["Content-Type"] == null || result.headers["Content-Type"] == "" ){
                        var targetMime = mime.getType(finalPath.split('?')[0]);
                        if ( targetMime != null ){

                            if (targetMime.indexOf("text") > -1 || targetMime.indexOf("json") > -1){
                                result.headers["Content-Type"] = targetMime + "; charset=utf-8";
                            }
                            else{
                                result.headers["Content-Type"] = targetMime;
                            }
                        }
                        
                    }
                    
                }
                catch (ex) {

                }


                var urlParams = reqInfos.query;
                var cacheKey = curURL;//reqInfos.curURL + "?" + urlParams;

                //Handle AWS S3
                if (appConfig.AWS != null && appConfig.TypeFS == "S3") {

                    var aws = require('aws-sdk');
                    var s3 = new aws.S3({ region: appConfig.AWS.region, accessKeyId: appConfig.AWS.accessKeyId, secretAccessKey: appConfig.AWS.secretAccessKey });

                    var s3Path = tools.safeJoinPath(appConfig.publicFolder, finalPath);
                    var getParams = {
                        Bucket: appConfig.AWS.bucket,
                        Key: s3Path
                    }

                    //console.log("bucket: " + appConfig.AWS.bucket + " - s3 path: " + s3Path + finalPath);

                    //Fetch or read data from aws s3

                    
                    var totalSize = 0;

                    try{
                        totalSize = await sizeOfS3Key(s3, getParams.Key, getParams.Bucket);

                        //update stats
                        memory.incr("http.data.out", totalSize, "STATS");
                        //sharedmem.incInteger("http.data.out", totalSize);
                        
                        var maxCachedSize = (1024*1024)*2; //2MB
                        if ( totalSize > maxCachedSize ) {

                            //console.log(totalSize);
                            //console.log("Stream S3 for: " + getParams.Key);

                            //console.log("Piping file!");
                            var s3Stream = s3.getObject(getParams).createReadStream();
                            tools.pipeStreamOverResponse(res, s3Stream, totalSize, memory);
                                                    
                            //console.log("AFTER Piping file!");
                            result.content = null; //meaning already responded!           
                            
                            tools.debugLog("HTTP", 200, totalSize, reqInfos, serverConfig);
                            
                            return;
                        }
                    }
                    catch(ex){
                        //console.log(ex);

                        if ( ex.code == 'NotFound' ){
                            result.status = 404;
                            result.content = "404 NOT FOUND";
                            resolve(result);
                            return;
                        }
                        else{
                            
                            console.log(ex);

                            result.status = 500;
                            result.content = ex.message + "<br/>Please check your AWS credentials / region / bucket in appConfig.json";
                            result.error = ex.code;
                            resolve(result);
                            return;
                        }

                    }

                    
                    //console.log("WHOLE READ ON S3 for: " + getParams.Key);

                    s3.getObject(getParams, function(err, data) {

                        if (err) {

                            if ( err.code == 'NoSuchKey' ){
                                result.status = 404;
                                result.content = "404 NOT FOUND";
                                resolve(result);
                                return;
                            }
                            else{
                                
                                console.log(err);

                                result.status = 500;
                                result.content = err.message + "<br/>Please check your AWS credentials / region / bucket in appConfig.json";
                                result.error = err.code;
                                resolve(result);
                                return;
                            }

                            

                        } else {
                            //console.log(data.Body.toString()); //this will log data to console

                            result.headers['Last-Modified'] = data.LastModified  + "";
                            result.headers['ETag'] = data.ETag + "";

                            if ( data.ContentType != null && data.ContentType != ""){
                                result.headers['Content-Type'] = data.ContentType + "";
                            }
                            

                            var processingNeeded = false;
                            if (finalPath.endsWith(".html") || finalPath.endsWith(".css") || finalPath.endsWith(".js") || finalPath.endsWith(".json") || finalPath.endsWith(".xml") || finalPath.endsWith(".txt") ) {
                                processingNeeded = 1;
                            }
                            if (processingNeeded) {
                                result.headers['Content-Encoding'] = 'gzip';
                                result.content = tools.GzipContent(data.Body.toString());
                            }
                            else {

                                /*
                                //serv files directly if above 1MB, no caching
                                const totalSize = data.ContentLength;
                                var maxCachedSize = (1024*1024)*1; //2MB
                                if ( totalSize > maxCachedSize ) {
                                    //console.log("Piping file!");
                                    const readStream = fs.createReadStream( Buffer.from(data.body));
                                    tools.pipeStreamOverResponse(res, readStream, totalSize, memory);
                                    //console.log("AFTER Piping file!");
                                    result.content = null; //meaning already responded!                                
                                    return;
                                }
                                */
                                result.content = data.Body;
                            }

                            resolve(result);
                        }

                    })

                    return;

                }

                //check if file exist
                try {
                    
                    var fileExist = false; var fileSize = 0;
                    if ( fileExistCache[fullPath] != null ){
                        fileExist = true;
                        fileSize = fileExistCache[fullPath].size;
                    }
                    else{
                        var fstats = null;

                        try{
                            fstats = fs.statSync(fullPath);
                        }
                        catch(ex){
                            fileExist = false;
                        }

                        if (fstats) {
                            fileExist = true;
                            fileSize = fstats.size;
                            fileExistCache[fullPath] = fstats;
                        }
                    }

                    //handle path without .html but still pointing to .html files (useful for nice urls)
                    if (!fileExist){
                        fullPath = fullPath + ".html";
                        try{
                            fstats = fs.statSync(fullPath);
                        }
                        catch(ex){
                            fileExist = false;
                        }

                        if (fstats) {
                            fileExist = true;
                            fileSize = fstats.size;
                            fileExistCache[fullPath] = fstats;
                        }
                    }

                    if (fileExist) {
                        //file exists
                        //console.log("served from disk: " + fullPath);

                        result.headers["core-cache"] = "0";
                        result.headers["cache-control"] = "public, max-age=" + maxAge;
                        result.headers["expires"] = new Date(Date.now() + maxAge * 1000).toUTCString();
                        result.headers["last-modified"] = new Date(Date.now()).toUTCString();

                        //check if processing is needed or if we should serv the raw file
                        var processingNeeded = false;
                        if (curURL.endsWith(".html") || curURL.endsWith(".css") || curURL.endsWith(".js") || curURL.endsWith(".json") || curURL.endsWith(".xml") || curURL.endsWith(".txt") || curURL.endsWith("/")) {
                            processingNeeded = 1;
                        }
                        if (processingNeeded) {
                            var fileContent = fs.readFileSync(fullPath, { encoding: 'utf8' });
                            result.headers['Content-Encoding'] = 'gzip';
                            result.content = tools.GzipContent(fileContent);
                        }
                        else {

                            //serv files directly if above 1MB, no caching
                            const totalSize = fileSize;
                            var maxCachedSize = (1024*1024)*2; //2MB
                            if ( totalSize > maxCachedSize ) {
                                //console.log("Piping file!");

                                for (var key in result.headers) {
                                    res.writeHeader(key, result.headers[key] + "");
                                }

                                const readStream = fs.createReadStream(fullPath, { highWaterMark: 1024*1024 });
                                tools.pipeStreamOverResponse(res, readStream, totalSize, memory);
                                //console.log("AFTER Piping file!");
                                result.content = null; //meaning already responded!   

                                tools.debugLog("HTTP", 200, totalSize, reqInfos, serverConfig);                             

                                return;
                            }
                            
                            
                            //TODO: find a way to handle extensionless files which are not binary
                            if ( fullPath.indexOf(".well-known/acme-challenge/") > -1){
                                var fileContent = fs.readFileSync(fullPath, { encoding: 'utf8' });
                                result.content = fileContent;
                                //console.log(result);
                            }
                            else{
                                var fileContent = fs.readFileSync(fullPath);
                                result.content = fileContent;
                            }

                            //console.log("End of read of: " + fullPath);
                               
                        }

                        

                        result.sourcePath = fullPath;
                    }
                    else {
                        if ( memory.getObject("AdminConfig", "GLOBAL").debug == true ){
                            //console.log("Local Path not found: " + finalPath);
                            console.log("full path not found: " + fullPath);
                        }
                        
                        result.processed = false;
                        result.status = 404;
                        result.details = "File not found: " + fullPath;
                    }
                }
                catch (err) {
                    var erroMSG = err + ""; //force a cast to string
                    if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                        console.log("Error11810: ");
                        console.log(err);
                    }
                }

            }
            catch (ex) {

                //console.log(ex);
                var erroMSG = ex + ""; //force a cast to string
                if (erroMSG.indexOf("Invalid access of discarded") == -1) {

                    console.log("Error11820: ");
                    console.log(ex);
                }

            }
            resolve(result);
        });
    }
}



function sizeOfS3Key(s3, key, bucket) {
    var prom = null;

    try{
        prom = s3.headObject({ Key: key, Bucket: bucket })
        .promise()
        .then(res => res.ContentLength);
    }
    catch(ex){
        prom = -1;
        console.log("crash in prom S3");
    }
    
    return prom;
}
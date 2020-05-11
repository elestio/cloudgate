var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
const mime = require('mime');
const qs = require('querystring');
const clearModule = require('clear-module');
const appLoader = require('../loaders/app-loader.js');
const tools = require('../lib/tools.js');

var functionsCache = {};

module.exports = {
    name: "cloudgate-functions",
    process: (reqInfos, res, req, memory, serverConfig) => {
        return new Promise(async function(resolve, reject) {

            

            //read headers
            req.forEach((k, v) => {
                reqInfos.headers[k] = v;
            });

            //read body
            if (reqInfos.method != "get") {
                reqInfos.body = await tools.getBody(req, res);
            }

            var event = reqInfos;
            var ctx = {
                succeed: function(result) {
                    //console.log(result)
                },
                fail: function(error) {
                    console.log(error);
                }
            };
            var callback = function(err, response) {

                if (err != null) {
                    console.log(err);
                } else {
                    //console.log(response);
                }

                if (typeof response == "object") {
                    resolve({
                        processed: true,
                        headers: response.headers,
                        content: response.content
                    });
                }
                else {
                    resolve({
                        processed: true,
                        content: response
                    });
                }


            };

            //console.log(reqInfos.headers);
            
            var auth = reqInfos.headers["authorization"];
            if ( auth != null ) { auth = auth.replace("Bearer ", "");}
            if ( auth != serverConfig.admintoken ){
                var result = {
                    status: 401,
                    content: "INVALID TOKEN " + auth
                }
                resolve(result);
                return;
            }


            var obj = null;
            try{
                obj = JSON.parse(reqInfos.body);
            }
            catch(ex){
                                    
                var result = {
                    status: 401,
                    content: "INVALID FORMAT - MUST BE IN JSON"
                }
                resolve(result);
                return;

            }     


            var respSTR = obj.action;
            
            if ( obj.action == "list"){
                var mainMemory = memory.debug().GLOBAL;
                var list = Object.keys(mainMemory);
                var finalList = {};
                for (var i = 0; i < list.length; i++ ){
                    finalList[mainMemory[list[i]].root] = 1;
                }
                respSTR = JSON.stringify(Object.keys(finalList));
            }
            else if ( obj.action == "loadAppFromLocalPath"){

                var appPath = obj.appPath;

                if ( appPath == "" || appPath == null) {
                    respSTR = '{"error": "No path to load provided"}';
                }
                else{
                    var fullPath = tools.safeJoinPath(__dirname, "../", appPath.replace("appconfig.json", ""));                    
                    clearModule.match( new RegExp("^" + fullPath) ); //clear from cache all code starting with the appPath

                    //TODO: clear only the app reponse cache and not for the whole server and all apps!
                    memory.clear("ResponseCache");

                    var result = appLoader.load(appPath);
                    respSTR = JSON.stringify(result);
                }
            }
            else if ( obj.action == "loadAppFromJSON"){
                
                var appConfig = obj.appConfig;
                if ( appConfig == "" || appConfig == null) {
                    respSTR = '{"error": "No appConfig JSON provided"}';
                }

                var appID = obj.appID;
                if ( appID == "" || appID == null) {
                    respSTR = '{"error": "No appID provided"}';
                }

                //TODO: check if this appID is not already used in memory or in the cluster

                clearModule.match( new RegExp("^" + appID) ); //clear from cache all code starting with the appID

                //TODO: clear only the app reponse cache and not for the whole server and all apps!
                memory.clear("ResponseCache");

                var result = appLoader.loadJSON(appConfig, appID);
                respSTR = result;
                
            }
            else if ( obj.action == "unloadApp"){
                var appPath = obj.appPath;

                if ( appPath == "" || appPath == null) {
                    respSTR = '{"error": "No path to unload provided"}';
                    return;
                }
                else{
                    var fullPath = tools.safeJoinPath(__dirname, "../", appPath.replace("appconfig.json", ""));                    
                    
                    //unload modules
                    clearModule.match( new RegExp("^" + fullPath) );

                    //find the target App in memory
                    var mainMemory = memory.debug().GLOBAL;
                    var list = Object.keys(mainMemory);
                    var targetAppConfig = null;
                    for (var i = 0; i < list.length; i++ ){
                        var root = mainMemory[list[i]].root;
                        if (root == appPath){
                            targetAppConfig = mainMemory[list[i]];
                            break;
                        }
                    }


                    //TODO: clear only the app reponse cache and not for the whole server and all apps!
                    memory.clear("ResponseCache");

                    memory.set("mustSaveConfig", 1, "TEMP");
                    
                    //clean appconfig cache
                    if ( targetAppConfig != null ){
                        for ( var i = 0; i < targetAppConfig.domains.length; i++){
                            memory.remove(targetAppConfig.domains[i], "GLOBAL");
                        }
                        memory.remove(targetAppConfig.mainDomain, "GLOBAL");
                        memory.remove(targetAppConfig.mainDomain, "GLOBAL");
                                                
                        respSTR = "App unloaded: " + appPath;    
                    }
                    else{
                        respSTR = "Nothing to unload, app not found: " + appPath;    
                    }

                    
                }
            }
            
            var result = {
                status: 200,
                headers: {
                    'Content-Type': "application/json",
                    'Content-Encoding': 'gzip'
                },
                content: tools.GzipContent(respSTR)
            }
            resolve(result);
            return;

        }
 
    )}
};
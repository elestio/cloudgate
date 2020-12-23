const qs = require('querystring');
const cheerio = require('cheerio');
const apiFunctions = require('./api-functions.js');
const tools = require('./tools.js');
const zlib = require('zlib');
const sharedmem = require('../modules/shared-memory');

var open = false;

const os = require('os')
const cpuCount = os.cpus().length;
var maxConcurrency = cpuCount;
if (maxConcurrency < 1){
    maxConcurrency = 1;
}

var maxCachedResults = 100; //TODO: should be configurable in server config

module.exports = async (responseToProcess, queryStringParams, appConfig, reqInfos, res, req, memory, serverConfig, app, apiDB) => {
    
    var cacheKey = reqInfos.host + "/" + reqInfos.url;
    if (reqInfos.url.startsWith("/")){
        cacheKey = reqInfos.host + reqInfos.url;
    }
    if ( reqInfos.query != "" && reqInfos.query != null ){
        cacheKey += "?" + reqInfos.query;
    }

    var cacheString = sharedmem.getStringKeys("DSOutputCache") + "";
    if ( cacheString == null ) {
        cacheString = "";
    }

    var allCacheKeys = cacheString.split(',');
    //console.log("nbKeys: " + allCacheKeys.length)
    if ( allCacheKeys.length > maxCachedResults ){
        var oldestKey = allCacheKeys[allCacheKeys.length-1];
        sharedmem.deleteString(oldestKey, "DSOutputCache");
        //console.log("One old entry deleted from the cache: " + oldestKey);
    }
    
    //serve from cache
    var curCache = sharedmem.getString( cacheKey, "DSOutputCache");
    if ( curCache != null && curCache != "" ){
        responseToProcess.content = tools.GzipContent(curCache);
        return responseToProcess;
    }

    //exit if no datasource
    var content = await tools.gunzip(responseToProcess.content);
    if ( content.indexOf('meta name="datasource"') == -1 )
    {
        //no datasource, return directly
        return responseToProcess;
    }
    
    var waitCounter = 0;
    var sleepTimeMS = 250;
    var maxWaitTime = 30000;
    while ( sharedmem.getInteger("nbDynamicDatasourceProcess") >= maxConcurrency ){
        waitCounter += 1;
        //TODO: should be configurable
        if (waitCounter > (maxWaitTime/sleepTimeMS)){
            var errDetails = "Unable to process [" + cacheKey + "] after " + maxWaitTime + "ms";
            console.log(errDetails)
            responseToProcess.status = 500;
            responseToProcess.content = errDetails; //returning an error to prevent crashing the server
            responseToProcess.error = errDetails;
            return responseToProcess;
        }
        await tools.sleep(sleepTimeMS); //wait until a slot is available
    }

    //check the cache again (processed by another thread)
    curCache = sharedmem.getString(cacheKey, "DSOutputCache");
    if ( curCache != null && curCache != "" ){
        responseToProcess.content = tools.GzipContent(curCache);
        return responseToProcess;
    }

    sharedmem.incInteger("nbDynamicDatasourceProcess", 1);

    //console.log(responseToProcess);
    //console.log(queryStringParams);

    if ( responseToProcess == null ){
        return responseToProcess;
    }

    var params = queryStringParams;

    var finalContent = content;

    //console.log(content);
    
    try{
        if ( content.indexOf('meta name="datasource"') > -1 )
        {
            var $ = cheerio.load(finalContent);

            var dsList = [];           
            $("meta[name='datasource']").each( function (i, elem) {
                
                //console.log($(this).attr("datasource-function"));

                var funcName = $(this).attr("datasource-function");
                var datasourceID = $(this).attr("datasource-id");
                //console.log(funcName + " - " + datasourceID);

                dsList.push({"funcName": funcName, "datasourceID": datasourceID});
                
            });


            for (var k = 0; k < dsList.length; k++){
                //PROCESS DATA FUNCTION to get the data for this DS
                //console.log("url: " + reqInfos.url);
                
                var curDS = dsList[k];
                var funcName = curDS.funcName;
                var datasourceID = curDS.datasourceID;

                var newReqInfos = {
                    url: "/api/" + funcName,
                    method: reqInfos.method,
                    headers:  {"source": "dynamic-datasource"},
                    body: "",
                    query: reqInfos.query
                };

                //console.log(newReqInfos)
                var result = await apiFunctions.process(appConfig, newReqInfos, null, null, memory, serverConfig, app);
                //console.log(result)

                //do not cache errors
                if ( (result.content.Table + "").startsWith("Error: ") ){
                    sharedmem.incInteger("nbDynamicDatasourceProcess", -1);   
                    responseToProcess.doNotCache = 1;
                    return responseToProcess;
                }

                var rows = result.content.Table;
                //console.log(rows)
                //console.log(newReqInfos.url + "  -  " + rows.length);
                //var rows = [];
                //var rows = [{"name": "test 123", "shortDescription": "this is a sample description..."}, {"name": "test 456", "shortDescription": "this is a sample 2..."}, {"name": "test 789", "shortDescription": "this is a sample 6..."}];
                

                //check if it's a simple or repeated datasource
                var isRepeated = $(".datasource-repeat[datasource-id='" + datasourceID + "']").length > 0;
                //console.log(isRepeated)
                if ( !isRepeated ){
                    
                    var curRow = rows[0];
                    
                    //console.log(curRow);

                    for (var key in curRow){
                        var varToReplace = "[DS" + datasourceID + "=" + key + "]";
                        var varValue = curRow[key];
                        //console.log(varToReplace + " - " + varValue);

                        //this for loop should be replaced by a regex replace all, Last time I tried it was crashing!
                        for (var i = 0; i < 10; i++){
                            finalContent = finalContent.replace(varToReplace, varValue);
                        }
                    } 

                    //update the virtual dom
                    //$ = cheerio.load(finalContent);
                }
                else{
                    
                    //load from str to vdom
                    $ = cheerio.load(finalContent);

                    //repeated datasource
                    var templateItem = $(".datasource-repeat[datasource-id='" + datasourceID + "']");
                    var templateItemSource = $.html(templateItem);

                    //console.log(templateItemSource)
                    //return;
                    var allGeneratedRows = "";

                    //generate and add all rows in a loop
                    for (var i = 0; i < rows.length; i++){

                        var genRow = templateItemSource + "";
                        var curRow = rows[i];

                        for (var key in curRow){
                            var varToReplace = "[DS" + datasourceID + "=" + key + "]";
                            var varValue = curRow[key];

                            //console.log(varToReplace + " - " + varValue);

                            if ( varValue == null ) { varValue = ""; }
                            //should be replaced by a regex replace all, Last time I tried it was crashing!
                            genRow = genRow.replace(varToReplace, varValue);
                            genRow = genRow.replace(varToReplace, varValue);
                            genRow = genRow.replace(varToReplace, varValue);
                            genRow = genRow.replace(varToReplace, varValue);
                        
                        } 
                        allGeneratedRows += genRow + "\r\n";
                    }

                    if ( allGeneratedRows != "" ){
                        templateItem.after(allGeneratedRows);
                    }
                    templateItem.remove();

                    //update from the virtual dom
                    finalContent = $.html();
                    
                }
            }


            
            //appdrag compat: replace appdrag cdn links returned by the db into local files
            if ( appConfig != null && appConfig.globalEnv != null && appConfig.globalEnv.APPID != null){
                var appId = appConfig.globalEnv.APPID;
                let regexp1 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
                let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`, "g");
                finalContent = finalContent.replace(regexp1, "./");
                finalContent = finalContent.replace(regexp2, "./");
            }
            

            //console.log("before return")
            //finalContent = $.html();
            responseToProcess.content = tools.GzipContent(finalContent);
            //console.log(finalContent)

            sharedmem.incInteger("nbDynamicDatasourceProcess", -1);    

            sharedmem.setString(cacheKey, finalContent, "DSOutputCache");    

            return responseToProcess;
         
        }
        else
        {
            sharedmem.incInteger("nbDynamicDatasourceProcess", -1);    
            return responseToProcess;
        }
    } catch(ex){
        console.log("Error in Dynamic Datasource:");
        console.log(ex);
        sharedmem.incInteger("nbDynamicDatasourceProcess", -1);    
    }

    
    
}


function ExecuteQuery(db, connection, SQL)
{
    return new Promise( function(resolve , reject ){
        
        
        connection.query(SQL, function (error, results, fields) {
            if (error) {
                console.log(error);
            }
            resolve(results);
        });
        

        //resolve(db.prepare(SQL).all());
        
    });
}
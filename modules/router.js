var fs = require('fs');
const memory = require('../modules/memory');
const staticFiles = require('../modules/static-files');
const apiFunctions = require('../modules/api-functions.js');
const apiDB = require('../modules/api-db.js');
const tools = require('../lib/tools.js');

module.exports = { 
  start : (app) => {
    var modules = [apiFunctions, apiDB, staticFiles];
    app.any('/*', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });


        try {
          var host = req.getHeader('host');
          var subDomain = host.split('.')[0];
          var domain = host.substring(host.indexOf('.') + 1).split(':')[0];
          var reqInfos = {
            curUrl : req.getUrl(),
            query : req.getQuery(),
            headers: {},
            req: req,
          }
          
          req.forEach((k, v) => {
            reqInfos.headers[k] = v;
          });
          
          reqInfos.body = await tools.getBody(req, res);
          

          var appConfig = await memory.getObject(subDomain + "." + domain);

          //handle *
          if ( appConfig == null ){
              appConfig = await memory.getObject("*", subDomain + "." + domain); //avoid constant call to redis
          }

          

          if (typeof(appConfig) == 'undefined' || appConfig == null) {
            res.writeStatus("404");
            res.writeHeader("target", subDomain + "." + domain);
            res.end("No app configured...");
            return ;
          }

          var hasBeenProcessed = false;
          var processResult = null;
          for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            var result = await module.process(appConfig, reqInfos, res);
            if (result && result.processed) {
              hasBeenProcessed = true;
              processResult = result;
              break ; 
            }
          }
          if (!res.aborted) {
            if (!hasBeenProcessed) {
              processResult = {
                status: 404,
                headers: {
                  "cache-control" : "public, max-age=30",
                  "expires" : new Date(Date.now() + 30 * 1000).toUTCString(),
                  "last-modified" : new Date(Date.now()).toUTCString(),
                  "content-type" : "text/html;charset=utf-8;",
                }
              }
              var path404 = tools.safeJoinPath(__dirname, '..', './default/404.html')
              // TODO : handle path to 404 in the config file
                //404
                var content404 = "";
                /*if (cache[path404] != null) {
                    res.writeHeader("core-cache", "1");
                    //console.log("cached");
                    res.end(cache[path404]);
                    //tools.GzipResponse(res, cache[path404]);
                }
                else{*/
                    content404 = fs.readFileSync(path404, { encoding: 'utf8' });
                    processResult.content = content404;
                    //cache[path404] = content404; 
                    //tools.GzipResponse(res, content404);
                //}
            }

            // FINAL WRITING
            res.writeStatus("" + (processResult.status || 200));
            for (var key in processResult.headers) {
              res.writeHeader(key, processResult.headers[key]);
            }
            res.write(processResult.content);
            res.end();
          }
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
}

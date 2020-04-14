var fs = require('fs');
const memory = require('../modules/memory');
const staticFiles = require('../modules/static-files');
const apiFunctions = require('../modules/api-functions.js');
const apiDB = require('../modules/api-db.js');
const tools = require('../lib/tools.js');

//In-memory cache
var cache = {};

var testNGINX = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;

var buffNGINX = tools.GzipContent(testNGINX);


module.exports = { 
  start : (app) => {
    var modules = [apiFunctions, apiDB, staticFiles];
    app.any('/*', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        //170K RPS per core - best perf possible
        //res.end("Hello World");
        //return;
        
        //TEST EXACT SAME RESPONSE THAN NGINX
        //133K RPS
        /*
        res.writeHeader("Connection", "keep-alive");
        res.writeHeader("Server", "nginx/1.14.0 (Ubuntu)");
        res.writeHeader("Content-Type", "text/html");
        res.writeHeader("Content-Encoding", "gzip");
        res.writeHeader("Date", "Sat, 11 Apr 2020 15:14:48 GMT");
        res.writeHeader("ETag", 'W/"5df51e13-264"');
        res.writeHeader("Last-Modified", "Sat, 14 Dec 2019 17:38:27 GMT");
        res.end(buffNGINX); //pre-gzipped to avoid redoing slow gzip operations each time
        return;
        */


        try {
          var host = req.getHeader('host');
          var subDomain = host.split('.')[0];
          var domain = host.substring(host.indexOf('.') + 1).split(':')[0];
          var reqInfos = {
            url : req.getUrl(),
            query : req.getQuery(),
            method: req.getMethod(),
            ip: tools.getIP(req, res),
            headers: {},
            req: req,
          }

                    
          var appConfig = memory.getObject(subDomain + "." + domain, "GLOBAL");
          //console.log("appconfig key: " + subDomain + "." + domain);
          //console.log(memory.debug());
          //handle *
          if ( appConfig == null ){
              appConfig = memory.getObject("*", subDomain + "." + domain, "GLOBAL"); //avoid constant call to redis
          }

          //Caching: think about caching of GET only!
          var cacheKey = null;
          if ( reqInfos.method == "get"){
            cacheKey = host + "/" + reqInfos.url + reqInfos.query;
          }
          
          //console.log(memory.debug());
          
          var cacheContent = memory.get(cacheKey, appConfig.root);
          if (cacheContent != null) {
            var processResult = cacheContent;
            res.writeStatus("" + (processResult.status || 200));
            for (var key in processResult.headers) {
              res.writeHeader(key, processResult.headers[key]);
            }
            if ( processResult.content != null ){
                res.end(processResult.content);
            }
            return;
        }
        
          
          if (typeof(appConfig) == 'undefined' || appConfig == null) {
            res.writeStatus("404");
            res.writeHeader("target", subDomain + "." + domain);
            res.end("No app configured for vhost [" + subDomain + "." + domain + "]");
            return ;
          }

          //res.end("after reading config");
          //return;

          

          //var beginPipeline = process.hrtime();

          var hasBeenProcessed = false;
          var processResult = null;
          for (var i = 0; i < modules.length; i++) {
            
            //console.log(modules[i]);

            //var begin = process.hrtime();
            var module = modules[i];
            var result = await module.process(appConfig, reqInfos, res, req, memory);      
            //const nanoSeconds = process.hrtime(begin).reduce((sec, nano) => sec * 1e9 + nano);
            //console.log("Module: " + i + " - " + (nanoSeconds/1000000) + "ms");

            if (result && result.processed) {
              hasBeenProcessed = true;
              processResult = result;
              
              //keep in cache only static files response
              if ( modules[i].name == "static-files" ){
                memory.set(cacheKey, processResult, appConfig.root);
                //console.log("cache set for: " + cacheKey + "|" + appConfig.root);
              }
              
              
              break ; 
            }
          }

          //const nanoSecondsPipeline = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
          //console.log("processing Pipeline: " + (nanoSecondsPipeline/1000000) + "ms");

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
                var cache404 = memory.get(path404, appConfig.root);
                if ( cache404 != null) {
                    //console.log("cached");
                    processResult.headers['core-cache'] = '1';
                    processResult.headers['Content-Encoding'] = 'gzip';
                    processResult.content = cache404;
                    //res.writeHeader("core-cache", "1");
                    //res.writeHeader("Content-Encoding", "gzip");
                    //res.end(cache404);
                }
                else{
                    content404 = fs.readFileSync(path404, { encoding: 'utf8' });
                    processResult.headers['Content-Encoding'] = 'gzip';
                    processResult.content = tools.GzipContent(content404);
                    memory.set(path404, processResult.content, appConfig.root);
                    //tools.GzipResponse(res, content404);
                }
            }

            // FINAL WRITING
            res.writeStatus("" + (processResult.status || 200));
            for (var key in processResult.headers) {
              res.writeHeader(key, processResult.headers[key]);
            }
            
            if ( processResult.content != null ){
                res.write(processResult.content);
            }
            res.end();
            //res.end(processResult.content);

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

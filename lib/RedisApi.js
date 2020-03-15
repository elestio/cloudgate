var zlib = require('zlib');
var fs = require('fs');
const mime = require('mime');
const qs = require('querystring');
const tools = require('./Tools.js');

var Redis = require("ioredis");

module.exports = (app, ip, port, API_Token) => {

    var redis = new Redis(port, ip);

    app.get('/api/redis-get', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        var result = {};
        var redisResult = await redis.get("/test1");
        result.status = "OK";
        result.data = redisResult;
        
        try{
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            //tools.GzipResponse(res, JSON.stringify(result));
            res.end(JSON.stringify(result));
        }
        catch(ex){}
        
        
        return;

    })

    app.get('/api/redis-set', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        var result = {};
        var redisResult = await redis.set("/test1", (+new Date()));
        result.status = "OK";
        result.data = redisResult;
        
        try{
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            //tools.GzipResponse(res, JSON.stringify(result));
            res.end(JSON.stringify(result));
        }
        catch(ex){}
        
        return;

    })

    app.any('/api/redis', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            var body = await utils.getBody(req, res);
            var data = null;

            try{
                data = JSON.parse(body);
            }
            catch(ex){
                var badToken = { "status": "KO", "message": "INVALID_JSON", "details": body };
                res.writeHeader("content-type", "application/json;charset=utf-8;");
                tools.GzipResponse(res, JSON.stringify(badToken));
                return;
            }

            //console.log(data);

            if (data.token != API_Token) {
                var badToken = { "status": "KO", "message": "BAD_TOKEN" };
                res.writeHeader("content-type", "application/json;charset=utf-8;");
                tools.GzipResponse(res, JSON.stringify(badToken));
                return;
            }


            var result = {};

            if ( data.command == "set"){
                redis.set(data.key, data.value);
                result.status = "OK";
            }
            else if ( data.command == "get"){
                var redisResult = await redis.get(data.key);
                result.status = "OK";
                result.data = redisResult;
            }
            
            res.writeHeader("content-type", "application/json;charset=utf-8;");
            tools.GzipResponse(res, JSON.stringify(result));
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
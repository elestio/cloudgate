var zlib = require('zlib');
var fs = require('fs');
const mime = require('mime');
const qs = require('querystring');
const tools = require('./Tools.js');

module.exports = (app, rootFolder, connection, API_Token) => {

    app.any('/api/SqlQuery', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        try {

            var curURL = req.getUrl();
            var body = await tools.getBody(req, res);

            //console.log(body);

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
                //GzipResponse(res, "token: " + JSON.stringify(data));
                return;
            }

            var SQL = data.sql;
            if (SQL == null) {
                SQL = "SELECT 'NO SQL QUERY PROVIDED ...' as status"
            }

            //console.log("SQL: " + SQL);

            var rows = await ExecuteQuery(connection, SQL);

            var result = {};
            result.Table = rows;
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

function ExecuteQuery(connection, SQL) {
    return new Promise(function(resolve, reject) {
        connection.query(SQL, function(error, results, fields) {
            if (error) {
                console.log(error);
                resolve(error);
            }
            else{
                resolve(results);
            }
            
        });
    });
}
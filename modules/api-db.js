const tools = require('../lib/tools.js');


var mysql      = require('mysql');
const connections = {}; //cached connections

function getConnection(appConfig) {
  //var keyConnection = appConfig.db.MYSQL.host + ";" + appConfig.db.MYSQL.port + ";" + appConfig.db.MYSQL.user + ";" + appConfig.db.MYSQL.password + ";" + appConfig.db.MYSQL.database;
  var keyConnection = appConfig.root;
  if (typeof(connections[keyConnection]) == 'undefined') {
    connections[keyConnection] = mysql.createPool({
      connectionLimit : 10,
      host     : appConfig.db.MYSQL.host,
      port     : appConfig.db.MYSQL.port,
      user     : appConfig.db.MYSQL.user,
      password : appConfig.db.MYSQL.password,
      database : appConfig.db.MYSQL.database,
    });
  }
  return connections[keyConnection];
}

function ExecuteQuery(appConfig, query) {
  return new Promise(function(resolve, reject) {

      getConnection(appConfig).query(query, function(error, results, fields) {
          if (error) {
              resolve(error);
          }
          else{
              resolve(results);
          }
      });
  });
}

module.exports = {
  name: "api-db",
  ExecuteQuery: ExecuteQuery,
  process: (appConfig, reqInfos, res, req, memory, serverConfig, app) => {
    return new Promise(async function (resolve, reject) {

      var beginPipeline = process.hrtime();

      // CHECK IF THERE IS A MYSQL DB SETUP
      if (typeof(appConfig.db) == 'undefined' || 
      typeof(appConfig.db.MYSQL) == 'undefined' || 
      typeof(appConfig.db.MYSQL.apiEndpoint) == 'undefined') {
        resolve({
          processed: false
        })
        return ;
      }
      try {

        var curURL = reqInfos.url;
        // CHECK IF MYSQL ENDPOINT MATCH THE CURRENT URL
        if (curURL != appConfig.db.MYSQL.apiEndpoint) { 
          resolve({
            processed: false,
          });
          return ;
        }

        // PROCESS REQUEST

        //read all headers
        req.forEach((k, v) => {
            reqInfos.headers[k] = v;
        });

        //read the body
        reqInfos.body = await tools.getBody(req, res);
        var body = reqInfos.body;

        var result = {
          processed: true,
          headers: {}
        }
        var data = null;

        try{
          data = JSON.parse(body);
        }
        catch(ex){
            var badToken = { "status": "KO", "message": "INVALID_JSON", "details": body };
            result.status = 400;
            result.headers["Content-Type"] = "application/json;charset=utf-8;";
            result.headers['Content-Encoding'] = 'gzip';
            result.content = tools.GzipContent(JSON.stringify(badToken));
            resolve(result);
            return;
        }

        //console.log(data);
        var passedToken = reqInfos.headers["x-api-key"];
        if (passedToken == null || passedToken == "" || passedToken != appConfig.db.MYSQL.apiToken) {
            var badToken = { "status": "KO", "message": "BAD_TOKEN" };
            result.status = 401;
            result.headers["Content-Type"] = "application/json;charset=utf-8;";
            result.headers['Content-Encoding'] = 'gzip';
            result.content = tools.GzipContent(JSON.stringify(badToken));
            resolve(result);
            return;
        }

        var SQL = data.sql;
        if (SQL == null) {
            SQL = "SELECT 'NO SQL QUERY PROVIDED ...' as status"
        }

        try{
            //console.log("SQL: " + SQL);
            var rows = await ExecuteQuery(appConfig, SQL);
            result.headers["Content-Type"] = "application/json;charset=utf-8;";
            result.headers['Content-Encoding'] = 'gzip';
            result.content = tools.GzipContent(JSON.stringify(rows));

            const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
            var durationMS = (nanoSeconds/1000000);
            result.headers['processTime'] = durationMS.toFixed(2) + "ms";

            resolve(result);
            return;
        }
        catch(ex){
            result.content = "Error: " + ex.message;
            resolve(result);
            return;
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
      
    });
  }
};

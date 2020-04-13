const tools = require('../lib/tools.js');


var mysql      = require('mysql');
const connections = {

}

function getConnection(appConfig) {
  var keyConnection = appConfig.db.MYSQL.host + ";" + appConfig.db.MYSQL.port + ";" + appConfig.db.MYSQL.user + ";" + appConfig.db.MYSQL.password + ";" + appConfig.db.MYSQL.database;
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
  process : (appConfig, reqInfos, res, req) => {
    return new Promise(async function (resolve, reject) {
      // CHECK IF THERE IS A MYSQL DB SETUP
      if (typeof(appConfig.db) == 'undefined' || 
      typeof(appConfig.db.MYSQL) == 'undefined' || 
      typeof(appConfig.db.MYSQL.endpoint) == 'undefined') {
        resolve({
          processed: false
        })
        return ;
      }
      try {

        var curURL = reqInfos.url;
        // CHECK IF MYSQL ENDPOINT MATCH THE CURRENT URL
        if (curURL != appConfig.db.MYSQL.endpoint) { 
          resolve({
            processed: false,
          });
          return ;
        }

        // PROCESS REQUEST
        //read the body only if needed
        reqInfos.body = await tools.getBody(req, res);
        var body = reqInfos.body;

        var result = {
          processed: true,
          headers: {

          }
        }
        var data = null;

        try{
          data = JSON.parse(body);
        }
        catch(ex){
            var badToken = { "status": "KO", "message": "INVALID_JSON", "details": body };
            result.status = 400;
            result.headers["content-type", "application/json;charset=utf-8;"];
            result.headers['Content-Encoding'] = 'gzip';
            result.content = tools.GzipContent(JSON.stringify(badToken));
            resolve(result);
            return;
        }

        //console.log(data);

        if (data.token == undefined || data.token != appConfig.apiToken) {
            var badToken = { "status": "KO", "message": "BAD_TOKEN" };
            result.status = 401;
            result.headers["content-type", "application/json;charset=utf-8;"];
            result.headers['Content-Encoding'] = 'gzip';
            result.content = tools.GzipContent(JSON.stringify(badToken));
            resolve(result);
            return;
        }

        var SQL = data.sql;
        if (SQL == null) {
            SQL = "SELECT 'NO SQL QUERY PROVIDED ...' as status"
        }

        //console.log("SQL: " + SQL);
        var rows = await ExecuteQuery(appConfig, SQL);
        result.headers["content-type", "application/json;charset=utf-8;"];
        result.headers['Content-Encoding'] = 'gzip';
        result.content = tools.GzipContent(JSON.stringify(rows));
        resolve(result);
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
      
    });
  }
};


var version = "1.0.0";

var port = 8081;
var SSLPort = 4443;
var rootFolder = "./public";

const utils = require('./lib/Utils.js');

var Redis = require("ioredis");
var redis = new Redis(6379, "127.0.0.1");
var redisSyncDelay = 100; //syncronize local inmemory counters to redis (mass incr) every 200ms

//MYSQL
var mysql      = require('mysql');
var connection = mysql.createPool({
  connectionLimit : 10,
  host     : 'localhost',
  user     : 'root',
  password : '1580428173919',
  database : 'p24'
});

//SQLITE Mode
/*
var sqliteOptions = {
    memory: false,
    //readonly: true
};
*/
//const db = require('better-sqlite3')('p24.sqlite', sqliteOptions);
const db = null;


//Without SSL
var app = require('./bin/cloudgate.js').App();

//With SSL
/*
var app = require('./bin/uftl.js').SSLApp({
    key_file_name: '/etc/letsencrypt/live/vms2.terasp.net/privkey.pem',
    cert_file_name: '/etc/letsencrypt/live/vms2.terasp.net/cert.pem'
});
*/

//WEBSOCKET
require('./lib/Websocket')(app, connection, db, rootFolder);

//REST API
require('./lib/API')(app, connection, db,rootFolder);

//Start listening
app.listen(port, (listenSocket) => {
    if (listenSocket) {
        //console.log('Listening to port ' + port + " - ProcessID: " + process.pid + " - ThreadID: " + threadID);
        console.log("CloudGate V" + version + " started");
        console.log('Listening to port ' + port + " - ProcessID: " + process.pid );
    }
});


//used to redirect 80 to 443
/*
var appRedirector = require('./bin/uftl.js').App();
appRedirector.any('/*', async (res, req) => {
    res.writeStatus("301");
    res.writeHeader("Location", "https://vms2.terasp.net");
    res.end();
});
appRedirector.listen(80, (listenSocket) => {
    if (listenSocket) {
        console.log('Listening to port 80');
    }
});
*/
const tools = require('./lib/Tools.js');

var version = "1.0.0";
var port = 3000;
var rootFolder = "./public";

//Without SSL
var app = require('./bin/cloudgate.js').App();

//Start listening
app.listen(port, (listenSocket) => {
    if (listenSocket) {
        console.log("CloudGate V" + version + " started");
        console.log('Listening to port ' + port + " - ProcessID: " + process.pid );
    }
});


//Static files handler
require('./lib/StaticFiles')(app, rootFolder);

//REST API sample / test
require('./lib/debug')(app, rootFolder);

//REST API for DB
var mysql      = require('mysql');
var connection = mysql.createPool({
  connectionLimit : 10,
  host     : 'localhost',
  user     : 'db_user',
  password : 'db_password',
  database : 'db_name'
});

var API_Token = tools.GetRandomId(); //this is a token to protect access to the DB REST API
//TODO: check if overriden by a config file or env variable

console.log("API Token: " + API_Token);

require('./lib/DBApi')(app, rootFolder, connection, API_Token);

require('./lib/RedisApi')(app, "127.0.0.1", 6379, API_Token);


//WEBSOCKET
//require('../lib/Websocket')(app, rootFolder);
app.ws("/ws", {

    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 1800,

    /* Handlers */
    open: (ws, req) => {
        //do something when the websocket is open (subscribe to pub/sub channels, authenticate, disconnect ...)
    },
    message: (ws, message, isBinary) => {
    //handle messages received
    },
    drain: (ws) => {
    //
    },
    close: (ws, code, message) => {
        /* The library guarantees proper unsubscription at close */
    }
})

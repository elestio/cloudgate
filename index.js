
const tools = require('./lib/Tools.js');

var version = "1.0.0";
var port = 80;
var sslPort = 443;
var interface = "*"; //or "127.0.0.1" or any private/public ip address on your server
var appPath = "./apps/sample1/";
var publicFolder = appPath + "public/";

var isCaching = false;

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


//Without SSL
var app = require('./bin/cloudgate.js').App();
app.listen(interface, port, (listenSocket) => {
    if (listenSocket) {
        console.log("CloudGate V" + version + " started");
        console.log('Listening to port ' + port + " - ProcessID: " + process.pid );
    }
});

//Handlers / Midlewares
require('./lib/StaticFiles')(app, publicFolder, isCaching);
require('./lib/debug')(app, publicFolder);
require('./lib/DBApi')(app, publicFolder, connection, API_Token);
require('./lib/RedisApi')(app, "127.0.0.1", 6379, API_Token);
require('./lib/APILoader')(app, "./apps/sample1/appconfig.json", API_Token);

//WEBSOCKET
//require('../lib/Websocket')(app, publicFolder);
app.ws("/ws", {

    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 1800,

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
    }
})

//TODO: mystery, when the SSL handler below is activated, perf is divided by 3
//even if we benchmark the HTTP only endpoint! Something is clearly wrong!

//SSL Handling
/*
var Letsencrypt = require('./lib/Letsencrypt');
var certPath = appPath + "CERTS/";
var isProd = true;
Letsencrypt(certPath, publicFolder);

(async () => {
    try {
        var certInfos = await Letsencrypt.GenerateCert(isProd, "vms2.terasp.net", "z51biz@gmail.com", certPath, publicFolder);
        console.log(certInfos);

        //start the SSL Server
        var sslApp = require('./bin/cloudgate.js').SSLApp({
            key_file_name: certInfos.privateKeyPath,
            cert_file_name: certInfos.fullchain
        });
        
        sslApp.listen(interface, sslPort, (listenSocket) => {
            if (listenSocket) {
                console.log('Listening to port ' + sslPort + " - ProcessID: " + process.pid );
            }
        });
        require('./lib/StaticFiles')(sslApp, publicFolder, isCaching);
        require('./lib/debug')(sslApp, publicFolder);
        require('./lib/DBApi')(sslApp, publicFolder, connection, API_Token);
        require('./lib/RedisApi')(sslApp, "127.0.0.1", 6379, API_Token);
        require('./lib/APILoader')(sslApp, "./apps/sample1/appconfig.json", API_Token);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();
*/





//Exit handler, save in-memory states & DB to disk before exit
var isExited = false;
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
        process.on(eventType, cleanUpServer.bind(null, eventType));
})
function cleanUpServer(test, event){
        if ( isExited ) {
            return;
        }
        else{
            isExited = true;
            
            console.log(event);
            console.log("TODO: cleanount process / Save states & DB ...");
            process.exit();
        }
}


var version = "1.0.0";
var port = 8081;
var SSLPort = 4443;
var rootFolder = "./public";

const utils = require('./lib/Utils.js');

//With SSL
var app = require('./bin/cloudgate.js').SSLApp({
    key_file_name: '/path/to/privkey.pem',
    cert_file_name: '/parth/to/cert.pem'
});

//OPTIONAL: used to redirect 80 to 443
var appRedirector = require('./bin/cloudgate.js').App();
appRedirector.any('/*', async (res, req) => {
    res.writeStatus("301");
    res.writeHeader("Location", "https://YOUR_DOMAIN_HERE");
    res.end();
});
appRedirector.listen(port, (listenSocket) => {
    if (listenSocket) {
        console.log('Listening to port ' + port);
    }
});

//Start listening
app.listen(SSLPort, (listenSocket) => {
    if (listenSocket) {
        console.log("CloudGate V" + version + " started");
        console.log('Listening to ports ' + port + "/" + SSLPort + " - ProcessID: " + process.pid );
    }
});

//WEBSOCKET
require('./lib/Websocket')(app, connection, db, rootFolder);

//REST API
require('./lib/API')(app, connection, db,rootFolder);
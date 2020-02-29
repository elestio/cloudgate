
var version = "1.0.0";

var port = 8081;
var SSLPort = 4443;
var rootFolder = "/root/cloudgate/public";

const utils = require('../lib/Utils.js');

//Without SSL
var app = require('../bin/cloudgate.js').App();

//Start listening
app.listen(port, (listenSocket) => {
    if (listenSocket) {
        console.log("CloudGate V" + version + " started");
        console.log('Listening to port ' + port + " - ProcessID: " + process.pid );
    }
});

//WEBSOCKET
require('../lib/Websocket')(app, rootFolder);

//REST API
require('../lib/API')(app, rootFolder);
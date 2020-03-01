
var version = "1.0.0";

var port = 8081;
var rootFolder = "/root/cloudgate/public";

const tools = require('../lib/Tools.js');

//Without SSL
var app = require('../bin/cloudgate.js').App();

//Start listening
app.listen(port, (listenSocket) => {
    if (listenSocket) {
        console.log("CloudGate V" + version + " started");
        console.log('Listening to port ' + port + " - ProcessID: " + process.pid );
    }
});


//REST API
//require('../lib/API')(app, rootFolder);

app.any('/debug', async (res, req) => {

        res.onAborted(() => {
            res.aborted = true;
        });

        var content = "Hello, World! " + (+new Date());
       
        if (!res.aborted) {
            res.end(content); //standard output, no gzip
            return;
        }
})

app.any('/debugFull', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

        var content = "";
        content = "Hello, World! " + (+new Date());
        content += "<b>DEBUG INFOS - " + new Date() + "</b><br/><br/>\r\n\r\n";
        content += "Method: " + req.getMethod() + "<br/>\r\n";
        content += "URL: " + req.getUrl() + "<br/>\r\n";
        content += "Host: " + req.getHeader("host") + "<br/>\r\n";
        content += "Headers: " + JSON.stringify(tools.getHeaders(req)) + "<br/>\r\n";
        content += "Remote IP: " + tools.getIP(req, res) + "<br/>\r\n";
        content += "Query: " + req.getQuery() + "<br/>\r\n";
        content += "Body: " + tools.getBody(req) + "<br/>\r\n";

        if (!res.aborted) {
            res.end(content); //standard output, no gzip
            return;
        }
})

//Handle static files serving
require('../lib/StaticFiles')(app, rootFolder);


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

var os = require("os");
var hostname = os.hostname();

var parentPort, Worker, isMainThread, threadId;
threadId = 0;

try{
   parentPort = require('worker_threads').parentPort;
   Worker = require('worker_threads').Worker;
   isMainThread = require('worker_threads').isMainThread;
   threadId = require('worker_threads').threadId;
}
catch(ex){

}

const tools = require('../lib/tools.js');

const WebSocket = require('ws');
var wsClient = null;

var cloudgateMaster = require('uWebSockets.js').App();

module.exports = {
    startServer: function(host, port, memory, token) {

        cloudgateMaster.ws('/*', {
            compression: 0,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 60 * 60 * 24 * 1, //1 day

            open: async (ws, req) => {
                ws.subscribe('CloudgateCluster');
                //console.log("new client subs")
            },
            message: async (ws, message, isBinary) => {
                //receive new memory SET, store them, publish them on a pub/sub channel
                //console.log(message); //binary
                var msgSTR = tools.ab2str(message);
                //console.log("Message received on GateMaster");
                //console.log(msgSTR);
                
                var msg = JSON.parse(msgSTR);

                //send to master thread
                //parentPort.postMessage(msg);

                //send to all other nodes 
                cloudgateMaster.publish('CloudgateCluster', msgSTR);
                //cloudgateMaster.publish('CloudgateCluster', message);
                //console.log("Pushed to channel CloudgateCluster");
                
            },
            drain: (ws) => {
                //console.log("GateMaster DRAIN!");
            },
            close: async (ws, code, message) => {
                //console.log("GateMaster client closed: " + code + " - " + tools.ab2str(message));
            }
        })

        //Server start listening
        cloudgateMaster.listen(host, port, (listenSocket) => {
            if (listenSocket) {

                console.log('Cloudgate Master PubSub started on port ' + port + " - Host: " + host + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);
                
            }
        });
    },
    startClient: function(host, port, memory, token) {

        var ws = new WebSocket("ws://" + host + ":" + port + "/GateMaster");
        wsClient = ws;
        var nbConnectRetry = 0;
        ws.onopen = function() {
            //ws.send(JSON.stringify(obj));
            nbConnectRetry = 0;
            console.log("Client threadId: " + threadId + " is now connected to GateMaster " + host + ":" + port );
        };

        ws.onmessage = function(e) {
            //console.log('Message received from GateMaster: ', e.data);

            var obj = JSON.parse(e.data);

            if ( obj.source == hostname){
                //console.log("Msg discarded because coming from this host!")
                return;
            }

            if ( parentPort != null ){
                parentPort.postMessage(obj);
                //console.log("Message from gatemaster sent to Master thread for local delivery threads")
            }
        };

        ws.onclose = function(e) {
            console.log('Socket is closed. Reconnect will be attempted in ' + nbConnectRetry + ' seconds.', e.reason);
            setTimeout(function() {
                //connect();
                module.exports.startClient(host, port, memory);
            }, 1000 * nbConnectRetry); //backoff mechanism
        };

        ws.onerror = function(err) {
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            ws.close();

            nbConnectRetry += 1;
        };

        return ws;
    },
    postToServer: function(msg) {

       if ( wsClient != null && wsClient.readyState == 1){

            //console.log("Posting to GateMaster")
            //console.log(msg);
            wsClient.send(JSON.stringify(msg));
            //slower if we post each message ... instead we should push message in batches every 1 second or 100ms
        }
        
    },
    publishToGateMaster: function(msg) {
        cloudgateMaster.publish('CloudgateCluster', msg);
    }
}
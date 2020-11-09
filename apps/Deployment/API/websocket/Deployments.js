const qs = require('querystring');
const shell = require('shelljs');

var channelCache = {};

exports.open = (event, context, callback) => {

    //callback(null, "Message from cloudgate backend: Websocket is open, echo service is started");
    
    if ( context.apiEndpoint.token == "XXXXXXXXXXXXXXXXXXXXXXXXXX" ){
        event.ws.send("token have not been configured in appconfig.json! Fix this first!\nAccess not authorized");
        return;
    }
    
    var params = qs.parse(event.query);
    if (params.channel && params.token != null && params.token == context.apiEndpoint.token){           
        
        event.ws.token = params.token;
        event.ws.subscribe(params.channel);
        event.ws.channel = params.channel;
        callback(null, "Subscribed to channel: " + params.channel);

        //send cached messages
        if ( channelCache[params.channel] != null ){
            for (var i = 0; i < channelCache[params.channel].length; i++){
                var cur = channelCache[params.channel][i];
                if ( cur != null ){
                    event.ws.send(cur);
                }
            }

            //event.ws.send(channelCache[params.channel].length + " items");
        }
    }
    else{
        event.ws.send("Unauthorized");
    }
    
};

var lastExecProcess = null;
exports.message = async (event, context, callback) => {

    if ( context.apiEndpoint.token == "XXXXXXXXXXXXXXXXXXXXXXXXXX" ){
        event.ws.send("token have not been configured in appconfig.json! Fix this first!\nAccess not authorized");
        return;
    }
    if ( event.ws.token != context.apiEndpoint.token ){
        event.ws.send("Unauthorized");
        return;
    }


    //When we receive a message from the builder thread, we publish it to all subscribers
    if ( event.body != null && event.body != "" && event.body != "[HEARTBEAT]"){
        AddToChannelCache(event.ws.channel, event.body);
        event.app.publish(event.ws.channel, event.body);
    }

    //when we receive a client command
    if ( event.body != null && event.body != "" && event.body.indexOf("EXEC_CMD") > -1){

        //exec
        var obj = JSON.parse(event.body);
        var cmd = obj.EXEC_CMD;

        console.log("CMD: " + cmd + "\n----------------------------");
             
        //print back the command
        //AddToChannelCache(event.ws.channel, event.body);
        //event.app.publish(event.ws.channel, event.body);

        let child = await shell.exec(cmd
            , {
                silent: false,
                async:true,
            }, async function(code, stdout, stderr) {
            console.log('Exit code:', code);
            console.log("----------------------------");
            logsError = stderr;
            if (code !== 0) {
                status = "failed";
            }

            try{
                AddToChannelCache(event.ws.channel, "Action finished @ " + (new Date()));
                event.app.publish(event.ws.channel, "Action finished @ " + (new Date()));
            }
            catch(ex){

            }

            //resolve();
        });
        lastExecProcess = child;
        //todo: set a timeout to kill the process after a certain amount of time ...

        child.stdout.on('data', function(data) {
            // TODO WRITE TO WS
            let logLine =  "<span class='std_output'>" + data.replace(/\n/g, "<br/>").replace(//g, "") + "</span>" ;
            //logs += logLine;
            AddToChannelCache(event.ws.channel, logLine);
            event.app.publish(event.ws.channel, logLine);
            //console.log("ON DATA FROM STDOUT");
        });
        child.stderr.on('data', function(data) {
            // TODO WRITE TO WS
            let logLine = "<span class='std_error'>" + data.replace(/\n/g, "<br/>").replace(//g, "") + "</span>";
            //logs += logLine;
            //ws.send( "<div style='color: red;'>" + ansi2html(data).replace(/\n/g, "<br/>").replace(//g, "") + "</div>");
            AddToChannelCache(event.ws.channel, logLine);
            event.app.publish(event.ws.channel, logLine);
            //console.log("ON DATA FROM STDOUT");
        });
    }
};

exports.close = (event, context, callback) => {
    // Do something like decrement number of users, close session,  ...
    
    //here your response will be discarded because the websocket 
    //is already closed at clientside when we receive this event
    //callback(null, null);
};



var deduplication = {};
function AddToChannelCache(channel, body)
{
    if ( channelCache[channel] == null ){
        channelCache[channel] = [body];
    }
    else{
        if ( deduplication[channel] == null ){
            channelCache[channel].push(body);
            deduplication[channel] = {};
            deduplication[channel][body] = 1
        }
        else if ( deduplication[channel] != null && deduplication[channel][body] == null ){
            channelCache[channel].push(body);
            deduplication[channel][body] = 1
        }
    }
}
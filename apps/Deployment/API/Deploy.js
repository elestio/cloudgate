exports.handler = async (event, context, callback) => {

    //console.log(context.apiEndpoint);

    if ( event.POST == null || event.POST["token"] != context.apiEndpoint.token ){
        callback(null, {
            status: 400,
            content: "INVALID TOKEN PROVIDED", 
            headers:{
                "Content-Type": "text/html"
            }
        });
        return;
    }

    

    var beginPipeline = process.hrtime();
    var sharedmem = context.sharedmem;

    var obj = JSON.parse(event.body);
    var buildScript = obj.script;

    var channel = `deployments`; //TODO: should be something ...
    var ws = new WebSocket("/deployments?channel=" + channel);
    ws.onopen = function() {
        console.log("WS Client is now connected to channel: " + channel);
    };
    ws.onclose = function(e) {
        console.log('Socket is closed. for channel ' + channel + " ", e.reason);
    };

    ws.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
    };

    let child = shell.exec(buildScript
        , {
            silent: false,
            async:true,
        }, async function(code, stdout, stderr) {
        console.log('Exit code:', code);
        logsError = stderr;
        if (code !== 0) {
            status = "failed";
        }

        try{
            ws.send("Action finished @ " + (new Date()));
            ws.close();
        }
        catch(ex){

        }

        resolve();
    });
    child.stdout.on('data', function(data) {
        // TODO WRITE TO WS
        let logLine =  "<span class='std_output'>" + data.replace(/\n/g, "<br/>").replace(//g, "") + "</span>" ;
        logs += logLine;
        ws.send(logLine);
        //console.log("ON DATA FROM STDOUT");
    });
    child.stderr.on('data', function(data) {
        // TODO WRITE TO WS
        let logLine = "<span class='std_error'>" + data.replace(/\n/g, "<br/>").replace(//g, "") + "</span>";
        logs += logLine;
        //ws.send( "<div style='color: red;'>" + ansi2html(data).replace(/\n/g, "<br/>").replace(//g, "") + "</div>");
        ws.send( logLine );
        //console.log("ON DATA FROM STDOUT");
    });


    /*
    var response = "";
    response = "<b>Hello, World! From Sample</b><br/><br/>\r\n\r\n";
    response += "Timestamp: " + (+new Date()) + "<br/>\r\n";
    response += "Method: " + event.method + "<br/>\r\n";
    response += "URL: " + event.url + "<br/>\r\n";
    response += "Host: " + event.headers["host"] + "<br/>\r\n";
    response += "Headers: " + JSON.stringify(event.headers) + "<br/>\r\n";
    response += "Remote IP: " + event.ip + "<br/>\r\n";
    response += "Query: " + event.query + "<br/>\r\n";
    response += "Body: " + event.body + "<br/>\r\n";
    */

    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    callback(null, {
        status: 200,
        content: "OK", 
        headers:{
            "Content-Type": "text/html",
            "processTime": durationMS
        }
    });

};

exports.handler = async (event, context, callback) => {

    var beginPipeline = process.hrtime();
    
    var sharedmem = context.sharedmem;

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

    //sharedmem.setString("test1", "123", "MyCollection1");
    //sharedmem.setString("test1", "456", "MyCollection2");
    //sharedmem.setString("test1", "789", "MyCollection3");
    
    //response += "sharedmem - test1 in MyCollection1: " + sharedmem.getString("test1", "MyCollection1") + "<br/>\r\n";   
    //response += "sharedmem - test1 in MyCollection2: " + sharedmem.getString("test1", "MyCollection2") + "<br/>\r\n";   
    //response += "sharedmem - test1 in MyCollection3: " + sharedmem.getString("test1", "MyCollection3") + "<br/>\r\n";   

    sharedmem.incInteger("test-counter", 1);
    response += "sharedmem: " + sharedmem.getInteger("test-counter") + "<br/>\r\n";   
    
    /*
    response += "sharedmem getIntegerKeys: " + sharedmem.getIntegerKeys() + "<br/>\r\n";
    response += "sharedmem getStringKeys: " + sharedmem.getStringKeys() + "<br/>\r\n";

    response += "http.requests: " + sharedmem.getInteger("http.requests") + "<br/>\r\n";
    response += "http.data.in: " + sharedmem.getInteger("http.data.in") + "<br/>\r\n";
    response += "http.data.out: " + sharedmem.getInteger("http.data.out") + "<br/>\r\n";
    response += "websocket.connected: " + sharedmem.getInteger("websocket.connected") + "<br/>\r\n";
    response += "websocket.data.in: " + sharedmem.getInteger("websocket.data.in") + "<br/>\r\n";
    response += "websocket.data.out: " + sharedmem.getInteger("websocket.data.out") + "<br/>\r\n";
    */

    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    callback(null, {
        status: 200,
        content: response, 
        headers:{
            "processTime": durationMS
        }
    });

};

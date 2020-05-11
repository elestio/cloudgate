exports.handler = async (event, context, callback) => {
    
    var response = "";
    response = "<b>Hello, World! From Sample1</b><br/><br/>\r\n\r\n";
    response += "Timestamp: " + (+new Date()) + "<br/>\r\n";
    response += "Method: " + event.method + "<br/>\r\n";
    response += "URL: " + event.url + "<br/>\r\n";
    response += "Host: " + event.headers["host"] + "<br/>\r\n";
    response += "Headers: " + JSON.stringify(event.headers) + "<br/>\r\n";
    response += "Remote IP: " + event.ip + "<br/>\r\n";
    response += "Query: " + event.query + "<br/>\r\n";
    response += "Body: " + event.body + "<br/>\r\n";


    callback(null, {
        status: 200,
        content: response, 
        headers:{
            "my-custom-header": "1234567890"
        }
    });

};

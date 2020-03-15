var nbExecs = 0;

module.exports = async (app, curFunctionFolder, API_Token, res, req) => {
    //init: this code is executed only for cold starts
    nbExecs = 0;
}

module.exports.process = (res, req, tools) => {

    nbExecs += 1;

    var content = "";
    content = "<b>Hello, World!</b><br/><br/>\r\n\r\n";
    content += "Timestamp: " + (+new Date()) + "<br/>\r\n";
    content += "Method: " + req.getMethod() + "<br/>\r\n";
    content += "URL: " + req.getUrl() + "<br/>\r\n";
    content += "Host: " + req.getHeader("host") + "<br/>\r\n";
    content += "Headers: " + JSON.stringify(tools.getHeaders(req)) + "<br/>\r\n";
    content += "Remote IP: " + tools.getIP(req, res) + "<br/>\r\n";
    content += "Query: " + req.getQuery() + "<br/>\r\n";
    content += "Body: " + tools.getBody(req) + "<br/>\r\n";
    content += "endpoint request counter: " + nbExecs + "<br/>\r\n";

    res.writeStatus("200");
    res.writeHeader("content-type", "text/html");
    res.end(content); //standard output, no gzip
    return;

}
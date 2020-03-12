const tools = require('./Tools.js');

module.exports = (app, rootFolder, connection) => {

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
    });
}
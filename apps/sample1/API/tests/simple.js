module.exports = async (app, curFunctionFolder, API_Token, res, req) => {
    //init: this code is executed only for cold starts
}

module.exports.process = (res, req, tools) => {
    var content = "Hello, World!";
    res.end(content);
    return;
}
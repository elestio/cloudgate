exports.handler = (event, context, callback) => {
    // TODO implement
    var a = parseInt(event.queryStringParameters.a);
    var b = parseInt(event.queryStringParameters.b);
    callback(null, '{"result": ' + (a+b) + '}');
};
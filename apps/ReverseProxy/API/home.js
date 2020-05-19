exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, "This is a dynamic home page, Timestamp: " + (+new Date()));
};
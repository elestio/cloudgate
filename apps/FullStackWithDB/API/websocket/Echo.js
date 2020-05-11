
exports.open = (event, context, callback) => {
    //Say hello or send a message to the client, increment number of connected users, ...
    callback(null, "Message from cloudgate backend: Websocket is open, echo service is started");
};

exports.message = (event, context, callback) => {
    //Do something with the message received from the client (echo, broadcast it, subscribe to a channel, execute some code ...)

    //return the body received (echo)
    callback(null, event.body);
};

exports.close = (event, context, callback) => {
    // Do something like decrement number of users, close session,  ...
    
    //here your response will be discarded because the websocket 
    //is already closed at clientside when we receive this event
    callback(null, null);
};
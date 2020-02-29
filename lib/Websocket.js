
module.exports = (app, connection, db, rootFolder) => {

    var websocketPath = "/ws";
    app.ws(websocketPath, {

        /* Options */
        compression: 0,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 1800,

        /* Handlers */
        open: (ws, req) => {
            //do something when the websocket is open (subscribe to pub/sub channels, authenticate, disconnect ...)
        },
        message: (ws, message, isBinary) => {
        //handle messages received
        },
        drain: (ws) => {
        //
        },
        close: (ws, code, message) => {
            /* The library guarantees proper unsubscription at close */
        }
    })

}


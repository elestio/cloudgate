var fs = require('fs');
const tools = require('../lib/Utils.js');

//In-memory cache
var cache = {};
module.exports = (app, connection, db, rootFolder) => {

    app.any('/.well-known/*', async (res, req) => {

        //Ensure this request is notified on aborted
        res.onAborted(() => {
            res.aborted = true;
        });

    })
}


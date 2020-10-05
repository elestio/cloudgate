let multipart = require('parse-multipart');

module.exports = {
    name: 'ProcessMultipart',
    // Takes event, parses and adds any multipart parts based on event.body, event.headers
    // If a multipart, adds event.multiparts
    ProcessMultipart: function(event) {

        let contentType = event.headers["content-type"];
        if (contentType.startsWith('multipart')) {

            // this could be improved
            let boundaryOffset = contentType.indexOf('boundary=');
            if (boundaryOffset != -1) {
                let boundary = event.headers["content-type"].substring(boundaryOffset + 9);
                let rawBody = Buffer.from(event.body);

                // this one throws without a filename
                try {
                    let parts = multipart.Parse(rawBody, boundary);
                    if (parts.length) {
                        event.multiparts = parts;
                    }
                } catch (e) {
                    // we failed to parse, or body lacks expected metadata
                }
            }
        }
    }
};
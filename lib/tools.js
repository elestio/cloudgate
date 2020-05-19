
const { Readable } = require('stream');
var zlib = require('zlib');
var path = require('path');

const memory = require('../modules/memory');

module.exports.getIP = getIP;
function getIP(req, res) {

    //direct IP 
    var ipArray = (new Uint8Array(res.getRemoteAddress()));
    let ip = ipArray[12] + "." + ipArray[13] + "." + ipArray[14] + "." + ipArray[15];

    //check if we have some headers indicating another real ip (from cloudflare or from nginx)
    var user_ip;
    if(req.getHeader['cf-connecting-ip'] && req.getHeader['cf-connecting-ip'].split(', ').length) {
      let first = req.getHeader['cf-connecting-ip'].split(', ');
      user_ip = first[0];
    } else {
      user_ip = req.getHeader['x-forwarded-for'] || req.getHeader['x-real-ip'] || ip;
    }

  return user_ip;
}

module.exports.getHeaders = getHeaders;
function getHeaders(req){
    var headers = null;
    req.forEach((key, value) => {
      if (!headers) {
        headers = {};
      }
      headers[key] = value;
    });

    return headers;
}

module.exports.getBody = getBody;
function getBody(req, res) {

  return new Promise((resolve) => {
    const stream = new Readable();
    stream._read = () => true;
    req.pipe = stream.pipe.bind(stream);
    req.stream = stream;

    if (!res || !res.onData) {
        resolve();
        return ;
    }

    /* Register error cb */
    if (!res.abortHandler && res.onAborted) {
      res.onAborted(() => {
        if (res.stream) {
          res.stream.destroy();
        }
        res.aborted = true;
        resolve();
      });
      res.abortHandler = true;
    }

    let buffer;
    //console.log("waiting for data");
    res.onData((chunkPart, isLast) => {
      //console.log("got data");
      const chunk = Buffer.from(chunkPart);
      stream.push(
        new Uint8Array(
          chunkPart.slice(chunkPart.byteOffset, chunkPart.byteLength)
        )
      );
      if (isLast) {
        stream.push(null);
        if (buffer) {
          resolve(Buffer.concat([buffer, chunk]).toString('utf8'));
        } else {
          resolve(chunk.toString('utf8'));
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });
  });

}

module.exports.streamToString = function (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

module.exports.toArrayBuffer = function (buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

module.exports.GzipContent = function (content)
{
    return zlib.gzipSync(content);
 }

 module.exports.safeJoinPath = function (...paths) {
   return path.join(...paths).replace(/\\/g, "/");
 }

function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

 module.exports.ab2str =  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

// Marshals a string to an Uint8Array.
 module.exports.encodeUTF8StringToBuff = function encodeUTF8StringToBuff(s) {
	var i = 0, bytes = new Uint8Array(s.length * 4);
	for (var ci = 0; ci != s.length; ci++) {
		var c = s.charCodeAt(ci);
		if (c < 128) {
			bytes[i++] = c;
			continue;
		}
		if (c < 2048) {
			bytes[i++] = c >> 6 | 192;
		} else {
			if (c > 0xd7ff && c < 0xdc00) {
				if (++ci >= s.length)
					throw new Error('UTF-8 encode: incomplete surrogate pair');
				var c2 = s.charCodeAt(ci);
				if (c2 < 0xdc00 || c2 > 0xdfff)
					throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
				c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
				bytes[i++] = c >> 18 | 240;
				bytes[i++] = c >> 12 & 63 | 128;
			} else bytes[i++] = c >> 12 | 224;
			bytes[i++] = c >> 6 & 63 | 128;
		}
		bytes[i++] = c & 63 | 128;
	}
	return bytes.subarray(0, i);
}

// Unmarshals a string from an Uint8Array.
module.exports.decodeUTF8BuffToString = function decodecodeUTF8BuffToStringdeUTF8(bytes) {
	var i = 0, s = '';
	while (i < bytes.length) {
		var c = bytes[i++];
		if (c > 127) {
			if (c > 191 && c < 224) {
				if (i >= bytes.length)
					throw new Error('UTF-8 decode: incomplete 2-byte sequence');
				c = (c & 31) << 6 | bytes[i++] & 63;
			} else if (c > 223 && c < 240) {
				if (i + 1 >= bytes.length)
					throw new Error('UTF-8 decode: incomplete 3-byte sequence');
				c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
			} else if (c > 239 && c < 248) {
				if (i + 2 >= bytes.length)
					throw new Error('UTF-8 decode: incomplete 4-byte sequence');
				c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
			} else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
		}
		if (c <= 0xffff) s += String.fromCharCode(c);
		else if (c <= 0x10ffff) {
			c -= 0x10000;
			s += String.fromCharCode(c >> 10 | 0xd800)
			s += String.fromCharCode(c & 0x3FF | 0xdc00)
		} else throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
	}
	return s;
}

function isJSON(str) {
    if ( /^\s*$/.test(str) ) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

function arrayBufferToString(buffer) {

    var bufView = new Uint16Array(buffer);
    var length = bufView.length;
    var result = '';
    var addition = Math.pow(2, 16) - 1;

    for (var i = 0; i < length; i += addition) {

        if (i + addition > length) {
            addition = length - i;
        }
        result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
    }

    return result;

}
function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


module.exports.GetRandomId = function(){
    return Math.random().toString(36).slice(2) + (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
}

module.exports.debugLog = debugLog;
function debugLog(category, statusCode, bytesSent, reqInfo, serverConfig){

    if ( serverConfig.debug){
        var finalURL = reqInfo.url;
        if ( reqInfo.query != null && reqInfo.query != ""){
            finalURL = finalURL + "?" + reqInfo.query;
        }

        console.log("[" + category + "] " + reqInfo.ip + " [" + new Date().toUTCString() + "] " + reqInfo.host + " " + reqInfo.method + " " + finalURL + " " + statusCode + " " + bytesSent);
    }
} 


/* Helper function to pipe the ReadaleStream over an Http responses */
module.exports.pipeStreamOverResponse = function pipeStreamOverResponse(res, readStream, totalSize, memory) {
    try{
        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
        readStream.on('data', (chunk) => {
            /* We only take standard V8 units of data */
            const ab = toArrayBuffer(chunk);

            if ( res.aborted ){
                return;
            }

            /* Store where we are, globally, in our response */
            let lastOffset = res.getWriteOffset();

            /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
            let [ok, done] = res.tryEnd(ab, totalSize);

            //console.log("sent bytes: " + chunk.byteLength);
            if ( memory != null ){
                memory.incr("http.data.out", chunk.byteLength, "STATS");
            }
                

            /* Did we successfully send last chunk? */
            if (done) {
            onAbortedOrFinishedResponse(res, readStream);
            } else if (!ok) {
            /* If we could not send this chunk, pause */
            readStream.pause();

            /* Save unsent chunk for when we can send it */
            res.ab = ab;
            res.abOffset = lastOffset;

            /* Register async handlers for drainage */
            res.onWritable((offset) => {
                /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */

                /* On failure the timeout will start */
                let [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
                if (done) {
                onAbortedOrFinishedResponse(res, readStream);
                } else if (ok) {
                /* We sent a chunk and it was not the last one, so let's resume reading.
                * Timeout is still disabled, so we can spend any amount of time waiting
                * for more chunks to send. */
                readStream.resume();
                }

                /* We always have to return true/false in onWritable.
                * If you did not send anything, return true for success. */
                return ok;
            });
            }

        }).on('error', () => {
            /* Todo: handle errors of the stream, probably good to simply close the response */
            console.log('Unhandled read error from Node.js, you need to handle this!');
            
        });

        /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
        res.onAborted(() => {
            //readStream.destroy();
            res.aborted = true;
        });
    }
    catch(ex){
        //console.log("Socket is probably closed ...");
        //console.trace();
    }
}

let openStreams = 0;
let streamIndex = 0;
function onAbortedOrFinishedResponse(res, readStream) {

  if (res.id == -1) {
    console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
  } else {
    //console.log('Stream was closed, openStreams: ' + --openStreams);
    //console.timeEnd(res.id);
    readStream.destroy();
  }

  /* Mark this response already accounted for */
  res.id = -1;
}
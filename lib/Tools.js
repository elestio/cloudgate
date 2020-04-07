
const { Readable } = require('stream');
var zlib = require('zlib');

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

    const stream = new Readable();
    stream._read = () => true;
    req.pipe = stream.pipe.bind(stream);
    req.stream = stream;

    if (!res || !res.onData) {
        return undefined;
    }

    return new Promise((resolve) => {
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
    res.onData((chunkPart, isLast) => {
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

module.exports.GzipContent = function (content)
{
    return zlib.gzipSync(content);
 }

function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
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
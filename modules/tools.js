var fs = require('fs');
const { readdirSync, statSync } = require('fs')
const { join } = require('path')
const { Readable } = require('stream');
var zlib = require('zlib');
var path = require('path');
const resolve = require('path').resolve;

const memory = require('../modules/memory');
var sharedmem = require("../modules/shared-memory");
var shell = require('shelljs');
const { v4: uuidv4 } = require('uuid');

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
function getBody(req, res, isBinary) {
  
  if ( isBinary == null ){
      isBinary = false;
  }
  else{
      isBinary = true;
  }

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
            if ( isBinary ){
                resolve(Buffer.concat([buffer, chunk])); //read binary content
            }
            else{
                resolve(Buffer.concat([buffer, chunk]).toString('utf8'));
            }          
        } else {
          
            if ( isBinary ){
                resolve(chunk);
            }
            else{
                resolve(chunk.toString('utf8'));
            }
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

module.exports.streamToBuffer = function (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
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

module.exports.gunzip = gunzip;
function gunzip(buff){
    return new Promise( function(resolve , reject ){
        zlib.gunzip(buff, function(err, dezipped) {
                if ( err ) {
                    reject(err);
                }
                else{
                    resolve(dezipped.toString("utf-8"));
                }
        });
    });
}


 module.exports.safeJoinPath = function (...paths) {
   return path.join(...paths).replace(/\\/g, "/");
 }


 function FileChunkToArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

 module.exports.ab2str =  function ab2str(buf) {
    //return String.fromCharCode.apply(null, new Uint8Array(buf));
    if ( typeof buf == "string" ){
        return buf
    }
    else{
        return (new TextDecoder().decode(buf));
    }
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


var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 // Use a lookup table to find the index.
var lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}
 
module.exports.decodeB64 = function (base64) {
    
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = lookup[base64.charCodeAt(i)];
      encoded2 = lookup[base64.charCodeAt(i+1)];
      encoded3 = lookup[base64.charCodeAt(i+2)];
      encoded4 = lookup[base64.charCodeAt(i+3)];

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };


module.exports.GetRandomId = function(){
    return Math.random().toString(36).slice(2) + (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
}

const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
module.exports.GetDirectoriesArray = dirs;

module.exports.isDirEmpty = emptyDirSync;
function emptyDirSync(dir, filter) {
  if (Array.isArray(dir)) {
    return isEmpty(dir, filter);
  }

  if (typeof dir !== 'string') {
    throw new TypeError('expected a directory or array of files');
  }

  if (!isDirectory(dir)) {
    return false;
  }

  var files = fs.readdirSync(dir);
  return isEmpty(files, filter);
}

function isEmpty(files, filter) {
  if (files.length === 0) {
    return true;
  }

  if (typeof filter !== 'function') {
    return false;
  }

  for (var i = 0; i < files.length; ++i) {
    if (filter(files[i]) === false) {
      return false;
    }
  }
  return true;
}

function isDirectory(filepath) {
  try {
    return fs.statSync(filepath).isDirectory();
  } catch (err) {
    // Ignore error
  }
  return false;
}




module.exports.readLineAsync = readLineAsync;
function readLineAsync(message) {
  return new Promise((resolve, reject) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
} 
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


module.exports.ReplaceInFile = ReplaceInFile;
function ReplaceInFile(regexpFind, replace, filePath) {
    var contents = fs.readFileSync(filePath, 'utf8');
    var newContent = contents.replace(regexpFind, replace);
    fs.writeFileSync(filePath, newContent);
}

module.exports.sleep = sleep;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.debugLog = debugLog;
function debugLog(category, statusCode, bytesSent, reqInfo, serverConfig){

    if ( serverConfig.debug){
        var finalURL = reqInfo.url;
        if ( reqInfo.query != null && reqInfo.query != ""){
            finalURL = finalURL + "?" + reqInfo.query;
        }

        console.log("[" + new Date().toISOString() + "] [" + category + "] [" + reqInfo.method + "] " + reqInfo.host + finalURL + " - SourceIP: " + reqInfo.ip + " - Status: " + statusCode + "- BytesSent: " + bytesSent);
    }
} 


/* Helper function to pipe the ReadaleStream over an Http responses */
module.exports.pipeStreamOverResponse = function pipeStreamOverResponse(res, readStream, totalSize, memory) {
    try{
        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
        readStream.on('data', (chunk) => {
            /* We only take standard V8 units of data */
            const ab = FileChunkToArrayBuffer(chunk);

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
                //sharedmem.incInteger("http.data.out", chunk.byteLength);
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

module.exports.replaceAll = replaceAll;
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

module.exports.ProcessCommandLine = ProcessCommandLine;
function ProcessCommandLine(argv)
{
    const memory = require('../modules/memory');

    if (argv.h || argv.help) {
        console.log([
            '',
            'USAGE: cloudgate [path] [options]',
            '',
            '[GENERAL]',
            '  --memstate [path] path pointing to your memorystate.json, optional',
            '  -r --rootfolder [path] root folder for your app',
            '  -c --cores [nbCores]    Number of CPU cores to use (default: ALL cores), Eg.: --cores 4',
            '  -p --port [port]    Port to use [8080]',
            '  -oc --outputcache [0 or 1] Default is 0, disabled. When enabled this will cache all GET requests until file is changed on disk.',
            '  -h --help          Print this list and exit.',
            '  -v --version       Print the version and exit.',
            '  -w --watch   Activate file change watch to auto invalidate cache [default: disabled]',
            '  -d --debug    Activate the console logs for debugging',
            //'  -a           Address to use [0.0.0.0]', //when used we can't get the visitor ip!
            '',
            '[SSL]',
            '  -S --ssl     Enable https.',
            '  --sslport    SSL Port (default: 443)',
            '  --ssldomain  Domain name on which you want to activate ssl (eg: test.com)',
            '  --sslcert  optional path to your SSL cert. E.g: /etc/letsencrypt/live/yourdomain.com/cert.pem',
            '  --sslkey  optional path to your SSL key. E.g: /etc/letsencrypt/live/yourdomain.com/privkey.pem',
            '',
            '[ADMIN]',
            '  --admin 1    Enable Admin Remote API (default: disabled)',
            '  --adminpath /cgadmin    Declare the virtual path of the admin api',
            '  --admintoken XXXXXXXX    The admin token to use for authentication of the REST API & Websocket',
            '',
            '[CLUSTER]',
            '  --master     Declare this host as the master',
            '  --salve [Master IP or Domain]:[Port]@[Token]     Declare this host as a slave connecting to a master',
            //'  -C --cert    Path to ssl cert file (default: cert.pem).',
            //'  -K --key     Path to ssl key file (default: key.pem).',
            '',
            '[APPS]',
            '--list                  return an array of loaded apps path',
            '--load     [path]    Load the app located in the target path, the folder must contain appconfig.json',
            '--unload   [path]    Unload the app located in the target path',
            '--create      [path]    Create a new app based on a template in the target path'

        ].join('\n'));
        
        process.exit();
    }

    if (argv.create) {
    
    var targetPath = argv.create;
    //check if the folder exist to avoid accidental overwrite
    if (fs.existsSync(targetPath) && !(this.isDirEmpty(targetPath))) {
        console.log("This folder already exist and contains files, to avoid overwriting please provide a new path to be created");
        process.exit();
    }

    if (targetPath == true) {
        console.log("You must provide a target path where your new app will be created");
        process.exit();
    }

    //convert to absolute path
    targetPath = resolve(targetPath);

    //create the new folder
    console.log("Creating folder: " + targetPath);
    shell.mkdir('-p', targetPath);

    //ask the user which template to use    
    var templates = this.GetDirectoriesArray( path.join(__dirname, "../", "/apps/") );

    //prompt the user to select a template
    (async () => {
        var promptMSG = `Select a template: `;
        for (var i = 0; i < templates.length; i++){
            promptMSG += "\n" + i + ") " + templates[i];
        }
        promptMSG += "\nType your choice and press Enter\n";
        var resp = await this.readLineAsync(promptMSG);
        
        var selectedTemplate = "";
        try{
            var choiceID = parseInt(resp);
            selectedTemplate = templates[choiceID];
            if ( selectedTemplate == null ){
                throw "Invalid_choice";
            }
        }
        catch(ex){
            console.log("Invalid choice selected, operation aborted");
            process.exit();
        }

        //Domain to listen to
        promptMSG = "Virtual host name, Eg: www.example.com, leave empty to catch all\n";
        var domain = await this.readLineAsync(promptMSG);
        if ( domain == "" ){
            domain = "*";
        } 
        //console.log("Virtual host: " + resp);

        var reverseURL = "";
        if ( selectedTemplate == "ReverseProxy" ){
            promptMSG = "Url of your target service to reverse proxy, Eg: https://www.google.com/\n";
            reverseURL = await this.readLineAsync(promptMSG);
            if ( reverseURL == "" ){
                reverseURL = "https://www.google.com/";
            } 
        }
        
        //copy template to target path
        shell.cp('-R', path.join(__dirname, "../", '/apps/' + selectedTemplate + "/") + "*", targetPath);
        console.log("Your new app have been created in path: " + targetPath);

        //change the domain in the appconfig.json
        this.ReplaceInFile('"*"', '"' + domain + '"', targetPath + path.sep + "appconfig.json");

        //if we are using the reverse proxy template, set the reverse url
        if ( reverseURL != "" ){
            this.ReplaceInFile('https://www.google.com/', reverseURL, targetPath + path.sep + "appconfig.json");
        }
        
        process.exit();
    })();

    return;
    }

    if (argv.load) {
        
        var appPath = resolve(argv.load);
        if ( !appPath.endsWith("/") ){
            appPath += "/";
        }
        else if ( appPath.endsWith("/") ){

        }

        if ( !argv.memstate ){
            if (fs.existsSync(argv.memstate)) {
                argv.memstate = "/etc/cloudgate/memorystate.json";    
            }
            else{
                console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
                process.exit();
            }
        }

        //Loading memorystate.json
        var memoryPath = argv.memstate;
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
        }

        (async () => {
        
            //check if the app contains a DB and if it's already created or not
            var appconfigPath = path.join(appPath, "appconfig.json");
            if ( appPath.indexOf("appconfig.json") > -1 ){
                appconfigPath = appPath;
            }

            var sqlConfigPath = "DB/MYSQL/config.json";
            var sqlConfig = null;
            if (fs.existsSync(sqlConfigPath)) {
                let rawdata = fs.readFileSync(sqlConfigPath);
                sqlConfig = JSON.parse(rawdata);
            }
            
            if (fs.existsSync(appconfigPath)) {
                let rawdata = fs.readFileSync(appconfigPath, 'UTF8');
                //console.log(rawdata);
                let appconfigObj = JSON.parse(rawdata);

                //check if no domain configure
                if (appconfigObj.domains == null || appconfigObj.domains.length == 0){
                    console.log("No domains configured in your appconfig.json");
                    console.log("Operation aborted, unable to load this app");
                    process.exit(0);
                }

                //check if registered domains are not overlapping existing apps. Block if it's the case.
                for (var i = 0; i < appconfigObj.domains.length; i++){
                    var curDomain = appconfigObj.domains[i];

                    var testDomain = memory.getObject(curDomain, "GLOBAL");
                    if ( testDomain != null && (testDomain.root != appPath) && (testDomain.root + "/" != appPath) && (testDomain.root != appPath + "/") ){

                        console.log("Another app (" + testDomain.root + ") is already using the domain '" + curDomain + "'");
                        console.log("Either unload that other app with: cloudgate --memstate " + argv.memstate + " --unload " + testDomain.root);
                        console.log("or change your domain in the new app you want to load: nano " + appconfigPath);
                        console.log("Operation aborted, unable to load this app");
                        process.exit(0);
                    }

                }


                if ( appconfigObj.db != null && appconfigObj.db.MYSQL != null )
                {
                    var dbName = appconfigObj.db.MYSQL.database;
                    if ( dbName == null || dbName == ""){
                        console.log("Skipping DB creation since no database is defined in appconfig.json");
                    }
                    else{

                        //DB is needed, check if MySQL is installed
                        if (sqlConfig == null && appconfigObj.db.MYSQL.host.toUpperCase() == "AUTO"){
                            console.log("Operation aborted, this app require a managed mysql instance to be loaded");
                            console.log("MySQL docker is not configured on this server, go to your cloudgate folder then go to subfolder DB/MYSQL and run: ./startMYSQL.sh");
                            process.exit();
                        }

                        //check if db is already created
                        var mysql = require('mysql');
                        var cpool = null;

                        if ( appconfigObj.db.MYSQL.host.toUpperCase() == "AUTO" ){
                            //we must create a user then restore the DB
                            cpool = mysql.createPool({
                                connectionLimit : 2,
                                host     : sqlConfig.host,
                                port     : sqlConfig.port,
                                user     : "root",
                                password : sqlConfig.rootPassword
                            });
                        }
                        else{
                            //we must check if the DB exist, if not restore the DB
                            cpool = mysql.createPool({
                                connectionLimit : 2,
                                host     : appconfigObj.db.MYSQL.host,
                                port     : appconfigObj.db.MYSQL.port,
                                user     : appconfigObj.db.MYSQL.user,
                                password : appconfigObj.db.MYSQL.password
                            });
                        }


                        var dbName = appconfigObj.db.MYSQL.database.replace(/\'/g, "''");
                        var query = "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '" + dbName + "';";
                        var result = await ExecuteQuery(cpool, query);
                        
                        if (result.length == 0){
                            
                            //create a new user and a new DB
                            var newUser = dbName;
                            var newPassword = uuidv4();
    
                            var opresult = null;
                            console.log("Creating new DB:");
                            opresult = await ExecuteQuery(cpool, "CREATE DATABASE `" + dbName + "`;");
                            if (opresult.sqlMessage != null){
                                console.log("Error while creating the database");
                                console.log(opresult.sqlMessage);
                                process.exit(0);
                            }
                            else{ console.log("OK"); }

                            console.log("Creating a new user for the DB:");
                            opresult = await ExecuteQuery(cpool, `CREATE USER '${newUser}'@'%' IDENTIFIED BY '${newPassword}';`);
                            if (opresult.sqlMessage != null){
                                console.log("Error while creating a new user");
                                console.log(opresult.sqlMessage);
                                process.exit(0);
                            }
                            else{ console.log("OK"); }
                            
                            console.log("Granting permissions on the new user:");
                            //opresult = await ExecuteQuery(cpool, `GRANT ALL PRIVILEGES ON ${dbName}.* TO '${newUser}'@'%';`);
                            opresult = await ExecuteQuery(cpool, "GRANT ALL PRIVILEGES ON `" + dbName + "`.* TO '" + newUser + "'@'%';");

                            if (opresult.sqlMessage != null){
                                console.log("Error while creating a new user");
                                console.log(opresult.sqlMessage);
                                process.exit(0);
                            }
                            else{ console.log("OK"); }
                            
                            await ExecuteQuery(cpool, `flush privileges;`);

                            //update appconfig.json
                            appconfigObj.db.MYSQL.host = sqlConfig.host;
                            appconfigObj.db.MYSQL.port = sqlConfig.port;
                            appconfigObj.db.MYSQL.user = dbName;
                            appconfigObj.db.MYSQL.password = newPassword;

                            if ( appconfigObj.db.MYSQL.apiToken == "AUTO" ){
                                appconfigObj.db.MYSQL.apiToken = uuidv4();
                            }
                            
                            //write new appconfig
                            fs.writeFileSync(appconfigPath, JSON.stringify(appconfigObj, null, 4), 'utf-8');
                            
                            //restore DB dump
                            if ( appconfigObj.db.MYSQL.dump != null && appconfigObj.db.MYSQL.dump != "" ){
                                console.log("Restoring DB dump");
                                var responseExec = shell.exec("cat " + path.join(appPath, appconfigObj.db.MYSQL.dump) + " | docker exec -i mysql80 /usr/bin/mysql --user=" + appconfigObj.db.MYSQL.user + " --password=" + appconfigObj.db.MYSQL.password + " " + dbName);
                                //console.log(responseExec);
                                console.log("Done");
                            }

                        }
                        else{
                            console.log("DB & DB User already exist, skipping creation");
                        }

                    }
                }
                else{
                    //console.log("No DB is required for this app");
                }
            }
            else{
                console.log("Unable to load app in: " + appPath);
                console.log('There is no appconfig.json in the provided app path');
                process.exit();
            }

            
            console.log("loading app: " + appPath);
            var loader = require("../modules/app-loader.js");
            var result = loader.load(appPath);
            console.log(result);

            //Get a new memory dump
            var fullMemory = memory.debug();
            //delete response cache because it's huge and temporary
            delete fullMemory["ResponseCache"];
            delete fullMemory["STATS"];
            delete fullMemory["TEMP"];
            delete fullMemory["undefined"];
            //save to disk
            fs.writeFileSync(memoryPath, JSON.stringify(fullMemory, null, 4), 'utf-8');

            process.exit();

        })();

        return;
    }

    if (argv.unload) {
        
        if ( !argv.memstate ){
            if (fs.existsSync(argv.memstate)) {
                argv.memstate = "/etc/cloudgate/memorystate.json";    
            }
            else{
                console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
                process.exit();
            }
        }

        //Loading memorystate.json
        var memoryPath = argv.memstate;
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
        }

        var appPath = resolve(argv.unload);

        console.log("unloading app: " + appPath);
        
        //find the target App in memory
        var mainMemory = memory.debug().GLOBAL;
        var list = Object.keys(mainMemory);
        var targetAppConfig = null;
        for (var i = 0; i < list.length; i++ ){
            var root = mainMemory[list[i]].root;
            if (root == appPath || root == appPath + "/"){
                targetAppConfig = mainMemory[list[i]];
                break;
            }
        }
        
        //clean appconfig cache
        if ( targetAppConfig != null ){
            for ( var i = 0; i < targetAppConfig.domains.length; i++){
                memory.remove(targetAppConfig.domains[i], "GLOBAL");
            }
            memory.remove(targetAppConfig.mainDomain, "GLOBAL");       
        }

        //Get a new memory dump
        var fullMemory = memory.debug();
        //delete response cache because it's huge and temporary
        delete fullMemory["ResponseCache"];
        delete fullMemory["STATS"];
        delete fullMemory["TEMP"];
        delete fullMemory["undefined"];
        //save to disk
        fs.writeFileSync(memoryPath, JSON.stringify(fullMemory, null, 4), 'utf-8');

        process.exit();
    }

    if (argv.list) {
        
        if ( !argv.memstate ){
            if (fs.existsSync(argv.memstate)) {
                argv.memstate = "/etc/cloudgate/memorystate.json";    
            }
            else{
                console.log("To load/unload apps you must provide the path to your memorystate.json. Eg: --memstate /etc/cloudgate/memorystate.json ");
                process.exit();
            }
        }

        //Loading memorystate.json
        var memoryPath = argv.memstate;
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
        }

        var mainMemory = memory.debug().GLOBAL;
        var list = Object.keys(mainMemory);
        var finalList = [];
        for (var i = 0; i < list.length; i++ ){
            if ( mainMemory[list[i]].root != null ){
                finalList.push(mainMemory[list[i]].root);
            }
        }
        console.log(finalList);

        process.exit();
    }
}


function ExecuteQuery(cpool, query) {
  return new Promise(function(resolve, reject) {

      cpool.query(query, function(error, results, fields) {
          if (error) {
              resolve(error);
          }
          else{
              resolve(results);
          }
      });
  });
}
#!/usr/bin/env node

//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

//prevent global crash
//TODO: should be loggued
process.on('uncaughtException', function (err) {
    if ( !err.toString().startsWith("Invalid access of closed") ){
        console.log("uncaughtException");
        console.log(err);
    }
})


var os = require("os");
const si = require('systeminformation');

var global = {};

//Handle multithreading (require node 12+), single thread mode stay compatible with node 10
var parentPort, Worker, isMainThread, threadId;
threadId = 0;

try{
   parentPort = require('worker_threads').parentPort;
   Worker = require('worker_threads').Worker;
   isMainThread = require('worker_threads').isMainThread;
   threadId = require('worker_threads').threadId;
}
catch(ex){

}

const fs = require('fs');
const resolve = require('path').resolve;

const memory = require('./modules/memory');
const sharedmem = require('./modules/shared-memory');
const cloudgatePubSub = require('./modules/cloudgate-pubsub.js');
const tools = require('./modules/tools.js');
const axios = require('axios');

var globalSSLApp = null;

//Load memory from dump if present
var memoryPath = "./memorystate.json";
if (fs.existsSync(memoryPath)) {
    var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
    memory.setMemory(JSON.parse(memorySTR));
    //console.log("Memory restored from dump file!");
}

//console.log(memory.debug());

//const { parentPort } = require('worker_threads');
if (parentPort != null) {
    
    //multithread mode
    parentPort.on('message', (msg) => {
        
        //console.log("Worker is receiving a msg: " + JSON.stringify(msg))
        //console.log(__dirname);

        if ( msg.source == os.hostname()){
            //console.log("Msg discarded because coming from this host!")
            return;
        }

        if ( msg.type == "CG_EXIT_WORKER" ){
            
            //clean exit of the worker
            console.log("Order to exit the worker")
            process.exit(0);
        }
        
        if ( msg.type == "CG_SSL_ADD" ){
            
            console.log("SSL Cert propagation to thread " + threadId);
            //globalSSLApp.addServerName(msg.hostname, msg.sslOpts);
            
            //console.log(msg);
        }


        var obj = msg;
        if ( obj.a == "MemSet" ){
            //console.log("MEMSET IN NODE");
            //console.log("MemSet");
            //console.log(obj);
            memory.set(obj.k, obj.v, obj.c, "Master");
        }
        else if ( obj.a == "MemSetObj" ){
            //console.log("MemSetObj IN NODE");
            memory.setObject(obj.k, obj.v, obj.c, "Master");
        }
        else if ( obj.a == "MemIncr" ){
            //console.log("MemIncr IN NODE");
            memory.incr(obj.k, obj.v, obj.c, "Master");
        }
        else if ( obj.a == "MemDel" ){
            memory.remove(obj.k, obj.c, "Master");
        }
        else if ( obj.a == "MemClear" ){
            memory.clear(obj.c, "Master");
        }

        if ( msg.argv != null ){
            Start(msg.argv);
        }

        
    });
}
else{
    //single thread mode
    Start(process.argv);
}


function Start(argv) {
    var colors = require('colors/safe'),
        os = require('os'),
        path = require('path'),
        argv = require('minimist')(argv);

    
    const router = require('./modules/router');
    const { v4: uuidv4 } = require('uuid')
    const appLoader = require('./modules/app-loader.js');
    var ifaces = os.networkInterfaces();

    var memoryPath = "./memorystate.json";
    if ( argv.memstate != null && argv.memstate != ""){
        memoryPath = resolve(argv.memstate);
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
            //console.log("Memory restored from dump file!");
        }
    }
    
    process.title = 'cloudgate';

    tools.ProcessCommandLine(argv);

    if (argv.create || argv.load || argv.unload || argv.list)
    {
        return;
    }

    //load config file Settings
    if (true) {
        
        //console.log(process.env.THREADS);
        //console.log(memory.get("THREADS", "SETTINGS"));

        if ( argv.memstate != null && argv.memstate != ""){
            var memoryPath = argv.memstate;
            if (fs.existsSync(memoryPath)) {
                var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
                memory.setMemory(JSON.parse(memorySTR));
            }
        }

        //Importance order: ENV > ARGS > Conf
        if ( process.env.THREADS == null || process.env.THREADS == "") {
            var paramCores = argv.c;
            if ( paramCores == "" || paramCores == null ) {
                if ( memory.get("THREADS", "SETTINGS") != null && memory.get("THREADS", "SETTINGS") != "" ) {
                    nbThreads = memory.get("THREADS", "SETTINGS");
                    argv.c = nbThreads;
                }
            }   
        }

        if ( process.env.PORT == null || process.env.PORT == "") {
            var paramPort = argv.p || argv.port;
            if ( paramPort == "" || paramPort == null ) {
                if ( memory.get("PORT", "SETTINGS") != null && memory.get("PORT", "SETTINGS") != "" ) {
                    argv.p = memory.get("PORT", "SETTINGS");
                }
            }   
        }
        
        if ( process.env.APP_ROOT == null || process.env.APP_ROOT == "") {
            var paramAppRoot = argv.r || argv.rootfolder;
            if ( paramAppRoot == "" || paramAppRoot == null ) {
                if ( memory.get("APP_ROOT", "SETTINGS") != null && memory.get("APP_ROOT", "SETTINGS") != "" ) {
                    argv.r = memory.get("APP_ROOT", "SETTINGS");
                }
            }   
        }

        //support for binary snapshot
        //console.log(argv);
        if (( argv.r == null || argv.r == "" ) && argv._ != null && argv._[1] != null && argv._[1].indexOf("/snapshot/") > -1 ){
            var snapshotPath = argv._[1].replace("index.js", "");
            argv.r = snapshotPath;

            process.title = snapshotPath.split('/')[1];
        }

        if ( process.env.OUTPUT_CACHE == null || process.env.OUTPUT_CACHE == "") {
            var paramOutputCache = argv.oc || argv.outputcache;
            if ( paramOutputCache == "" || paramOutputCache == null ) {
                if ( memory.get("OUTPUT_CACHE", "SETTINGS") != null && memory.get("OUTPUT_CACHE", "SETTINGS") != "" ) {
                    argv.oc = memory.get("OUTPUT_CACHE", "SETTINGS");
                }
            }   
        }
    
        if ( process.env.SSL == null || process.env.SSL == "") {
            var paramSSL = argv.S || argv.ssl;
            if ( paramSSL == "" || paramSSL == null ) {
                if ( memory.get("SSL", "SETTINGS") != null && memory.get("SSL", "SETTINGS") != "" ) {
                    argv.ssl = memory.get("SSL", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_DOMAIN == null || process.env.SSL_DOMAIN == "") {
            var paramSSLDomain = argv.ssldomain;
            if ( paramSSLDomain == "" || paramSSLDomain == null ) {
                if ( memory.get("SSL_DOMAIN", "SETTINGS") != null && memory.get("SSL_DOMAIN", "SETTINGS") != "" ) {
                    argv.ssldomain = memory.get("SSL_DOMAIN", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_PORT == null || process.env.SSL_PORT == "") {
            var paramSSLPort = argv.sslport;
            if ( paramSSLPort == "" || paramSSLPort == null ) {
                if ( memory.get("SSL_PORT", "SETTINGS") != null && memory.get("SSL_PORT", "SETTINGS") != "" ) {
                    argv.sslport = memory.get("SSL_PORT", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_CERT == null || process.env.SSL_CERT == "") {
            var paramSSLCert = argv.sslcert;
            if ( paramSSLCert == "" || paramSSLCert == null ) {
                if ( memory.get("SSL_CERT", "SETTINGS") != null && memory.get("SSL_CERT", "SETTINGS") != "" ) {
                    argv.sslcert = memory.get("SSL_CERT", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_KEY == null || process.env.SSL_KEY == "") {
            var paramSSLKey = argv.sslkey;
            if ( paramSSLKey == "" || paramSSLKey == null ) {
                if ( memory.get("SSL_KEY", "SETTINGS") != null && memory.get("SSL_KEY", "SETTINGS") != "" ) {
                    argv.sslkey = memory.get("SSL_KEY", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_PORT == null || process.env.SSL_PORT == "") {
            var paramSSLPort = argv.sslport;
            if ( paramSSLPort == "" || paramSSLPort == null ) {
                if ( memory.get("SSL_PORT", "SETTINGS") != null && memory.get("SSL_PORT", "SETTINGS") != "" ) {
                    argv.sslport = memory.get("SSL_PORT", "SETTINGS");
                }
            }   
        }

        if ( process.env.ADMIN == null || process.env.ADMIN == "") {
            var paramAdmin = argv.admin;
            if ( paramAdmin == "" || paramAdmin == null ) {
                if ( memory.get("ADMIN", "SETTINGS") != null && memory.get("ADMIN", "SETTINGS") != "" ) {
                    argv.admin = memory.get("ADMIN", "SETTINGS");
                }
            }   
        }

        if ( process.env.ADMIN_PATH == null || process.env.ADMIN_PATH == "") {
            var paramAdminPath = argv.adminpath;
            if ( paramAdminPath == "" || paramAdminPath == null ) {
                if ( memory.get("ADMIN_PATH", "SETTINGS") != null && memory.get("ADMIN_PATH", "SETTINGS") != "" ) {
                    argv.adminpath = memory.get("ADMIN_PATH", "SETTINGS");
                }
            }   
        }

      
        if ( process.env.ADMIN_TOKEN == null || process.env.ADMIN_TOKEN == "") {
            var paramAdminToken = argv.admintoken;
            if ( paramAdminToken == "" || paramAdminToken == null ) {
                if ( memory.get("ADMIN_TOKEN", "SETTINGS") != null && memory.get("ADMIN_TOKEN", "SETTINGS") != "" ) {
                    argv.admintoken = memory.get("ADMIN_TOKEN", "SETTINGS");
                }
            }   
        }

        if ( process.env.VERBOSE == null || process.env.VERBOSE == "") {
            var paramDebug = argv.d || argv.debug;
            if ( paramDebug == "" || paramDebug == null ) {
                if ( memory.get("VERBOSE", "SETTINGS") != null && memory.get("VERBOSE", "SETTINGS") != "" ) {
                    argv.d = memory.get("VERBOSE", "SETTINGS");
                }
            }   
        }
        
        if ( process.env.WATCH == null || process.env.WATCH == "") {
            var paramWatch = argv.w || argv.watch;
            if ( paramWatch == "" || paramWatch == null ) {
                if ( memory.get("WATCH", "SETTINGS") != null && memory.get("WATCH", "SETTINGS") != "" ) {
                    argv.w = memory.get("WATCH", "SETTINGS");
                }
            }   
        }

        if ( argv.r ){
            //argv.r = resolve(argv.r);
            if ( argv.r.startsWith("./") || argv.r.startsWith("../") || !argv.r.startsWith("/") ){
                //argv.r = require("path").join(__dirname, argv.r);
                argv.r = require("path").resolve(".");
            }
        }
    }

    var port = argv.p || argv.port || parseInt(process.env.PORT, 3000),
        host = argv.a || process.env.HOST || '::',
        outputcache = argv.oc == '1' || argv.outputcache == '1' || process.env.OUTPUT_CACHE == '1',
        ssl = argv.S  == '1' || argv.ssl  == '1' || process.env.SSL == '1',
        ssldomain = argv.ssldomain || process.env.SSL_DOMAIN,
        sslcert = argv.sslcert || process.env.SSL_CERT,
        sslkey = argv.sslkey || process.env.SSL_KEY,
        sslport = argv.sslport || process.env.SSL_PORT || 443,
        admin = argv.admin || process.env.ADMIN,
        adminpath = argv.adminpath || process.env.ADMIN_PATH,
        admintoken = argv.admintoken || process.env.ADMIN_TOKEN,
        debug = argv.d  == '1' || argv.debug  == '1' || process.env.VERBOSE == '1',
        watch = argv.w  == '1' || argv.watch  == '1' || process.env.WATCH == '1',
        master = argv.master || process.env.MASTER,
        slave = argv.slave || process.env.SLAVE,
        version = argv.v || argv.version,
        app_root = argv._ || process.env.APP_ROOT,
        node_root = argv.r || argv.rootfolder || process.env.NODE_ROOT,
        logger;
      
    if ( ssldomain != null && ssldomain != "" ) {
        ssl = true;
        if ( argv.p == null && argv.port == null ){
            port = 80; //we need port 80 to be able to generate a letsencrypt cert
            argv.p = port;
        }
    }    
        

    if (!argv.s && !argv.silent) {
        logger = {
            info: console.log,
            request: function(req, res, error) {
                var date = utc ? new Date().toUTCString() : new Date();
                var ip = argv['log-ip'] ?
                    req.headers['x-forwarded-for'] || '' + req.connection.remoteAddress :
                    '';
                if (error) {
                    logger.info(
                        '[%s] %s "%s %s" Error (%s): "%s"',
                        date, ip, colors.red(req.method), colors.red(req.url),
                        colors.red(error.status.toString()), colors.red(error.message)
                    );
                } else {
                    logger.info(
                        '[%s] %s "%s %s" "%s"',
                        date, ip, colors.cyan(req.method), colors.cyan(req.url),
                        req.headers['user-agent']
                    );
                }
            }
        };
    } else if (colors) {
        logger = {
            info: function() { },
            request: function() { }
        };
    }

    if (version) {
        logger.info('v' + require('./package.json').version);
        process.exit();
    }


    
    //start pubsub system
    if ( parentPort == null ){
        //single thread mode
        StartGatePub(argv);
        WelcomBanner(argv);

        //Start auto save config every 5secs (if needed), only on the master thread
        setInterval(function(){
            SaveBeforeExit();
        }, (1000*5));
    }
    else{
        //multi threads mode, we set the first thread to be the gateMaster
        if ( threadId == 1){
            StartGatePub(argv);
            WelcomBanner(argv);

            //Start auto save config every 5secs (if needed), only on the master thread
            setInterval(function(){
                SaveBeforeExit();
            }, (1000*5));
        }
    }

    if (!port) {
        port = 3000;
        listen(port);
    } else {
        listen(port);
    }

    async function WelcomBanner(argv){
        setTimeout(async function(){

            console.log("");
            console.log("============================================================");    
            console.log("CloudGate V" + require('./package.json').version + " - " + new Date().toString().split('(')[0]);
            console.log("============================================================");
            console.log("Root App Folder: " + argv.r);   
            console.log("MemoryState: " + resolve(memoryPath));

            var cpuData = await si.cpu();
            var osInfo = await si.osInfo();
            var memoryInfo = await si.mem();

            console.log("Platform: " + os.platform() + " | " + osInfo.arch + " | " + osInfo.distro + " | " + osInfo.release);
            console.log("Total Mem: " + (memoryInfo.total/1024/1024/1024).toFixed(2) + "GB | Available: " + (memoryInfo.available/1024/1024/1024).toFixed(2) + "GB");
            

            var multiThreading = "No";
            if ( argv.nbThreads > 1 ) {
                multiThreading = "Yes";
            }
            console.log("CPU: " + cpuData.manufacturer + " | " + cpuData.brand );
            var outputCacheSetting = "Disabled";
            if ( argv.oc != null ){
                outputCacheSetting = "Enabled"
            }
            console.log("Multithreading: "+ multiThreading +" | Threads: " + argv.nbThreads + " | Output Cache: " + outputCacheSetting );

            console.log("============================================================");

            var port = argv.p || argv.port || parseInt(process.env.PORT, 3000) || 3000;

            Object.keys(ifaces).forEach(function(dev) {
                ifaces[dev].forEach(function(details) {
                    if (!details.address.startsWith("fe80::")) 
                    {
                        if (details.family === 'IPv4') 
                        {
                            console.log("Listening on: http://" + details.address + ":" + port );    
                        }
                        else if (details.address.toString() != "::1") {
                            console.log("Listening on: http://[" + details.address + "]:" + port );    
                        }
                    }
                });
            });

            if ( ssldomain != "" && ssldomain != null ){
                console.log("Listening on: https://" + ssldomain + ":" + 443 );
            }

            console.log("============================================================");
            
        }, 200);
    }

    async function listen(port) {
            var options = {
            root: argv.app_root || argv.r,
            admin: argv.admin,
            adminpath: argv.adminpath,
            admintoken: argv.admintoken,
            argv: argv,
            cache: argv.c,
            timeout: argv.t,
            showDir: argv.d,
            watch: argv.w || argv.watch,
            debug: argv.d || argv.debug,
            outputcache: argv.oc || argv.outputcache,
            gzip: argv.g || argv.gzip,
            ext: argv.e || argv.ext,
            logFn: logger.request,
            username: argv.username || process.env.NODE_HTTP_SERVER_USERNAME,
            password: argv.password || process.env.NODE_HTTP_SERVER_PASSWORD
        };

        //console.log(options)

        if (options.root == null) {
            if ( argv.r != null ){
                options.root = [argv.r];
            }
            else{
                options.root = ["."];
                //options.root = __dirname;
                //console.log(options.root);
            }
        }

        if (argv.cors) {
            options.cors = true;
            if (typeof argv.cors === 'string') {
                options.corsHeaders = argv.cors;
            }
        }


        if (options.admin == "1" && (options.admintoken == null || options.admintoken == "")) {
            options.admintoken = uuidv4();
            console.log("Since no AdminToken was provided, a random AdminToken have been generated for you: " + options.admintoken);
        }

        var watchBool = false;
        if (options.watch){
            watchBool = true;
        }

        var debugBool = false;
        if (options.debug){
            debugBool = true;
        }

        var serverConfig = {
            adminEnabled: options.admin,
            adminpath: options.adminpath,
            admintoken: options.admintoken,
            watch: watchBool,
            outputcache: options.outputcache,
            debug: debugBool,
            nbThreads: argv.nbThreads
        }

        

        memory.setObject("AdminConfig", serverConfig, "GLOBAL");


        if (ssl) {
            options.https = {
                ssldomain: argv.ssldomain || 'test.com',
                sslport: argv.sslport || 443
            };

            if ( argv.sslcert != null && argv.sslkey != null ){
                options.https.sslcert = argv.sslcert;
                options.https.sslkey = argv.sslkey;
            }

            if ( process.env.SSL_CERT != null && process.env.SSL_KEY != null ){
                options.https.sslcert = process.env.SSL_CERT;
                options.https.sslkey = process.env.SSL_KEY;
            }
            
            if ( options.https.sslcert != null ){
                try {
                    fs.lstatSync(options.https.sslcert);
                } catch (err) {
                    logger.info(colors.red('Error: Could not find certificate ' + options.https.sslcert));
                    process.exit(1);
                }
            }

            if ( options.https.sslcert != null ){
                try {
                    fs.lstatSync(options.https.sslkey);
                } catch (err) {
                    logger.info(colors.red('Error: Could not find private key ' + options.https.sslkey));
                    process.exit(1);
                }
            }
            

            //SSL Handling

            if ( options.https.sslcert != null ){

                //generate dhparam for the server if not present
                var dhParamsPath = path.join(options.root, "CERTS/letsencrypt/dhparams.pem");
                if (!fs.existsSync(dhParamsPath)) {
                    console.log("Generating dhParams.pem, this can take up to 1 minute, please wait ...");
                    var dhContent = await GetDHParams(2048);
                    fs.writeFileSync(dhParamsPath, dhContent);
                }

                //SSL Cert provided
                //Start the SSL Server
                var coregate = require('./coregate.js'); coregate._cfg("silent");
                var sslApp = coregate.SSLApp({
                    key_file_name: options.https.sslkey,
                    cert_file_name: options.https.sslcert,
                    dh_params_file_name: dhParamsPath
                });

                serverConfig.isSSL = true;
                router.start(sslApp, serverConfig);
                sslApp.listen(host, options.https.sslport, (listenSocket) => {
                    if (listenSocket) {
                        console.log('Listening to port ' + options.https.sslport + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);
                    }
                });

                var publicFolder = path.join(options.root, "/public/");
                handleMissingCertificates(sslApp, memory, sharedmem, publicFolder, path, options, dhParamsPath);

            }
            else{
                //Need to generate / renew the cert
                await DoStartTLSServer(options, serverConfig);                          
            }

            

        }

        async function GetDHParams(bits){
            const crypto = require("crypto");
            var asn1 = require('asn1.js');
            return asn1.define("", function() {
                this.seq().obj(this.key("p").int(), this.key("g").int());
            }).encode({
                p: crypto.createDiffieHellman(bits || 2048).getPrime(),
                g: 2
            }, "pem", {label: "DH PARAMETERS"});
        }

        async function DoStartTLSServer(options, serverConfig){
            try {
               
                //check if not already running in another thread
                if ( sharedmem.getString(options.https.ssldomain, "SSLGeneration") != "1" )
                {
                    sharedmem.setString(options.https.ssldomain, "1", "SSLGeneration");

                    var Letsencrypt = require('./modules/letsencrypt');
                    var certPath = path.join(options.root, "CERTS/" + options.https.ssldomain + "/");
                    var LEAccountPath = path.join(options.root, "CERTS/letsencrypt/account.key");
                    var isProd = true;

                    fs.mkdirSync(certPath, { recursive: true });
                    fs.mkdirSync(LEAccountPath.replace("account.key", ""), { recursive: true });

                    //generate dhparam for the server if not present
                    var dhParamsPath = path.join(options.root, "CERTS/letsencrypt/dhparams.pem");
                    if (!fs.existsSync(dhParamsPath)) {
                        console.log("Generating dhParams.pem, this can take up to 1 minute, please wait ...");
                        var dhContent = await GetDHParams(2048);
                        fs.writeFileSync(dhParamsPath, dhContent);
                    }
                    
                    //console.log(certPath);
                    //return;

                    //find root folder
                    //console.log(options)
                    var publicFolder = path.join(options.root, "/public/"); //todo: replace with the real public folder from appconfig.json
                    //console.log(publicFolder)

                    await Letsencrypt(certPath, publicFolder);
                    //var certInfos = await Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "z51biz@gmail.com", certPath, publicFolder);

                    var certInfos = null;
                    //todo: use user email
                    
                    Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "TODO-replace@mailinator.com", certPath, publicFolder, LEAccountPath).then(function(resp) {
                        certInfos = resp;

                        //start the SSL Server
                        var coregate = require('./coregate.js'); coregate._cfg("silent");
                        var sslApp = coregate.SSLApp({
                            key_file_name: certInfos.privateKeyPath,
                            cert_file_name: certInfos.fullchain, 
                            dh_params_file_name: dhParamsPath
                        });
                
                        serverConfig.isSSL = true;
                        router.start(sslApp, serverConfig);
                        sslApp.listen(host, options.https.sslport, (listenSocket) => {
                            if (listenSocket) {
                                //console.log('Listening to https://' + options.https.ssldomain + ":" + sslport + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);
                            }
                        });
                        globalSSLApp = sslApp;

                        sharedmem.setString(options.https.ssldomain, "0", "SSLGeneration");
                    
                        handleMissingCertificates(sslApp, memory, sharedmem, publicFolder, path, options, dhParamsPath);
                        
                        
                    });
                }
                else{

                    //retry in 250ms
                    setTimeout(function(){
                        DoStartTLSServer(options, serverConfig);
                    }, 250);
                    
                }

            }
            catch (ex) {
                console.log("Unable to generate certificate or start SSL Server ...");
                console.log(ex);
                console.trace();
            }  
        }

        var coregate = require('./coregate.js'); coregate._cfg("silent");
        var app = coregate.App();

        //REST API sample / test
        //require('./lib/debug')(app, options.root);

        var API_Token = tools.GetRandomId(); //this is a token to protect access to the DB REST API
        //TODO: check if overriden by a config file or env variable

        //console.log(options.root);

        /*
        options.root.forEach(function(configPath) {
            appLoader.load(configPath, serverConfig);
        });
        */

        appLoader.load( options.root, serverConfig);


        var publicFolder = "";


        //Static files handler
        var isCaching = true;
        //console.log("\npublic root folder: " + publicFolder);
        router.start(app, serverConfig);


        //Even early like here downloads are super slow on big files!
        /*
        const fileName = '/root/cloudgate/apps/CatchAll/public/1MB.jpg';
        const totalSize = fs.statSync(fileName).size;
        app.any('/test123', async (res, req) => {

            //Ensure this request is notified on aborted
            res.onAborted(() => {
                res.aborted = true;
            });

            const readStream = fs.createReadStream(fileName);
            tools.pipeStreamOverResponse(res, readStream, totalSize);
            return;
        });
        */
        

        //console.log(serverConfig);

        //Start listening
        app.listen(host, port, (listenSocket) => {
            if (listenSocket) {
                
                //console.log('Listening to port ' + port + " - Host: " + host + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);

                if ( isMainThread )
                {
                    console.log("\nCloudGate V" + require('./package.json').version + " started");

                    console.log('Listening to port ' + port + " - Host: " + host + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);

                    var canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host,
                    protocol = ssl ? 'https://' : 'http://';

                    logger.info([
                        ssl ? (colors.yellow(' through') + colors.cyan(' https')) : '',
                        colors.yellow('\nAvailable on:')
                    ].join(''));

                    if (argv.a && host !== '0.0.0.0' && host !== '::') {
                        logger.info(('  ' + protocol + canonicalHost + ':' + colors.green(port.toString())));
                    } else {
                        Object.keys(ifaces).forEach(function(dev) {
                            ifaces[dev].forEach(function(details) {
                                if (details.family === 'IPv4') {
                                    logger.info(('  ' + protocol + details.address + ':' + colors.green(port.toString())));
                                }
                            });
                        });
                    }

                    logger.info('Hit CTRL-C to stop the server\n');
                }
                

            }
        });

    }
}

function ValidateIPaddress(ipaddress) 
{
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress))
    {
        return (true)
    }
    else{
        return (false)
    }
}

function handleMissingCertificates(sslApp, memory, sharedmem, publicFolder, path, options, dhParamsPath){

    sslApp.missingServerName((hostname) => {

        if ( ValidateIPaddress(hostname) == true ){
            //this is an ip address and not an hostname, letsencrypt do not allow to gen cert for an ip
            return;
        }

        if ( hostname == "localhost" ){
            //this is a spoofed hostname
            return;
        }
                                                            
        //Check if domain is declared by an appconfig (loaded app)
        var appConfig = memory.getObject(hostname, "GLOBAL");
    
        //handle *
        if (appConfig == null) {
            appConfig = memory.getObject("*", "GLOBAL");
        }

        //handle *.XXXXX.xxx
        var subDomain = hostname.split('.')[0];
        var domain = hostname.substring(hostname.indexOf('.') + 1);
        if (appConfig == null) {
            appConfig = memory.getObject("*." + domain, "GLOBAL"); //avoid constant call to redis
        }


        //generate a certificate ONLY if the domain was declared in an appconfig
        //TODO: not yet fully implemented, for now we get appconfig of *
        if (appConfig == null){
            console.log("Domain: " + hostname + " is not declared in appconfig.json, skipping SSL cert generation/loading");
            return;
        }

        //TODO: check if the domain is allowed in the appconfig settings, or if appconfig allow any domain (usefull for saas)

        //TODO: check if the domain is pointing to this server!
        var checkURL = "http://" + hostname + "/cloudgate/debug/raw";
        (async () => {
            try {
                const response = await axios.get(checkURL)
                //console.log(response.data);

                //TODO: improve check, is it really targeting this instance of cloudgate and not another server trying to spoof
                if (response.data != "Hello World!"){
                    console.log("Domain: " + hostname + " is not pointing to cloudgate, this is probably a spoofed host header, skipping SSL cert generation/loading");
                    return;
                }
                
                //start generation process only if not already started
                if ( sharedmem.getString(hostname, "SSLGeneration") != "1" )
                {
                    sharedmem.setString(hostname, "1", "SSLGeneration");
        
        
                    var Letsencrypt = require('./modules/letsencrypt');
                    var certPath = path.join(options.root, "CERTS/" + options.https.ssldomain + "/");
                    var LEAccountPath = path.join(options.root, "CERTS/letsencrypt/account.key");
                    var isProd = true;
        
                    fs.mkdirSync(certPath, { recursive: true });
                    fs.mkdirSync(LEAccountPath.replace("account.key", ""), { recursive: true });
        
                    //console.log("Hello! We are missing server name <" + hostname + ">");
        
                    //TODO: add new domain routing in memstate, to which app should it point?
                    //console.log('Generating a new cert for: ' + hostname);
                    certPath = path.join(appConfig.root, "CERTS/" + hostname + "/");
                    //console.log(certPath);
        
                    var certInfos = null;
                    //todo: use user email
                    Letsencrypt.GenerateCert(isProd, hostname, "TODO-replace@mailinator.com", certPath, publicFolder, LEAccountPath).then(function(resp) {
                        certInfos = resp;
                        
                        var sslOpts = {
                            key_file_name: certInfos.privateKeyPath,
                            cert_file_name: certInfos.fullchain,
                            passphrase: '', 
                            dh_params_file_name: dhParamsPath
                        };
        
                        sslApp.addServerName(hostname, sslOpts);
        
        
        
                        //send a copy to other threads
                        //in fact not needed at all ...
                        /*
                        if ( parentPort != null ){
        
                            setTimeout(function(){
                                var clusteredProcessIdentifier = require('os').hostname() + "_" + require('worker_threads').threadId;
                                var obj = { type: "CG_SSL_ADD", hostname: hostname, sslOpts: sslOpts, source: clusteredProcessIdentifier };
                                parentPort.postMessage(obj);
                            }, 1*1000);
                            
                        }
                        */
        
                        sharedmem.setString(hostname, "0", "SSLGeneration");
        
                    });
                }
                else{
                    //retry in 15 sec
                }
               
            } catch (error) {
                //console.log("Error while checking domain, this is normal to crash here for a spoofing attempt")
                //console.log(error);
            }
        })();
        
    })
}

function SaveBeforeExit() {

    if ( memory.get("mustSaveConfig", "TEMP") != 1){
        //console.log("No need to save");
        return;
    }

    var fullMemory = memory.debug();
    
    //delete response cache because it's huge and temporary
    delete fullMemory["ResponseCache"];
    delete fullMemory["STATS"];
    delete fullMemory["TEMP"];
    delete fullMemory["undefined"];

    //write the memory state (only the master thread should do that)
    fs.writeFileSync(memoryPath, JSON.stringify(fullMemory, null, 4), 'utf-8'); 
    
    memory.set("mustSaveConfig", 0, "TEMP");
    console.log("config auto saved on disk");

    //console.log('\ncloudgate is now stopped.');
}


async function StartGatePub(argv){

    //isMaster, host, port, token

    var endpoint = null;
    var isMaster = false;
    if ( argv.master ){
        endpoint = argv.master;
        isMaster = true;
        memory.set("isMaster", isMaster, "CLUSTER");
        memory.set("Master", endpoint, "CLUSTER");
    }
    else if (argv.slave){
        endpoint = argv.slave;
        isMaster = false;
        memory.set("isMaster", isMaster, "CLUSTER");
        memory.set("Master", endpoint, "CLUSTER");
    }
    else{
        //check if we have something in the global config
        if ( memory.get("isMaster", "CLUSTER") != null){
            isMaster = memory.get("isMaster", "CLUSTER");
        }
        if ( memory.get("Master", "CLUSTER") != null){
            
            //must contain a token
            if ( memory.get("Master", "CLUSTER").indexOf("@") > -1 ){
                endpoint = memory.get("Master", "CLUSTER");
            }
            
        }
    }

    if ( endpoint != null ){
        var host = endpoint.split(':')[0];
        var port = endpoint.split(':')[1].split('@')[0];
        var token = endpoint.split(':')[1].split('@')[1];

        if ( token == null || token == "" ){
            console.log("Cannot start Cloudgate pubsub without a security token!");
            return;
        }

        var clusterIsMaster = isMaster;
        var clusterMaster = endpoint;
            
        var clusterMasterHost = host;
        var clusterMasterPort = port;  

        if ( clusterIsMaster ){
            console.log("Starting Cloudgate Cluster Master");
            memory.set("ClusterStarted", true, "TEMP");
            cloudgatePubSub.startServer(clusterMasterHost, clusterMasterPort, memory, token); //host is the interface on which we are listening as gatemaster
        }


        //in all case start the client if the cluster is activated 
        setTimeout(function(){
            console.log("Starting Cloudgate Cluster client");
            cloudgatePubSub.startClient(clusterMasterHost, clusterMasterPort, memory, token); //clusterMasterHost is the remote GateMaster to which we are connecting to
        }, 200);

    }

}


if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', function() {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function() {
    SaveBeforeExit();
    process.exit();
});

process.on('SIGTERM', function() {
    SaveBeforeExit();
    process.exit();
});
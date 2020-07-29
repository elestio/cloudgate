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

const memory = require('./modules/memory');
const cloudgatePubSub = require('./modules/cloudgate-pubsub.js');

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
        argv = require('optimist')(argv)
            .boolean('cors')
            .boolean('log-ip')
            .argv;

    
    const router = require('./modules/router');
    const { v4: uuidv4 } = require('uuid')
    const appLoader = require('./loaders/app-loader.js');
    var ifaces = os.networkInterfaces();

    var memoryPath = "./memorystate.json";
    if ( argv.memstate != null && argv.memstate != ""){
        memoryPath = argv.memstate;
        if (fs.existsSync(memoryPath)) {
            var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
            memory.setMemory(JSON.parse(memorySTR));
            //console.log("Memory restored from dump file!");
        }
    }
    
    process.title = 'cloudgate';

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
            '  --salve [Master IP or Domain]:[Port]@[Token]     Declare this host as a slave connecting to a master'
            //'  -C --cert    Path to ssl cert file (default: cert.pem).',
            //'  -K --key     Path to ssl key file (default: key.pem).',

        ].join('\n'));
        
        process.exit();
    }


    //load config file Settings
    if (true) {
        
        //console.log(argv);
        //console.log(process.env.THREADS);
        //console.log(memory.get("THREADS", "SETTINGS"));

        if ( argv.conf != null && argv.conf != ""){
            var memoryPath = argv.conf;
            if (fs.existsSync(memoryPath)) {
                var memorySTR = fs.readFileSync(memoryPath, { encoding: 'utf8' });
                memory.setMemory(JSON.parse(memorySTR));
            }
        }

        //Importance order: ENV > ARGS > Conf
        if ( process.env.THREADS == null || process.env.THREADS == "") {
            var paramCores = argv.c;
            if ( paramCores == "" || paramCores == null ) {
                if ( memory.get("THREADS", "SETTINGS") != null ) {
                    nbThreads = memory.get("THREADS", "SETTINGS");
                    argv.c = nbThreads;
                }
            }   
        }

        if ( process.env.PORT == null || process.env.PORT == "") {
            var paramPort = argv.p || argv.port;
            if ( paramPort == "" || paramPort == null ) {
                if ( memory.get("PORT", "SETTINGS") != null ) {
                    argv.p = memory.get("PORT", "SETTINGS");
                }
            }   
        }
        
        if ( process.env.APP_ROOT == null || process.env.APP_ROOT == "") {
            var paramAppRoot = argv._;
            if ( paramAppRoot == "" || paramAppRoot == null ) {
                if ( memory.get("APP_ROOT", "SETTINGS") != null ) {
                    argv.r = memory.get("APP_ROOT", "SETTINGS");
                }
            }   
        }

        if ( process.env.OUTPUT_CACHE == null || process.env.OUTPUT_CACHE == "") {
            var paramOutputCache = argv.oc || argv.outputcache;
            if ( paramOutputCache == "" || paramOutputCache == null ) {
                if ( memory.get("OUTPUT_CACHE", "SETTINGS") != null ) {
                    argv.oc = memory.get("OUTPUT_CACHE", "SETTINGS");
                }
            }   
        }
    
        if ( process.env.SSL == null || process.env.SSL == "") {
            var paramSSL = argv.S || argv.ssl;
            if ( paramSSL == "" || paramSSL == null ) {
                if ( memory.get("SSL", "SETTINGS") != null ) {
                    argv.ssl = memory.get("SSL", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_DOMAIN == null || process.env.SSL_DOMAIN == "") {
            var paramSSLDomain = argv.ssldomain;
            if ( paramSSLDomain == "" || paramSSLDomain == null ) {
                if ( memory.get("SSL_DOMAIN", "SETTINGS") != null ) {
                    argv.ssldomain = memory.get("SSL_DOMAIN", "SETTINGS");
                }
            }   
        }

        if ( process.env.SSL_PORT == null || process.env.SSL_PORT == "") {
            var paramSSLPort = argv.sslport;
            if ( paramSSLPort == "" || paramSSLPort == null ) {
                if ( memory.get("SSL_PORT", "SETTINGS") != null ) {
                    argv.sslport = memory.get("SSL_PORT", "SETTINGS");
                }
            }   
        }

        if ( process.env.ADMIN == null || process.env.ADMIN == "") {
            var paramAdmin = argv.admin;
            if ( paramAdmin == "" || paramAdmin == null ) {
                if ( memory.get("ADMIN", "SETTINGS") != null ) {
                    argv.admin = memory.get("ADMIN", "SETTINGS");
                }
            }   
        }

        if ( process.env.ADMIN_PATH == null || process.env.ADMIN_PATH == "") {
            var paramAdminPath = argv.adminpath;
            if ( paramAdminPath == "" || paramAdminPath == null ) {
                if ( memory.get("ADMIN_PATH", "SETTINGS") != null ) {
                    argv.adminpath = memory.get("ADMIN_PATH", "SETTINGS");
                }
            }   
        }

      
        if ( process.env.ADMIN_TOKEN == null || process.env.ADMIN_TOKEN == "") {
            var paramAdminToken = argv.admintoken;
            if ( paramAdminToken == "" || paramAdminToken == null ) {
                if ( memory.get("ADMIN_TOKEN", "SETTINGS") != null ) {
                    argv.admintoken = memory.get("ADMIN_TOKEN", "SETTINGS");
                }
            }   
        }

        if ( process.env.VERBOSE == null || process.env.VERBOSE == "") {
            var paramDebug = argv.d || argv.debug;
            if ( paramDebug == "" || paramDebug == null ) {
                if ( memory.get("VERBOSE", "SETTINGS") != null ) {
                    argv.d = memory.get("VERBOSE", "SETTINGS");
                }
            }   
        }
        
        if ( process.env.WATCH == null || process.env.WATCH == "") {
            var paramWatch = argv.w || argv.watch;
            if ( paramWatch == "" || paramWatch == null ) {
                if ( memory.get("WATCH", "SETTINGS") != null ) {
                    argv.w = memory.get("WATCH", "SETTINGS");
                }
            }   
        }

        //console.log(argv);
    }

    

    var port = argv.p || argv.port || parseInt(process.env.PORT, 3000),
        host = argv.a || process.env.HOST || '::',
        outputcache = argv.oc == '1' || argv.outputcache == '1' || process.env.OUTPUT_CACHE == '1',
        ssl = argv.S  == '1' || argv.ssl  == '1' || process.env.SSL == '1',
        ssldomain = argv.ssldomain || process.env.SSL_DOMAIN,
        sslcert = argv.sslcert || process.env.SSL_CERT,
        sslkey = argv.sslkey || process.env.SSL_KEY,
        sslport = argv.sslport || process.env.SSL_PORT,
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
            console.log("======================================================");    
            console.log("CloudGate V" + require('./package.json').version + " - " + new Date().toString().split('(')[0]);
            console.log("======================================================");
            console.log("Root App Folder: " + argv.r);   
            console.log("MemoryState: " + memoryPath);

            var cpuData = await si.cpu();
            var osInfo = await si.osInfo();
            var memoryInfo = await si.mem();

            console.log("Platform: " + os.platform() + " | " + osInfo.arch + " | " + osInfo.distro + " | " + osInfo.release);
            console.log("Total Mem: " + (memoryInfo.total/1024/1024/1024).toFixed(2) + "GB | Free: " + (memoryInfo.free/1024/1024/1024).toFixed(2) + "GB | Used: " + (memoryInfo.used/1024/1024/1024).toFixed(2) + "GB");
            

            var multiThreading = "No";
            if ( argv.nbThreads > 1 ) {
                multiThreading = "Yes";
            }
            console.log("CPU: " + cpuData.manufacturer + " | " + cpuData.brand );
            console.log("Multithreading: "+ multiThreading +" | Threads: " + argv.nbThreads );

            console.log("======================================================");

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

            console.log("======================================================");
            
        }, 200);
    }

    async function listen(port) {
        var options = {
            root: argv.app_root,
            admin: argv.admin,
            adminpath: argv.adminpath,
            admintoken: argv.admintoken,
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

        if (options.root == null) {
            if ( argv.r != null ){
                options.root = [argv.r];
            }
            else{
                options.root = ["."];
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
            debug: debugBool
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
                //SSL Cert provided
                //Start the SSL Server
                var sslApp = require('./coregate').SSLApp({
                    key_file_name: options.https.sslkey,
                    cert_file_name: options.https.sslcert
                });

                router.start(sslApp, serverConfig);
                sslApp.listen(host, options.https.sslport, (listenSocket) => {
                    if (listenSocket) {
                        console.log('Listening to port ' + sslport + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);
                    }
                });
            }
            else{
                //Need to generate / renew the cert
                try {

                    var Letsencrypt = require('./lib/letsencrypt');
                    var certPath = options.root + "CERTS/";
                    var isProd = true;

                    //find root folder
                    var publicFolder = options.root[0] + "/public/"; //todo: replace with the real public folder from appconfig.json
                    
                    await Letsencrypt(certPath, publicFolder);
                    //var certInfos = await Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "z51biz@gmail.com", certPath, publicFolder);

                    var certInfos = null;
                    Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "z51biz@gmail.com", certPath, publicFolder).then(function(resp) {
                        certInfos = resp;

                        //start the SSL Server
                        var sslApp = require('./coregate').SSLApp({
                            key_file_name: certInfos.privateKeyPath,
                            cert_file_name: certInfos.fullchain
                        });

                        router.start(sslApp, serverConfig);
                        sslApp.listen(host, options.https.sslport, (listenSocket) => {
                            if (listenSocket) {
                                console.log('Listening to port ' + sslport + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);
                            }
                        });
                    });


                }
                catch (ex) {
                    console.log("Unable to generate certificate or start SSL Server ...");
                    console.log(ex);
                    console.trace();
                }                
            }

        }

        const tools = require('./lib/tools.js');
        var app = require('./coregate').App();

        //REST API sample / test
        //require('./lib/debug')(app, options.root);

        var API_Token = tools.GetRandomId(); //this is a token to protect access to the DB REST API
        //TODO: check if overriden by a config file or env variable

        //console.log(options.root);

        options.root.forEach(function(configPath) {
            appLoader.load(configPath, serverConfig);
        });



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
                
                console.log('Listening to port ' + port + " - Host: " + host + " - ProcessID: " + process.pid + " - ThreadID: " + threadId);

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
            memory.set("ClusterStarted", true, "TEMP");
            cloudgatePubSub.startServer(clusterMasterHost, clusterMasterPort, memory, token); //host is the interface on which we are listening as gatemaster
        }


        //in all case start the client if the cluster is activated 
        setTimeout(function(){
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
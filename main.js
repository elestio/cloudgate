#!/usr/bin/env node

var os = require("os");

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
            console.log("Msg discarded because coming from this host!")
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

    

    process.title = 'cloudgate';

    if (argv.h || argv.help) {
        console.log([
            '',
            'USAGE: cloudgate [path] [options]',
            '',
            '[GENERAL]',
            '  -r --rootfolder [path] root folder for your app',
            '  -c --cores [nbCores]    Number of CPU cores to use (default: ALL cores), Eg.: --cores 4',
            '  -p --port [port]    Port to use [8080]',
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

    var port = argv.p || argv.port || parseInt(process.env.PORT, 10),
        host = argv.a || '::',
        ssl = argv.S || argv.ssl,
        ssldomain = argv.ssldomain,
        sslport = argv.sslport,
        admin = argv.admin,
        adminpath = argv.adminpath,
        admintoken = argv.admintoken,
        debug = argv.d || argv.debug,
        watch = argv.w || argv.watch,
        master = argv.master,
        slave = argv.slave,
        version = argv.v || argv.version,
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

        //Start auto save config every 5secs (if needed), only on the master thread
        setInterval(function(){
            SaveBeforeExit();
        }, (1000*5));
    }
    else{
        //multi threads mode, we set the first thread to be the gateMaster
        if ( threadId == 1){
            StartGatePub(argv);

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

    async function listen(port) {
        var options = {
            root: argv._,
            admin: argv.admin,
            adminpath: argv.adminpath,
            admintoken: argv.admintoken,
            cache: argv.c,
            timeout: argv.t,
            showDir: argv.d,
            watch: argv.w || argv.watch,
            debug: argv.d || argv.debug,
            gzip: argv.g || argv.gzip,
            ext: argv.e || argv.ext,
            logFn: logger.request,
            username: argv.username || process.env.NODE_HTTP_SERVER_USERNAME,
            password: argv.password || process.env.NODE_HTTP_SERVER_PASSWORD
        };

        if (options.root == null) {
            options.root = ["."];
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
            debug: debugBool
        }

        memory.setObject("AdminConfig", serverConfig, "GLOBAL");


        if (ssl) {
            options.https = {
                cert: argv.C || argv.cert || 'cert.pem',
                key: argv.K || argv.key || 'key.pem',
                ssldomain: argv.ssldomain || 'test.com',
                sslport: argv.sslport || 443
            };
            /*
            try {
                fs.lstatSync(options.https.cert);
            } catch (err) {
                logger.info(colors.red('Error: Could not find certificate ' + options.https.cert));
                process.exit(1);
            }
            try {
                fs.lstatSync(options.https.key);
            } catch (err) {
                logger.info(colors.red('Error: Could not find private key ' + options.https.key));
                process.exit(1);
            }
            */

            //SSL Handling
            var Letsencrypt = require('./lib/letsencrypt');
            var certPath = options.root + "CERTS/";
            var isProd = true;

            //find root folder
            var publicFolder = options.root[0] + "/public/"; //todo: replace with the real public folder from appconfig.json


            try {
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
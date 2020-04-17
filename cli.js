#!/usr/bin/env node

var colors = require('colors/safe'),
    os = require('os'),
    portfinder = require('portfinder'),
    fs = require('fs'),
    path = require('path'),
    argv = require('optimist')
    .boolean('cors')
    .boolean('log-ip')
    .argv;

const router = require('./modules/router');
const appLoader = require('./loaders/app-loader.js');
var ifaces = os.networkInterfaces();

process.title = 'cloudgate';

if (argv.h || argv.help) {
    console.log([
        'usage: cloudgate [path] [options]',
        '',
        'options:',
        '  -p --port    Port to use [8080]',
        //'  -a           Address to use [0.0.0.0]', //when used we can't get the visitor ip!
        '  -d           Show directory listings [true]',
        '  --cors[=headers]   Enable CORS via the "Access-Control-Allow-Origin" header',
        '                     Optionally provide CORS headers list separated by commas',
        '  -c           Cache time (max-age) in seconds [3600], e.g. -c10 for 10 seconds.',
        '               To disable caching, use -c-1.',
        '  --username   Username for basic authentication [none]',
        '               Can also be specified with the env variable NODE_HTTP_SERVER_USERNAME',
        '  --password   Password for basic authentication [none]',
        '               Can also be specified with the env variable NODE_HTTP_SERVER_PASSWORD',
        '',
        '  -S --ssl     Enable https.',
        '  --ssldomain     domain name on which you want to activate ssl (eg: test.com)',
        '  -C --cert    Path to ssl cert file (default: cert.pem).',
        '  -K --key     Path to ssl key file (default: key.pem).',
        '  --sslport     SSL Port (default: 443)',
        '',
        '  -h --help          Print this list and exit.',
        '  -v --version       Print the version and exit.'
    ].join('\n'));
    process.exit();
}

var port = argv.p || argv.port || parseInt(process.env.PORT, 10),
    host = argv.a || '::',
    ssl = argv.S || argv.ssl,
    ssldomain = argv.ssldomain,
    sslport = argv.sslport,
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
        info: function() {},
        request: function() {}
    };
}

if (version) {
    logger.info('v' + require('./package.json').version);
    process.exit();
}


//port = 3000;
if (!port) {
    
    /*
    portfinder.basePort = 3000;
    portfinder.getPort(function(err, port) {
        if (err) {
            throw err;
        }
        listen(port);
    });
    */
   port = 3000;
   listen(port);
} else {
    listen(port);
}

async function listen(port) {
    var options = {
        root: argv._,
        cache: argv.c,
        timeout: argv.t,
        showDir: argv.d,
        gzip: argv.g || argv.gzip,
        ext: argv.e || argv.ext,
        logFn: logger.request,
        username: argv.username || process.env.NODE_HTTP_SERVER_USERNAME,
        password: argv.password || process.env.NODE_HTTP_SERVER_PASSWORD
    };

    if ( options.root == null ){
        options.root = ["."];
    }

    if (argv.cors) {
        options.cors = true;
        if (typeof argv.cors === 'string') {
            options.corsHeaders = argv.cors;
        }
    }

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

        try{
            await Letsencrypt(certPath, publicFolder);
            //var certInfos = await Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "z51biz@gmail.com", certPath, publicFolder);

            var certInfos = null;
            Letsencrypt.GenerateCert(isProd, options.https.ssldomain, "z51biz@gmail.com", certPath, publicFolder).then(function(resp){
                    certInfos = resp;
                    
                    //start the SSL Server
                    var sslApp = require('./bin/cloudgate.js').SSLApp({
                        key_file_name: certInfos.privateKeyPath,
                        cert_file_name: certInfos.fullchain
                    });
                    
                    router.start(sslApp);
                    sslApp.listen(host, options.https.sslport, (listenSocket) => {
                        if (listenSocket) {
                            console.log('Listening to port ' + sslport + " - ProcessID: " + process.pid );
                        }
                    });
            });


        }
        catch(ex){
            console.log("Unable to generate certificate or start SSL Server ...");
            console.log(ex);
            console.trace();
        }
        
    }

    const tools = require('./lib/tools.js');
    var app = require('./bin/cloudgate.js').App();


    //REST API sample / test
    //require('./lib/debug')(app, options.root);

    var API_Token = tools.GetRandomId(); //this is a token to protect access to the DB REST API
    //TODO: check if overriden by a config file or env variable

    options.root.forEach(function (configPath) {
        appLoader.load(configPath);
    });
    

    
    var publicFolder = "";
    

    //Static files handler
    var isCaching = true;
    //console.log("\npublic root folder: " + publicFolder);
    router.start(app);


    //Start listening
    app.listen(host, port, (listenSocket) => {
        if (listenSocket) {
            console.log("\nCloudGate V" + require('./package.json').version + " started");
            console.log('Listening to port ' + port + " - Host: " + host + " - ProcessID: " + process.pid);


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
    });




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
        logger.info(colors.red('\ncloudgate stopped.'));
        process.exit();
    });

    process.on('SIGTERM', function() {
        logger.info(colors.red('\ncloudgate stopped.'));
        process.exit();
    });
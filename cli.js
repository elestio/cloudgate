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
var ifaces = os.networkInterfaces();

process.title = 'cloudgate';

if (argv.h || argv.help) {
    console.log([
        'usage: cloudgate [path] [options]',
        '',
        'options:',
        '  -p --port    Port to use [8080]',
        '  -a           Address to use [0.0.0.0]',
        '  -d           Show directory listings [true]',
        '  -i           Display autoIndex [true]',
        '  -g --gzip    Serve gzip files when possible [false]',
        '  --cors[=headers]   Enable CORS via the "Access-Control-Allow-Origin" header',
        '                     Optionally provide CORS headers list separated by commas',
        '  -c           Cache time (max-age) in seconds [3600], e.g. -c10 for 10 seconds.',
        '               To disable caching, use -c-1.',
        '  -t           Connections timeout in seconds [120], e.g. -t60 for 1 minute.',
        '               To disable timeout, use -t0',
        '  -U --utc     Use UTC time format in log messages.',
        '  --username   Username for basic authentication [none]',
        '               Can also be specified with the env variable NODE_HTTP_SERVER_USERNAME',
        '  --password   Password for basic authentication [none]',
        '               Can also be specified with the env variable NODE_HTTP_SERVER_PASSWORD',
        '',
        '  -S --ssl     Enable https.',
        '  -C --cert    Path to ssl cert file (default: cert.pem).',
        '  -K --key     Path to ssl key file (default: key.pem).',
        '',
        '  -h --help          Print this list and exit.',
        '  -v --version       Print the version and exit.'
    ].join('\n'));
    process.exit();
}

var port = argv.p || argv.port || parseInt(process.env.PORT, 10),
    host = argv.a || '::',
    ssl = argv.S || argv.ssl,
    proxy = argv.P || argv.proxy,
    utc = argv.U || argv.utc,
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
    logger.info('v' + require('package.json').version);
    process.exit();
}

if (!port) {
    portfinder.basePort = 3000;
    portfinder.getPort(function(err, port) {
        if (err) {
            throw err;
        }
        listen(port);
    });
} else {
    listen(port);
}

function listen(port) {
    var options = {
        root: argv._[0],
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
        options.root = ".";
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
            key: argv.K || argv.key || 'key.pem'
        };
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
    }

    const tools = require('./lib/Tools.js');
    var app = require('./bin/cloudgate.js').App();


    //REST API sample / test
    require('./lib/debug')(app, options.root);

    var API_Token = tools.GetRandomId(); //this is a token to protect access to the DB REST API
    //TODO: check if overriden by a config file or env variable

    var fullAppPath = "";
    if ( fullAppPath.endsWith("appconfig.json") ){
        fullAppPath = options.root;
    }
    else{
        if (fs.existsSync(options.root + "appconfig.json")) {
            fullAppPath = options.root + "appconfig.json";
        }
    }
    
    var publicFolder = "";
    if (fs.existsSync(fullAppPath)) {
        console.log("\nApp detected in " + fullAppPath + "\n");
        //load the app
        require('./lib/APILoader')(app, fullAppPath, API_Token);
        publicFolder = options.root + "public/";
    }
    else
    {
        console.log("\nNo app detected in " + fullAppPath);
        publicFolder = options.root;
    }
    
    console.log(publicFolder);

    //Static files handler
    var isCaching = false;
    console.log("\npublic root folder: " + publicFolder);
    require('./lib/StaticFiles')(app, publicFolder, isCaching);


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
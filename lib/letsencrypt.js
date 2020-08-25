var http = require('http');
var path = require('path');
var resolve = require('path').resolve;
var url = require('url');
var fs = require('fs');
var os = require("os");

const tools = require('./tools.js');

var ACME = require('acme');
var Keypairs = require('@root/keypairs');

module.exports = (certPath, rootFolder) => {
    //TODO: Add a setInterval every 1 day that check if certs needs to be renewed
    //Avoid each node to try to renew the certs, only 1 node should do it
    //Avoid each thread in multi-thread mode to try to renew the cert, only 1 thread should do it
}

module.exports.GenerateCert = async (isProd, domains, maintainerEmail, certPath, rootFolder, LEAccountPath) => {

    return new Promise(resolve => {
        resolve(GenerateCert(isProd, domains, maintainerEmail, certPath, rootFolder, LEAccountPath));
    });
    //return await GenerateCert(isProd, domains, maintainerEmail, certPath, rootFolder);
}

function datediff(first, second) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    return Math.round((second-first)/(1000*60*60*24));
}

function GetDaysLeftBeforeExpiration(caCertPath){
    
    let pki = require('node-forge').pki;
    var caCert = fs.readFileSync(caCertPath).toString();
    var caStore = pki.createCaStore([ caCert ]);

    var curCertKey = Object.keys(caStore.certs)[0];
    var validity = caStore.certs[curCertKey].validity;
    //console.log(validity.notAfter);

    var diff = datediff( new Date(), validity.notAfter)
    //console.log(diff);

    return diff;
}

async function GenerateCert(isProd, domains, maintainerEmail, certPath, rootFolder, LEAccountPath){

    var metaPath = path.join(certPath, "meta.json");
    //console.log("checking for certs in: " + metaPath);
    if (fs.existsSync(metaPath)){
        //certs already exist
        //console.log("Certificate already exist, no need to generate it!");

        var forceExistingCerts = false; //TODO: should be exposed as an option

        var nbDaysLeft = GetDaysLeftBeforeExpiration(certPath + "cert.pem");
        if ( nbDaysLeft > 60 || forceExistingCerts ){

            //TODO: add a scheduled job to check certs expiration & do renewals

            //use the certificate we already have
            var result = {
                "certPath": resolve(certPath + "cert.pem"),
                "privateKeyPath": resolve(certPath + "privkey.pem"),
                "fullchain": resolve(certPath + "fullchain.pem")
            };
            return result;
        }
        else if (nbDaysLeft > 30){
            //todo: return the existing cert but continue the generation process in the background
        }
        else{

            //Regenerate the certificate
            //let's continue the generation process
        }

        
    }

    var MY_DOMAINS = domains.split(";");
    
    // In many cases all three of these are the same (your email)
	// However, this is what they may look like when different:
	var maintainerEmail = "not-needed@yopmail.com"; //receive notifications from acme.js 
    var subscriberEmail = maintainerEmail; //receive notifications from Letsencrypt

    var packageAgent = 'cloudgate' + '/' + "1.0.55";

    // Choose either the production or staging URL
    var directoryUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';
    if ( isProd ){
        directoryUrl = 'https://acme-v02.api.letsencrypt.org/directory';
    }
    
    // This is intended to get at important messages without
	// having to use even lower-level APIs in the code
	var errors = [];
	function notify(ev, msg) {
		if ('error' === ev || 'warning' === ev) {
			errors.push(ev.toUpperCase() + ' ' + msg.message);
			return;
		}
		// ignore all for now
		console.log(ev, msg.altname || '', msg.status || '');
	}

    
    var acme = ACME.create({ maintainerEmail, packageAgent, notify });
    await acme.init(directoryUrl);
    
    var accountPath = LEAccountPath.replace("account.key", "");
    //create cert folder if not exist
    if (!fs.existsSync(accountPath)){
        fs.mkdirSync(accountPath, { recursive: true });
    }
    

    //create a new ACME account or load an existing one
    var accountKey = null;
    var accountKeyPath = LEAccountPath;
    if (!fs.existsSync(accountKeyPath)){
        var accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
        accountKey = accountKeypair.private;
        fs.writeFileSync(accountKeyPath, JSON.stringify(accountKey));
       	console.info('registering new ACME account...');
    }
    else{
        console.info('Loading existing ACME account...');
        accountKey = JSON.parse(fs.readFileSync(accountKeyPath, 'utf8'));
    }

	var agreeToTerms = true;
	var account = await acme.accounts.create({
		subscriberEmail,
		agreeToTerms,
		accountKey
	});
	console.info('ACME ID: ', account.key.kid);


    var serverKeyPath = certPath + 'privkey.pem';
    var serverKey = null;
    var serverPem = null;
    if (!fs.existsSync(serverKeyPath)){
        console.info('Creating a new serverKey ...');
        var serverKeypair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });
        serverKey = serverKeypair.private;
        serverPem = await Keypairs.export({ jwk: serverKey });
        await fs.promises.writeFile( serverKeyPath, serverPem, 'ascii');
    }
    else{
        console.info('Loading existing serverKey ...');
        accountKey = JSON.parse(fs.readFileSync(accountKeyPath, 'utf8'));
        serverPem = await fs.promises.readFile(serverKeyPath, 'ascii');
	    serverKey = await Keypairs.import({ pem: serverPem });
    }

	var CSR = require('@root/csr');
	var PEM = require('@root/pem');
	var Enc = require('@root/encoding/base64');

	var encoding = 'der';
	var typ = 'CERTIFICATE REQUEST';

	var domains = MY_DOMAINS;
	var csrDer = await CSR.csr({ jwk: serverKey, domains, encoding });
	//var csr64 = Enc.bufToBase64(csrDer);
	var csr = PEM.packBlock({ type: typ, bytes: csrDer });


    function http01(){
        return {
            init: async function(deps) {
                
                console.log("INIT ACME CHALLENGE");
                //console.log(deps);
            },
            set: async function(args) {
                // set TXT record
                console.log("SET ACME CHALLENGE");
                //console.log(args);

                var wellKnownPath = resolve(rootFolder + ".well-known/acme-challenge") + "/";
                //create if not exist
                if (!fs.existsSync(wellKnownPath)){
                    fs.mkdirSync(wellKnownPath, { recursive: true });
                }
                //write keyAuthorization
                console.log("writing: " + wellKnownPath + args.challenge.token);
                fs.writeFileSync(wellKnownPath + args.challenge.token, args.challenge.keyAuthorization);
                //console.log("after write of verification file");
            },
            get: async function(args) {
                // get TXT records
                console.log("GET ACME CHALLENGE");
                //console.log(args);
            },
            remove: async function(args) {
                // remove TXT record
                console.log("REMOVE ACME CHALLENGE");
                //console.log(args);

                //write meta.json if valid
                if ( args.challenge.status == 'valid' || args.challenge.status == 'pending')
                {
                    var date = new Date();
                    date.setDate(date.getDate() + 89);
                    var dateString = date.toISOString();

                    var metaJSON = {
                        "status": args.challenge.status,
                        "expires": dateString,
                        "hostname": args.challenge.hostname,
                        "altname": args.challenge.hostname,
                        "url": args.challenge.url,
                        "token": args.challenge.token,
                        "thumbprint": args.challenge.thumbprint,
                        "keyAuthorization": args.challenge.keyAuthorization
                    };
                    await fs.promises.writeFile(certPath + 'meta.json', JSON.stringify(metaJSON), 'ascii');
                    console.info('wrote ' + certPath + 'meta.json');
                }
                

                //delete file
                var wellKnownPath = resolve(rootFolder + ".well-known/acme-challenge") + "/";
                try{
                    fs.unlinkSync(wellKnownPath + args.challenge.token);
                }catch(ex){
                    
                }
                
            }
        };
    }

	var challenges = {
		'http-01': http01()
	};

    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log("public Folder: " + (rootFolder));
	console.info('validating domain authorization for ' + domains.join(' '));
	var pems = await acme.certificates.create({
		account,
		accountKey,
		csr,
		domains,
		challenges
	});
	var fullchain = pems.cert + '\n' + pems.chain + '\n';

    await fs.promises.writeFile(certPath + 'cert.pem', pems.cert, 'ascii');
    console.info('wrote ' + certPath + 'cert.pem');
    await fs.promises.writeFile(certPath + 'fullchain.pem', fullchain, 'ascii');
    console.info('wrote ' + certPath + 'fullchain.pem');
    
	if (errors.length) {
		console.warn();
		console.warn('[Warning]');
		console.warn('The following warnings and/or errors were encountered:');
		console.warn(errors.join('\n'));
    }
    
    var result = {
        "certPath": resolve(certPath + "cert.pem"),
        "privateKeyPath": resolve(certPath + "privkey.pem"),
        "fullchain": resolve(certPath + "fullchain.pem")
    };
    return result;

}
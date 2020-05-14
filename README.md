
# cloudgate

![Cloudgate logo](default/cloudgate128.png)

***Cloudgate is a fast multi-threaded web application server for Node.js***

It can be used for several use cases:
- Static file web server with local file system and AWS S3 support
- API Gateway with local microservices and AWS lambda support
- Serve multiple web applications in a single process and sharing the same ports (80, 443)
- Websocket server 
- SSL termination (with Letsencrypt automatic certs)
- REST & Websocket API to reconfigure the cloudgate without downtime
- Crazy high performances (up to 185K RPS per core)
- Crazy low latencies (less than 30us, that's 0.03ms!)
- Support multi-threading
- Support cluster mode with multiple servers (can be in different datacenters)
- Firewall / Rate limiter / DDOS protection (Coming soon)
- Reverse proxy (Coming soon)
- Replicated in-memory datastore (Coming soon)

Motivations:
- Multi-tenant clustering able to handle thousands of applications per node 
- High availability & scalability without Docker/Kubernetes overhead
- Less moving parts, simplify infrastructure
- Extreme performances exploration


## Requirements

- Linux, Windows or Mac OS
- Node 10+ for single-threaded mode, Node 12+ for multi-threaded mode

if you are on Node 10, you can activate multi-threading by executing this in your terminal:

    export NODE_OPTIONS=--experimental-worker


## Installation

Install globally:  

    npm i @elestio/cloudgate -g

Then you can clone samples: 
    
    git clone https://github.com/elestio/cloudgate-samples.git

Enter the cloned folder then install dependencies:  
    
    cd cloudgate-samples
    npm install

Your are now ready to run the samples below

## Run samples
 
run a sample app on the default port (3000): 

    cloudgate ./apps/CatchAll/ --rootfolder ./

Then open the site in your browser: http://127.0.0.1:3000/


run a sample an app in another root folder: 
    
    cloudgate ./apps/CatchAll/ --rootfolder /my/custom/folder

  
Start multiple apps on port 80 with **adminAPI** activated:

    sudo cloudgate -p80 ./apps/Static ./apps/Websocket ./apps/CatchAll --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G --rootfolder ./

Here sudo is required if you are not root to bind port 80


Start an app on port 80 and also on port 443 with **AutoSSL/letsencrypt**:
    
    sudo cloudgate -p80 --ssl --sslport 443 --ssldomain www.mydomain.com ./apps/Static --rootfolder ./


Note: By default, cloudgate will use all the cores availables on your server, you can specify the number of cores to use with the option "-c"
eg: `-c 4` means cloudgate will use 4 cores instead of all the cores availables

 ## Run as a service

Install and run as a service with PM2: 
    
    pm2 start "cloudgate ./apps/CatchAll/ --rootfolder ./" --name cloudgate


## AdminAPI 


When adminAPI is activated you can access the Websocket & REST API to control your cloudgate:

List apps running:

    curl --compressed --location --request POST 'http://localhost:3000/CloudGateAdmin' \
    --header 'Authorization: Bearer 12345A' \
    --header 'Content-Type: text/plain' \
    --data-raw '{"action": "list"}'

  
Load a local App:

    curl --compressed --location --request POST 'http://localhost:3000/CloudGateAdmin' \
    --header 'Authorization: Bearer 12345A' \
    --header 'Content-Type: text/plain' \
    --data-raw '{"action": "loadAppFromLocalPath", "appPath": "./apps/sample1/", }'
  
Load a Serverless app:

    curl --compressed --location --request POST 'http://localhost:3000/CloudGateAdmin' \
    --header 'Authorization: Bearer 12345A' \
    --header 'Content-Type: text/plain' \
    --data-raw '{
    "action": "loadAppFromJSON",
    "appID": "FILL_UNIQUE_IDENTIFIER_FOR_YOUR_APP",
    "appConfig": {
    "env": "PROD",
    "version": "1.0.0",
    "title": "Serverless sample",
    "description": "This is a sample AWS Serverless app",
    "domains": ["*"],
    "publicFolder": "FILL_FOLDER_IN_S3_BUCKET",
    "AWS": {
	    "region": "us-east-1",
	    "bucket": "FILL_YOUR_BUCKET_NAME",
	    "accessKeyId": "FILL_YOUR_AWS_ACCESS_KEY",
	    "secretAccessKey": "FILL_YOUR_AWS_SECRET_KEY"
    },
    "apiEndpoints": {
	    "/tests/simple": {
	    "src": "FILL_YOUR_DEPLOYED_LAMBDA_FUNCTION_NAME_1",
	    "handler": "index.handler"
	    },
	    "/tests/full": {
	    "src": "FILL_YOUR_DEPLOYED_LAMBDA_FUNCTION_NAME_2",
	    "handler": "index.handler"
	    }
    }


  

unload an App:

    curl --compressed --location --request POST 'http://localhost:3000/CloudGateAdmin' \
    --header 'Authorization: Bearer 12345A' \
    --header 'Content-Type: text/plain' \
    --data-raw '{"action": "unloadApp", "appPath": "./apps/sample1/", }'

**The API is described in postman/cloudgate.postman_collection.json**

  

## Remote Shell

Check the sample app RemoteShell for more details about using Websocket to control your instance
You can also try it with this command: 

    cloudgate -p3000 ./apps/CatchAll --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G

Then open your browser on: http://127.0.0.1:3000/wsAdmin.html?token=12345A000G


## EXPERIMENTAL: Cluster mode

Serve an app on port 3000 in cluster mode as the master with **adminAPI** activated: 

    cloudgate ./apps/CatchAll -p 3000 --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G --rootfolder ./ --master 0.0.0.0:8081@A_Random_Secret_Token_Here

Serve an app on port 3000 in cluster mode as a slave with **adminAPI** activated: 

    cloudgate ./apps/CatchAll -p 3000 --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G --rootfolder ./ --slave 0.0.0.0:8081@A_Random_Secret_Token_Here

 
## Benchmarks

Run your server in mono or multithread with PM2 then:

Run benchmark in single core:
`./benchmarks/single.sh`

Run benchmark in multi core:
`./benchmarks/multi.sh`

A special endpoint is available to benchmark the raw performance with no processing pipeline:
http://localhost:3000/cloudgate/debug/raw

## CLI usage

cloudgate [path] [options]
 
**options:**

    -r --rootfolder [path] root folder for your app, this impact the chdir and from where your code is loaded when doing require()

    -p --port   Port to use [3000]

    -w --watch  Activate file change watch [default: disabled]

    -d --debug  Activate the console logs for debugging
    
    --admin 1   Enable Admin Remote API (default: disabled)
    
    --adminpath /cgadmin    Declare the virtual path of the admin api
    
    --admintoken XXXXXXXX   The admin token to use for authentication of the REST API & Websocket
    
    --ssl   Enable https.
    
    --sslport   SSL Port (default: 443)
    
    --ssldomain     Domain name on which you want to activate ssl (eg: test.com)

    --master [Public IP, Local IP or *]:[Port]@[Token]   Declare this host as the master, Eg.: *:8081@000110b2-fb48-435c-a5b3-fce08c7f49da
    
    --salve [Master IP or Domain]:[Port]@[Token]   Declare this host as a slave connecting to a master, eg: --slave 192.168.0.100:8081@000110b2-fb48-435c-a5b3-fce08c7f49da
    


--------------

To create a new App you can clone one of the samples in /apps folder of this repo

Another option is to create a new empty folder, and create a file named "appconfig.json", inside paste this:

    {
	    "domains": ["*"],
	    "publicFolder": "./public"
    }

This is the bare minimum configuration required to define an application

**domains**: is a string array containing all the domains that should be sent to that app

Another Eg.: "domains": ["127.0.0.1", "localhost", "192.168.1.1", "mydomain.com", "www.mydomain.com"],

In this example we are requesting several domains, you can notice that 127.0.0.1 and localhost are 2 different domains, a private network ip is also another domain. You can also use wildcards "*" to catch ALL domains not specified in a more specific rule. Subdomains wildcards are also supported "*.mydomain.com"

**publicFolder**: is a string containing the path of the public folder of your app, it must be relative to the folder of your app

## Options in appconfig.json

 

Here is the full list of configuration options supported in appconfig.json:
  
**mainDomain**: if filled, and if the visitor is using another domain specified in "domains" then the user will be redirected to the main domain

**TypeAPI**: Define how the functions are executed can be defined to LOCAL or LAMBDA, default value is LOCAL

**TypeFS**: Define the source of public files, can be defined to LOCAL or S3, default value is LOCAL
  

**apiEndpoints**: object containing list of defined endpoints.

    {
    	"/tests/simple": {
    		"src": "./API/tests/",
    		"handler": "simple.handler"
    	},
    	"/tests/full": {
    		"src": "./API/tests/",
    		"handler": "full.handler"
    	},
        "/wildcardtest/*" : {
            "src" : "./API/tests/",
            "handler": "full.handler"
        }
    }


Here we are defining 2 API endpoints,
first one is on the virtual path "/tests/simple"
and will be served using the code in the folder defined by the attribute "src"
The handler attribute here "simple.handler" mean our handler source code will be in the file simple.js
In this example a second function is declared, the handler code is in the same folder but in a different file named full.js
In the third apiEndpoint we are using a wildcard (*) so all path starting the the prefix /wildcardtest/ will be routed to that function
  

**websocketEndpoints**: this works exactly like apiEndpoints, but instead of declaring an handler we have to declare several events: open, message, close

     {
     	"/echo": {
     		"src": "./API/websocket/",
     		"open": "Echo.open",
     		"message": "Echo.message",
     		"close": "Echo.close"
     	},
     	"/chat": {
     		"src": "./API/websocket/",
     		"open": "Chat.open",
     		"message": "Chat.message",
     		"close": "Chat.close"
     	}
     }

  
  

**db**: you can configure your app to get access to MySQL or Redis by adding this configuration
and connect to your DB from your app. 
You can also expose safely your DB using the REST API or WEBSOCKET API

**TODO: Must describe / Implement**

    `{
    	"MYSQL": {
    		"endpoint": "/db",
    		"host": "127.0.0.1",
    		"port": 3306,
    		"database": "db_name",
    		"user": "db_user",
    		"password": "db_password"
    	},
    	"REDIS": {
    		"host": "127.0.0.1",
    		"port": 6379,
    		"redisDB": 0,
    		"password": "myRedisSecretPasswordHere",
    		"loadFrom": "./DB/REDIS/dump.redis",
    		"backupTo": "./DB/REDIS/backup.redis"
    	}
    }`

 

## TODO

   1) finish multinodes infra
   2) MUST improve serving large files (currently 4-8GB/s .... vs 28GB/s on nginx!)

 
 - [ ] Add a rate limiter
 - [ ] Install as a service
              https://github.com/coreybutler/node-linux
              https://github.com/coreybutler/node-windows
              https://github.com/coreybutler/node-mac
 - [ ] reverse proxy
              https://github.com/OptimalBits/redbird
 - [ ] Managed MySQL Cluster
 - [ ] Managed PostgreSQL Cluster
 - [ ] Managed Redis Cluster
 - [ ] Managed MongoDB Cluster


# cloudgate

![Cloudgate logo](default/cloudgate128.png)

***Cloudgate is a fast multi-threaded web application server for Node.js***

It can be used for several use cases:
- Static file web server with local file system and AWS S3 support
- API Gateway with local microservices and AWS lambda support
- Serve multiple web applications in a single process and sharing the same ports (80, 443)
- Reverse proxy / Websocket server
- SSL termination (with Letsencrypt automatic certs)
- REST & Websocket API to reconfigure the cloudgate without downtime
- Crazy high performances (up to 185K RPS per core)
- Crazy low latencies (less than 30us, that's 0.03ms!)
- Multi-threading with websockets sync between threads
- Multi nodes cluster suppot (Alpha)
- Firewall / Rate limiter / DDOS protection (Coming soon)
- Replicated in-memory datastore (Coming soon)

Motivations:
- Multi-tenant clustering able to handle thousands of applications per node 
- High availability & scalability without Docker/Kubernetes overhead
- Less moving parts, simplify infrastructure
- Extreme performances exploration

&nbsp;
## Requirements

- Linux, Windows or Mac OS
- git
- Node 10+ for single-threaded mode, Node 12+ for multi-threaded mode

if you are on Node 10, you can activate multi-threading by executing this in your terminal:

    export NODE_OPTIONS=--experimental-worker

&nbsp;

## Installation

### Linux one line installer: latest binary (no requirements, recommended)

    wget -c https://cloudgate.terasp.net/CDN/cloudgate-linux.tar.gz && tar -xzf cloudgate-linux.tar.gz -C /bin

This version include Node.js V14 and all the dependencies in the binary, so it can run on any linux x64 without requirements

### Install with nodejs / npm:  
    apt install git
    npm i @elestio/cloudgate -g --ignore-scripts

&nbsp;

### Linux: Install as a service with SystemD
    
    ./systemd/install.sh

[Check here](#run-as-a-service) for more details about usage

&nbsp;

### Docker: Install as a service with Docker
    apt install -y docker.io
    docker build -t cloudgate .
    docker run -p 80:3000 -d cloudgate --restart always

[Check here](#run-with-docker ) for more details about usage with docker

&nbsp;

### MySQL: Run MySQL in docker (optional)
    ./DB/MYSQL/startMYSQL.sh

&nbsp;
## Run samples

    cloudgate --create /path/to/create 

you will then be able to choose a template app that will be created in the target folder provided

&nbsp;
## Run samples from source

Clone this repo including samples: 
    
    git clone https://github.com/elestio/cloudgate.git

Enter the cloned folder then install dependencies:  
    
    cd cloudgate
    npm install

Your are now ready to run the samples below
 
run a sample app on the default port (3000): 

    cloudgate ./apps/CatchAll

Then open the site in your browser: http://127.0.0.1:3000/

Note: By default, cloudgate will use all the cores availables on your server, you can specify the number of cores to use with the option "-c"
eg: `-c 4` means cloudgate will use 4 cores instead of all the cores availables

Note2: You can use relative or absolute path to point to your app folder


Start an app on port 80 with **adminAPI** activated:

    sudo cloudgate -p80 ./apps/CatchAll --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G

Here sudo is required if you are not root to bind port 80


Start an app on port 80 and also on port 443 with **AutoSSL/letsencrypt**:
    
    sudo cloudgate ./apps/Static -p80 --ssl --sslport 443 --ssldomain www.mydomain.com


&nbsp;
 ## Reverse Proxy

Check our Reverse proxy example, this will proxy the web trafic from port 80 to the target configured in ./ReverseProxy/appconfig.json
    
    sudo cloudgate ./apps/ReverseProxy -p80

Here is ther relevant part of the appconfig.json

        ...
        "apiEndpoints": {
            "/*" : {
                "skipPrefix": false,
                "src": "https://youzeek.com/"
            }
        },
        ...

This rule capture /* and proxy it to the url indicated in the src attribute

&nbsp;
 ## Run as a service

Install and run as a service with SystemD: 
    
    ./systemd/install.sh

When installed with SystemD you can load more apps in cloudgate like this:

    cloudgate --memstate /etc/cloudgate/memorystate.json --load /root/cloudgate/apps/Static
    systemctl restart cloudgate

Then to unload an app from your cloudgate instance:

    cloudgate --memstate /etc/cloudgate/memorystate.json --unload /root/cloudgate/apps/Static
    systemctl restart cloudgate

To get the list of loaded apps from your cloudgate instance:

    cloudgate --memstate /etc/cloudgate/memorystate.json --list
    systemctl restart cloudgate

To create a new app from a template:

    cloudgate --memstate /etc/cloudgate/memorystate.json --create /path/to/create/

Once the app is created you can go to the new folder, edit your app then load it with the --load command described above

&nbsp;
## Run with Docker 

    git clone https://github.com/elestio/cloudgate.git
    cd cloudgate

then make some changes in **Dockerfile** if needed then build the docker image

    docker build -t cloudgate .

To **run it once** interactively:

    docker run -it -p 80:3000 cloudgate

To **run as a service** in docker:
    
    docker run -p 80:3000 -d cloudgate --restart always

ENV Variables:

| Var name    | default value | details                                             |
|-------------|---------------|-----------------------------------------------------|
| THREADS     |               | Number of CPU Threads to use, default to ALL        |
| PORT        | 3000          | TCP port to use                                     |
| APP_ROOT    |               | folder containing your app (and appconfig.json)     |
| NODE_ROOT   |               | path to folder containing node_modules              |
| OUTPUT_CACHE| 0             | Enable Caching of GET requests with 1               |
| SSL         | 0             | Enable SSL with 1                                   |
| SSL_CERT    |               | optional path to your SSL cert fullchain            |
| SSL_KEY     |               | optional path to your SSL private key               |
| SSL_DOMAIN  |               | domain name for SSL                                 |
| SSL_PORT    | 443           | TCP port for SSL                                    |
| ADMIN       | 0             | Enable Admin API/WS with 1                          |
| ADMIN_PATH  |               | path to listen (eg.: CloudGateAdmin)                |
| ADMIN_TOKEN |               | security token to protect your Admin                |
| VERBOSE     | 0             | Enable verbose mode with 1                          |
| WATCH       | 0             | Enable file watch with 1 (auto invalidate cache)    |
| MASTER      |               | [Public IP, Local IP or *]:[Port]@[Token]           |
| SLAVE       |               | [Master IP]:[Port]@[Token]                          |


&nbsp;
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

  
&nbsp;
## Remote Shell

Check the sample app RemoteShell for more details about using Websocket to control your instance
You can also try it with this command: 

    cloudgate -p3000 ./apps/CatchAll --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G

Then open your browser on: http://127.0.0.1:3000/wsAdmin.html?token=12345A000G

&nbsp;
## EXPERIMENTAL: Cluster mode

Serve an app on port 3000 in cluster mode as the master with **adminAPI** activated: 

    cloudgate ./apps/CatchAll -p 3000 --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G --master 0.0.0.0:8081@A_Random_Secret_Token_Here

Serve an app on port 3000 in cluster mode as a slave with **adminAPI** activated: 

    cloudgate ./apps/CatchAll -p 3000 --admin 1 --adminpath /CloudGateAdmin --admintoken 12345A000G --slave 0.0.0.0:8081@A_Random_Secret_Token_Here

&nbsp;
## Benchmarks

Run your server in mono or multithread like described above then

Run benchmark in single core:
`./benchmarks/single.sh`

Run benchmark in multi core:
`./benchmarks/multi.sh`

PS: if you don't have WRK installed you can download the binary for linux with this command:
`./download-WRK.sh`

A special endpoint is available to benchmark the raw performance with no processing pipeline:
http://localhost:3000/cloudgate/debug/raw

&nbsp;
## CLI usage

cloudgate [path] [options]
 
**options:**

    [GENERAL]
    -r [path] root folder for your app, this impact the chdir and from where your code is loaded when doing require()
    -p --port   Port to use [3000]
    -oc --outputcache [0 or 1] Default is 0, disabled. When enabled this will cache all GET requests until file is changed on disk.
    -c number of threads to use, eg: 2 to use 2 threads, by default it will use all cores available
    -w --watch  Activate file change watch [default: disabled]
    -d --debug  Activate the console logs for debugging
    
    [ADMIN]
    --admin 1   Enable Admin Remote API (default: disabled)
    --adminpath /CloudGateAdmin    Declare the virtual path of the admin api
    --admintoken XXXXXXXX   The admin token to use for authentication of the REST API & Websocket
    
    [SSL]
    --ssl   Enable https.
    --sslport   SSL Port (default: 443)
    --ssldomain     Domain name on which you want to activate ssl (eg: test.com)
    --sslcert  optional path to your SSL cert. E.g: /etc/letsencrypt/live/yourdomain.com/cert.pem
    --sslkey  optional path to your SSL key. E.g: /etc/letsencrypt/live/yourdomain.com/privkey.pem

    [CLUSTER]
    --master [Public IP, Local IP or *]:[Port]@[Token]   Declare this host as the master, Eg.: *:8081@000110b2-fb48-435c-a5b3-fce08c7f49da
    --salve [Master IP or Domain]:[Port]@[Token]   Declare this host as a slave connecting to a master, eg: --slave 192.168.0.100:8081@000110b2-fb48-435c-a5b3-fce08c7f49da
    
    [APPS]
    --list                  return an array of loaded apps path
    --loadapp     [path]    Load the app located in the target path, the folder must contain appconfig.json
    --unloadapp   [path]    Unload the app located in the target path
    --create      [path]    Create a new app based on a template in the target path

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


&nbsp;
## Options in appconfig.json

Here is the full list of configuration options supported in appconfig.json:
  
**mainDomain**: if filled, and if the visitor is using another domain specified in "domains" then the user will be redirected to the main domain

**TypeAPI**: Define how the functions are executed can be defined to LOCAL or LAMBDA, default value is LOCAL

**TypeFS**: Define the source of public files, can be defined to LOCAL or S3, default value is LOCAL

**redirect404toIndex**: Indicate if all 404 should be redirected to index.html, this is usefull for SPA, default is false, set it to true to activate it
  
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

  
  &nbsp;
  ## TODO
 
 - [ ] Add a rate limiter
 - [ ] Cluster communication improvements
 - [X] Managed MySQL
 - [ ] Managed PostgreSQL
 - [ ] Managed Redis
 - [ ] Managed MongoDB

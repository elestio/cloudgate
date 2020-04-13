# cloudgate

Install:
`git clone ssh://git@github.com/jbenguira/cloudgate.git`

Enter the cloned folder: 
`cd cloudgate`

Then install dependencies:
`npm install`

then run a sample script:
`node examples/http.js`

or run a sample app container:
`node cli.js ./apps/sample1/` 

Install and run as a service with PM2 and watch file changes:
`pm2 start "node cli.js ./apps/sample1/" --name cloudgate -i 6 --watch` 
where -i 6 indicate the number of vcores of your server

/!\ Once the package is published syntax will be:
`cloudgate ./apps/sample1/` 

Run benchmark in single core:
`./benchmarks/single.sh`

Run benchmark in multi core:
`./benchmarks/multi.sh`


TODO:

1) Add a rate limiter
https://github.com/animir/node-rate-limiter-flexible/blob/master/README.md

2) Install as a service
https://github.com/coreybutler/node-linux
https://github.com/coreybutler/node-windows
https://github.com/coreybutler/node-mac

3) Handle letsencrypt
https://git.coolaj86.com/coolaj86/acme.js

4) handle reverse proxy
https://github.com/OptimalBits/redbird

5) Handle MySQL Galera cluster loading/saving

6) Handle Redis Cluster loading/saving

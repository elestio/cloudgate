#start the server with: node cloudgate.js apps/CatchAll/
#then run this in another terminal
./wrk -t2 -c256 "http://localhost:3000/tests/add?a=33&b=108" --latency
#this add params a+b and return the result
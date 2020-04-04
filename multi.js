const { Worker, isMainThread, threadId } = require('worker_threads');
const os = require('os');

if (isMainThread) {
    /* Main thread loops over all CPUs */
    os.cpus().forEach(() => {
        /* Spawn a new thread running this source file */
        var worker = new Worker(__filename);
    });
}
else
{
    const main = require('./index.js');
}

//disabled because: will do the save action and crash with a core dump
//maybe this should be inside index.js
/*
if (isMainThread) {
    //Exit handler, save states & DB to disk before exit
    var isExited = false;
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
            process.on(eventType, cleanUpServer.bind(null, eventType));
    })
    function cleanUpServer(test, event){
            if ( isExited ) {
                return;
            }
            else{
                isExited = true;
                
                console.log(event);
                console.log("TODO: cleanount process / Save states & DB ...");
                process.exit();
            }
    }
}
*/
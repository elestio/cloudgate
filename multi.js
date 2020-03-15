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

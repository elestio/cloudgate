exports.handler = async (event, context, callback) => {
    // TODO implement
    await fakeJob();
    callback(null, 'Hello I was a long job running on CloudGate');

    function fakeJob() {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, 4000);
        });
    }
};

module.exports = (() => {
	try {
		const cloudgate = require('./cloudgate_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node');
        process.on('exit', cloudgate.free);
        
		return cloudgate;
	} catch (e) {
		throw new Error('This version of cloudgate is not compatible with your Node.js build:\n\n' + e.toString());
    }
})();
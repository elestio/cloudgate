module.exports = (() => {
	try {
		const uWS = require('./uftl_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node');
		process.on('exit', uWS.free);
		return uWS;
	} catch (e) {
		throw new Error('This version of µFTL is not compatible with your Node.js build:\n\n' + e.toString());
	}
})();

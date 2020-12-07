var path = require('path');
module.exports = (() => {
	try {
        var binPath = path.join(__dirname, './bin/cloudgate_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node')
        const cloudgate = require( binPath );
        cloudgate._cfg("silent");
		if (process.env.EXPERIMENTAL_FASTCALL) {
			process.nextTick = (f, ...args) => {
				Promise.resolve().then(() => {
					f(...args);
				});
			};
		}
		return cloudgate;
	} catch (e) {
		throw new Error('This version of cloudgate is not compatible with your Node.js build:\n\n' + e.toString());
	}
})();
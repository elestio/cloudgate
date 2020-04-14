const memory = require('../modules/memory');
const fs = require('fs');
module.exports = {
    load: function(fullAppPath) {
        fullAppPath = fullAppPath.split("appconfig.json")[0];
        if (!fullAppPath.endsWith("/")) {
            fullAppPath += "/";
        }
        var configPath = fullAppPath + "appconfig.json";

        if (fs.existsSync(configPath)) {
            console.log("\nLoading app from " + configPath + "\n");

            var apiDefinition = JSON.parse(fs.readFileSync(configPath));
            apiDefinition.root = fullAppPath;
            apiDefinition.domains.forEach(function(domainObject) {
                memory.setObject(domainObject, apiDefinition, "GLOBAL");
                console.log(memory.debug());
            });
        }
        else {
            console.log("\nNo app detected in " + configPath);
            //publicFolder = options.root;
        }
    }
}
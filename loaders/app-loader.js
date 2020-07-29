const memory = require('../modules/memory');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid')

module.exports = {
    load: function(fullAppPath) {
        fullAppPath = fullAppPath.split("appconfig.json")[0];
        if (!fullAppPath.endsWith("/")) {
            fullAppPath += "/";
        }
        var configPath = fullAppPath + "appconfig.json";

        //console.log("Path: " + configPath);
        //console.log("exist: " + fs.existsSync(configPath));

        if (fs.existsSync(configPath)) {
            //console.log("\nLoading app from " + configPath + "\n");

            var apiDefinition = JSON.parse(fs.readFileSync(configPath));
            apiDefinition.root = fullAppPath;

            apiDefinition.domains.forEach(function(domainObject) {
                memory.setObject(domainObject, apiDefinition, "GLOBAL");                
                //console.log(memory.debug());
            });

            memory.set("mustSaveConfig", 1, "TEMP");

            //console.log("App Loaded from localPath: " + configPath);

            return "App Loaded from: " + configPath;
        }
        else {
            //console.log("\nNo app detected in " + configPath);

            if (  memory.getObject("*", "GLOBAL") == null ){
                var defaultApp = {
                    env: 'PROD',
                    version: '1.0.0',
                    title: 'Default Static Files',
                    description: 'This is a sample app that catch all domains not configured and serve static files',
                    domains: ["*"],
                    publicFolder: './',
                    root: './'
                }
                memory.setObject("*", defaultApp, "GLOBAL");

                memory.set("mustSaveConfig", 1, "TEMP");
            }
            
            return "No app detected in " + configPath;
        }
    },
    loadJSON: function(json, appID) {

            var apiDefinition = json;
            apiDefinition.root = appID;
            
            apiDefinition.domains.forEach(function(domainObject) {
                memory.setObject(domainObject, apiDefinition, "GLOBAL");
                //console.log(memory.debug());
            });

            memory.set("mustSaveConfig", 1, "TEMP");
            
            console.log("App Loaded from JSON: " + appID);
            return "App Loaded from JSON: " + appID;
        
    }
}
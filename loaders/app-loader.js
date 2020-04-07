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
      //load the app
      //require('./lib/api-loader')(app, configPath, API_Token);
      var apiDefinition = JSON.parse(fs.readFileSync(configPath));
      apiDefinition.root = fullAppPath;
      //publicFolder = path.join(options.root, apiDefinition.publicFolder);
      apiDefinition.domains.forEach(function (domainObject) {
        memory.set(domainObject, apiDefinition);
      });
    }
    else
    {
      console.log("\nNo app detected in " + configPath);
        //publicFolder = options.root;
    }
  }
}
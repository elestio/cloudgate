var Redis = require("ioredis");
var redis = new Redis(6379, "127.0.0.1");
const memory = {}
module.exports = {
  getObject: function(key, finalKey) {
    //TODO: think about expires / refresh
    //console.log(memory[key]);
    if ( memory[key] != null ){
        //console.log("cached: " + key)
        return JSON.parse(memory[key]);         
    }
    else{
        return new Promise(function(resolve, reject) {
        redis.get(key).then(function (result) {
                memory[key] = result;
                //console.log("not cached: " + key)
                //console.log(memory[key])
                if ( finalKey != null ) {
                    memory[finalKey] = result;
                    //console.log("not cached finalKey: " + finalKey)
                }
                
                resolve(JSON.parse(result));
            });
        });
    }
  },
  setObject: function(key, value) {
    var str = JSON.stringify(value);

    //store in memory
    //memory[key] = str; //if this is activated server is twice slower even if we don't call this code

    //store in redis
    redis.set(key, str);

    //pubsub update for other nodes
    //todo

  },
  get: function(key, finalKey) {
    if ( memory[key] != null ){
        return memory[key];         
    }
    else{
        return new Promise(async function(resolve, reject) {
            redis.get(key).then(function (result) {
                memory[key] = result;
                if ( finalKey != null ) {
                    memory[finalKey] = result;
                }
                resolve(result);
            });
        });
    }
    
    
  },
  set: function(key, value) {

    //store in memory 
    //memory[key] = value;  //if this is activated server is twice slower even if we don't call this code

    //store in redis
    redis.set(key, value);

    //pubsub update
    //todo
    
  }
}
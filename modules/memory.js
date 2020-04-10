var Redis = require("ioredis");
var redis = new Redis(6379, "127.0.0.1");
const memory = {}
module.exports = {
  getObject: function(key, finalKey) {

    //TODO: think about expires / refresh
    if ( memory[key] != null ){
        //console.log("cached: " + key)
        return memory[key];         
    }
    else{
        return new Promise(function(resolve, reject) {
        redis.get(key).then(function (result) {
                memory[key] = result;
                //console.log("not cached: " + key)
                if ( finalKey ) {
                    memory[finalKey] = result;
                    //console.log("not cached: " + finalKey)
                }
                
                resolve(JSON.parse(result));
            });
        });
    }
  },
  setObject: function(key, value) {
    var str = JSON.stringify(value);

    //store in redis
    redis.set(key, str);

    //store in memory
    memory[key] = str;

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
                if ( finalKey ) {
                    memory[finalKey] = result;
                }
                resolve(result);
            });
        });
    }
    
    
  },
  set: function(key, value) {
    
    //store in redis
    redis.set(key, value);

    //store in memory 
    memory[key] = value; 

    //pubsub update
    //todo
    
  }
}
var Redis = require("ioredis");
var redis = new Redis(6379, "127.0.0.1");
const memory = {}
module.exports = {
  getObject: function(key) {
    //return memory[key];
    return new Promise(function(resolve, reject) {
      redis.get(key).then(function (result) {
        resolve(JSON.parse(result));
      });
    });
  },
  setObject: function(key, value) {
    //return memory[key] = value;
    redis.set(key, JSON.stringify(value));
  },
  get: function(key) {
    return new Promise(async function(resolve, reject) {
      redis.get(key).then(function (result) {
        resolve(result);
      });
    });
  },
  set: function(key, value) {
    redis.set(key, value);
  }
}
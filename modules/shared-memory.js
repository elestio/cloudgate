const sharedmem = require('../coregate.js');
module.exports = {
  getString: function(key, collection){
      sharedmem.lock();
      var tmp = sharedmem.getString(key + "", collection + "");
      sharedmem.unlock();
      return tmp;
  },
  setString: function(key, value, collection){
      sharedmem.lock();
      sharedmem.setString(key + "", value + "", collection + "");
      sharedmem.unlock();
  },
  deleteString: function(key, collection){
      sharedmem.lock();
      sharedmem.deleteString(key + "", collection + "");
      sharedmem.unlock();
  },
  getInteger: function(key, collection){
      sharedmem.lock();
      var tmp = parseInt(sharedmem.getInteger(key + "", collection + ""));
      sharedmem.unlock();
      return tmp;
  },
  setInteger: function(key, value, collection){
      sharedmem.lock();
      sharedmem.setInteger(key + "", value, collection + "");
      sharedmem.unlock();
  },
  deleteInteger: function(key, collection){
      sharedmem.lock();
      sharedmem.deleteInteger(key + "", collection + "");
      sharedmem.unlock();
  },
  incInteger: function(key, value, collection){
      sharedmem.lock();
      sharedmem.incInteger(key + "", value, collection + "");
      sharedmem.unlock();
  },
  getStringKeys: function(collection){
      sharedmem.lock();
      var tmp = sharedmem.getStringKeys(collection + "");
      sharedmem.unlock();
      return tmp;
  },
  deleteStringCollection: function(collection){
      sharedmem.lock();
      sharedmem.deleteStringCollection(collection + "");
      sharedmem.unlock();
  },
  getIntegerKeys: function(collection){
      sharedmem.lock();
      var tmp = sharedmem.getIntegerKeys(collection + "");
      sharedmem.unlock();
      return tmp;
  },
  deleteIntegerCollection: function(collection){
      sharedmem.lock();
      sharedmem.deleteIntegerCollection(collection + "");
      sharedmem.unlock();
  },
  lock: function(){
      sharedmem.lock(); //this will lock the whole application until unlock is called
  },
  unlock: function(){
      sharedmem.unlock();
  }
}
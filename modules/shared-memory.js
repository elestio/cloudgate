const sharedmem = require('uWebSockets.js');
module.exports = {
  getString: function(key, collection){
      sharedmem.lock();
      var tmp = sharedmem.getString(key, collection);
      sharedmem.unlock();
      return tmp;
  },
  setString: function(key, value, collection){
      sharedmem.lock();
      sharedmem.setString(key, value, collection);
      sharedmem.unlock();
  },
  getInteger: function(key, collection){
      sharedmem.lock();
      var tmp = sharedmem.getInteger(key, collection);
      sharedmem.unlock();
      return tmp;
  },
  setInteger: function(key, collection){
      sharedmem.lock();
      sharedmem.setInteger(key, value, collection);
      sharedmem.unlock();
  },
  incInteger: function(key, value, collection){
      sharedmem.lock();
      sharedmem.incInteger(key, value, collection);
      sharedmem.unlock();
  },
  getStringKeys: function(collection){
      sharedmem.lock();
      var tmp = sharedmem.getStringKeys(collection);
      sharedmem.unlock();
      return tmp;
  },
  getIntegerKeys: function(collection){
      sharedmem.lock();
      var tmp = sharedmem.getIntegerKeys(collection);
      sharedmem.unlock();
      return tmp;
  }
}
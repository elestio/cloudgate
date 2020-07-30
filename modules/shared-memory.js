const sharedmem = require('uWebSockets.js');
module.exports = {
  getString: function(key){
      sharedmem.lock();
      var tmp = sharedmem.getString(key);
      sharedmem.unlock();
      return tmp;
  },
  setString: function(key, value){
      sharedmem.lock();
      sharedmem.setString(key, value);
      sharedmem.unlock();
  },
  getInteger: function(key){
      sharedmem.lock();
      var tmp = sharedmem.getInteger(key);
      sharedmem.unlock();
      return tmp;
  },
  setInteger: function(key){
      sharedmem.lock();
      sharedmem.setInteger(key, value);
      sharedmem.unlock();
  },
  incInteger: function(key, value){
      sharedmem.lock();
      sharedmem.incInteger(key, value);
      sharedmem.unlock();
  },
  getStringKeys: function(){
      sharedmem.lock();
      var tmp = sharedmem.getStringKeys();
      sharedmem.unlock();
      return tmp;
  },
  getIntegerKeys: function(){
      sharedmem.lock();
      var tmp = sharedmem.getIntegerKeys();
      sharedmem.unlock();
      return tmp;
  }
}
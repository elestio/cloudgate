var memory = {}

module.exports = {
  getObject: function(key, context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //TODO: think about expires / refresh
    //console.log(memory[key]);
    //console.log("get " + context + "/" + key);
    if ( memory[context][key] != null ){
        //console.log("cached: " + key)
        //return JSON.parse(memory[key]); //JSON.parse is SUUUUPER slow, let's avoid it by storing objects pre parsed in memory!        
        return memory[context][key];         
    }
    else{
        return null;
    }
  },
  setObject: function(key, value, context) {
    
    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory
    memory[context][key] = value; 

    //console.log("set " + context + "/" + key);

    //TODO: pubsub update for other nodes

  },
  get: function(key, context) {
    
    if ( memory[context] == null ) { memory[context] = {}; }

    

    if ( memory[context][key] != null ){
        return memory[context][key];         
    }
    else{
        return null;
    }
    
    
  },
  set: function(key, value, context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    memory[context][key] = value;  //if this is activated server is twice slower even if we don't call this code

    //TODO: pubsub update
    
  },
  remove: function(key, context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    delete memory[context][key];  //if this is activated server is twice slower even if we don't call this code

    //TODO: pubsub update
    
  },
  clear: function(context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    //store in memory 
    memory[context] = {};  //if this is activated server is twice slower even if we don't call this code

    //TODO: pubsub update
    
  },
  debug: function(context) {

    if ( memory[context] == null ) { memory[context] = {}; }

    console.log(memory);
    
  }
}
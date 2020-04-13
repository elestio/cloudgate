const memory = {}

module.exports = {
  getObject: function(key, finalKey) {
    //TODO: think about expires / refresh
    //console.log(memory[key]);
    if ( memory[key] != null ){
        //console.log("cached: " + key)
        //return JSON.parse(memory[key]); //JSON.parse is SUUUUPER slow, let's avoid it by storing objects pre parsed in memory!        
        return memory[key];         
    }
    else{
        return null;
    }
  },
  setObject: function(key, value) {

    //store in memory
    memory[key] = value; 

    //TODO: pubsub update for other nodes

  },
  get: function(key, finalKey) {
    if ( memory[key] != null ){
        return memory[key];         
    }
    else{
        return null;
    }
    
    
  },
  set: function(key, value) {

    //store in memory 
    memory[key] = value;  //if this is activated server is twice slower even if we don't call this code

    //TODO: pubsub update
    
  }
}
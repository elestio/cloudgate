const memory = {};
module.exports = {
  get: function(key) {
    return memory[key];
  },
  set: function(key, value) {
    memory[key] = value;
  },
}
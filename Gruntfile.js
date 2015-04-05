var _ = require('lodash');
var crawler = require('./src/crawler.js');

module.exports = function(grunt) {
  function getElectionId() {
    var id = grunt.option('election-id');
    if(!id) {
      throw new Error ('No election id provided');
    }
    return id;
  }

  function registerTasks(object, outerKeys) {
    _.each(object, function(value, key) {
      var keys = (outerKeys || []).concat([key]);
      if(_.isFunction(value)) {
        grunt.registerTask('fetch:' + keys.join(':'), value.help, function() {
          var done = this.async();

          value(getElectionId()).then(function(rows) {
            console.log(rows);
            done();
          });
        });
      }
      else {
        registerTasks(value, keys);
      }
    });
  }
  registerTasks(crawler);

};

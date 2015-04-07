var _ = require('lodash');
var fs = require('fs');
var crawler = require('./src/crawler.js');
var geo = require('./src/geo.js');

module.exports = function(grunt) {
  function getElectionId() {
    var id = grunt.option('election-id');
    if(!id) {
      throw new Error ('No election id provided');
    }
    return id;
  }

  var resultsDir = './data/results/';
  function registerTasks(object, outerKeys) {
    _.each(object, function(value, key) {
      var keys = (outerKeys || []).concat([key]);
      if(_.isFunction(value)) {
        grunt.registerTask('fetch:' + keys.join(':'), value.help, function() {
          var done = this.async();

          var electionId = getElectionId();
          value(electionId).then(function(result) {
            fs.writeFile(
              resultsDir + electionId + '_' + keys.join('_') + '.json',
              JSON.stringify(result, null, 2), 
              done
            );
          });
        });
      }
      else {
        registerTasks(value, keys);
      }
    });
  }
  registerTasks(crawler);

  grunt.registerTask('meta:fetch:geography', 'fetches meta data about zh election geography', function() {
    geo.fetch().then(this.async()).done();
  });

  grunt.registerTask('meta:status:geography', 'shows status of geo index', function() {
    var done = this.async();

    var index = geo.index();
    console.log('The are ' + Object.keys(index).length + ' areas indexed.');
  });

};

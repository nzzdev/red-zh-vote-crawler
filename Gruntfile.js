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

  function registerTasks(object, outerKeys) {
    _.each(object, function(value, key) {
      var keys = (outerKeys || []).concat([key]);
      if(_.isFunction(value)) {
        grunt.registerTask('fetch:' + keys.join(':'), value.help, function() {
          var done = this.async();

          value(getElectionId()).then(function(rows) {
            console.log(JSON.stringify(rows, null, 2));
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

  var metaDir = './data/meta/';
  var topojsonFilePath = metaDir + 'geo_source.json';
  grunt.registerTask('meta:fetch:geography', 'fetches meta data zh election geography', function() {
    var done = this.async();
    geo.fetch().then(function(data) {
      fs.writeFile(topojsonFilePath, data, done)
    });
  });

  grunt.registerTask('meta:prepare:geography', 'prepare meta data zh election geography', function() {
    var done = this.async();

    var index = geo.cleanAndIndex(require(topojsonFilePath));
    console.log('indexed ' + Object.keys(index).length + ' areas');

    fs.writeFile(metaDir + 'geo_index.json', JSON.stringify(index, null, 2), done);
  });

};

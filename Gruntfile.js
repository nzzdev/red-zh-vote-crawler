var _ = require('lodash');
var fs = require('fs');
var crawler = require('./src/crawler.js');
var geo = require('./src/geo.js');

module.exports = function(grunt) {
  function getParam(key) {
    var value = grunt.option(key);
    if(!value) {
      throw new Error ('missing parameter ' + key);
    }
    return value;
  }

  var resultsDir = './data/results/';
  function registerTasks(object, outerKeys) {
    _.each(object, function(value, key) {
      var keys = (outerKeys || []).concat([key]);
      if(_.isFunction(value)) {
        grunt.registerTask('fetch:' + keys.join(':'), value.help, function() {
          var done = this.async();

          var args = ['election-id'].concat(value.params || []).map(function(key) {
            return getParam(key);
          });

          value.apply(value, args).then(function(result) {
            fs.writeFile(
              resultsDir + args[0] + '_' + keys.join('_') + '.json',
              JSON.stringify(result, null, 2), 
              done
            );
          }).done();
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

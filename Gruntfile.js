var fetcher = require('./src/fetcher.js');
var converter = require('./src/converter.js');

module.exports = function(grunt) {
  grunt.registerTask('fetch', 'test', function() {
    var done = this.async();
    var url = 'http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_kanton';

    fetcher.html(url).then(function($) {
      var rows = converter.cheerioTable($, $('table').last());
      console.log(rows);
      done();
    });
  });
};

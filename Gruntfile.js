var fetcher = require('./src/fetcher.js');
var converter = require('./src/converter.js');

module.exports = function(grunt) {
  grunt.registerTask('fetch:test:simple', 'fetches a simple html table', function() {
    var done = this.async();
    var url = 'http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_kanton';

    fetcher.html(url).then(function($) {
      var rows = converter.cheerioTable($, $('table').last());
      console.log(rows);
      done();
    });
  });


  grunt.registerTask('fetch:test:colspan', 'fetches a html table with colspan', function() {
    var done = this.async();
    var url = 'http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_wk&wk=a';

    fetcher.html(url).then(function($) {
      var rows = converter.cheerioTable($, $('table').last());
      console.log(rows);
      done();
    });
  });


  grunt.registerTask('fetch:test:classes', 'fetches a html table with classified rows', function() {
    var done = this.async();
    var url = 'http://www.wahlen.zh.ch/wahlen/rr2015_preview/viewer.php?table=kandkanton';

    fetcher.html(url).then(function($) {
      var rows = converter.cheerioTable($, $('table').eq(-2)).slice(0, -1);
      console.log(rows);
      done();
    });
  });
};

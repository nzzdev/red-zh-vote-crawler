var Q = require('q');
var fetcher = require('./fetcher.js');
var converter = require('./converter.js');

var baseUrl = 'http://www.wahlen.zh.ch/wahlen/';

function htmlFetch(url, transformer) {
  var deferred = Q.defer();

  fetcher.html(baseUrl + url).then(function($) {
    deferred.resolve(transformer($));
  }, function(failure) {
    deferred.reject(failure);
  }).done();

  return deferred.promise;
}

module.exports.lists = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_kanton', function($) {
      var rows = converter.cheerioTable($, $('table').last());

      return rows;
    });
  },
  constituencies: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_wk&wk=a', function($) {
      var rows = converter.cheerioTable($, $('table').last());

      return rows;
    });
  }
};

module.exports.exe = {
  candidates: {
    canton: function(electionId) {
      return htmlFetch(electionId + '/viewer.php?table=kandkanton', function($) {
        var rows = converter.cheerioTable($, $('table').eq(-2)).slice(0, -1);

        return rows;
      });
    }
  }
};

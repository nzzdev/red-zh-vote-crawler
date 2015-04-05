var Q = require('q');
var d3 = require('d3');
var fetcher = require('./fetcher.js');
var converter = require('./converter.js');
var transformer = require('./transformer.js');

var baseUrl = 'http://www.wahlen.zh.ch/wahlen/';
var utcTime = d3.time.format.iso;

function htmlFetch(url, convert) {
  var deferred = Q.defer();

  url = baseUrl + url;
  fetcher.html(url).then(function($) {
    deferred.resolve(convert($, url));
  }, function(failure) {
    deferred.reject(failure);
  }).done();

  return deferred.promise;
}

var lists = module.exports.lists = {
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
lists.canton.help = 'fetches list results';
lists.constituencies.help = 'fetches list results in constituencies';

var exe = module.exports.exe = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?table=kandkanton', function($, url) {
      var rows = converter.cheerioTable($, $('table').eq(-2)).slice(0, -1);

      var resultSet = {
        source: converter.rrMeta($, electionId, url),
        results: transformer.rr.kandkanton(rows)
      };

      return resultSet;
    });
  },
  areas: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?table=kandgemeinden', function($, url) {
      var rows = converter.cheerioTableArrays($, $('table').eq(-2)).slice(0, -1);

      rows = converter.rows.rmRepeatHeaders(rows);
      rows[0][0].text = 'area';
      rows = rows.filter(function(row) {
        return !row[0].text.match(/^\s*Bezirk/);
      });
      rows = converter.rows.toObjects(rows);

      var resultSet = {
        source: converter.rrMeta($, electionId, url),
        results: transformer.rr.kandgemeinden(rows)
      };

      return resultSet;
    });
  }
};
exe.canton.help = 'fetches executive candidate results';



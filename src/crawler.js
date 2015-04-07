var Q = require('q');
var d3 = require('d3');
var _ = require('lodash');
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

function verifyYears(row, years) {
  years.forEach(function(value) {
    if(!_.some(row, function(column) {
      return column.text.match(value);
    })) {
      throw new Error('invalid year ' + value);
    }
  });
}

var leg = module.exports.leg = {};

var lists = leg.lists = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_kanton', function($, url) {
      var rows = converter.cheerioTable($, $('table').last());

      var resultSet = {
        source: converter.krMeta($, {electionId: electionId, urls: [url]}),
        results: transformer.kr.listen_kanton(rows)
      };

      return resultSet;
    });
  },
  constituencies: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_wk&wk=a', function($, url) {
      var rows = converter.cheerioTable($, $('table').last());

      var resultSet = {
        source: converter.krMeta($, {electionId: electionId, urls: [url]}),
        results: transformer.kr.listen_wk_a(rows)
      };

      return resultSet;
    });
  },
  comparison: {
    canton: function(electionId, year, previousYear) {
      return htmlFetch(electionId + '/viewer.php?menu=listen_vergleich_kanton', function($, url) {
        var rows = converter.cheerioTableArrays($, $('table').eq(-3));

        var preHeader = rows.shift();

        verifyYears(rows[0], [year, previousYear]);

        rows[0].forEach(function(column, i) {
          column.text = (preHeader[i].rawText + ' ' + column.text)
            .trim()
            .replace(/\s+/g, ' ');
        });

        rows = converter.rows.toObjects(rows);

        var resultSet = {
          source: converter.krMeta($, {
            electionId: electionId,
            urls: [url],
            year: year,
            previousYear: previousYear
          }),
          results: transformer.kr.listen_vergleich_kanton(rows, year, previousYear)
        };

        return resultSet;
      });
    },
    constituencies: {
      percent: function(electionId, year, previousYear) {
        return htmlFetch(electionId + '/viewer.php?menu=listen_vergleich_wk&wk=a', function($, url) {
          var rows = converter.cheerioTable($, $('table').eq(-2));

          verifyYears([{text: rows[1]['Wahlkreis und Auszählstand 3']}], [year, previousYear]);

          var resultSet = {
            source: converter.krMeta($, {
              electionId: electionId,
              urls: [url],
              year: year,
              previousYear: previousYear
            }),
            results: transformer.kr.listen_vergleich_wk_a(rows, year, previousYear)
          };

          return resultSet;
        });
      },
      seats: function(electionId, year, previousYear) {
        return htmlFetch(electionId + '/viewer.php?menu=sitzzuteilung_vergleich', function($, url) {
          var rows = converter.cheerioTableArrays($, $('table').eq(-2));

          // rm double header row
          rows.shift(); 

          // add header label where missing
          rows[0][0].text = 'area';
          rows[0][1].text = 'labels';

          verifyYears([rows[1][1]], [year, previousYear]);

          rows = converter.rows.toObjects(rows);
          rows = converter.rows.flatten(rows);

          // rm canton row
          rows.shift();

          var resultSet = {
            source: converter.krMeta($, {
              electionId: electionId,
              urls: [url],
              year: year,
              previousYear: previousYear
            }),
            results: transformer.kr.sitzzuteilung_vergleich(rows, year, previousYear)
          };

          return resultSet;
        });
      }
    }
  }
};
lists.canton.help = 'fetches list results';
lists.constituencies.help = 'fetches list results in constituencies';

lists.comparison.canton.help = 'fetches list results including comparisons to previous results';
lists.comparison.canton.params = ['year', 'previous-year'];

lists.comparison.constituencies.percent.help = 'fetches list results in constituencies including percent comparisons to previous results';
lists.comparison.constituencies.percent.params = ['year', 'previous-year'];

lists.comparison.constituencies.seats.help = 'fetches list results in constituencies including seats comparisons to previous results';
lists.comparison.constituencies.seats.params = ['year', 'previous-year'];


leg.candidates = function(electionId) {
  return htmlFetch(electionId + '/viewer.php?menu=kand_kanton', function($, url) {
    var rows = converter.cheerioTable($, $('table').last());

    var resultSet = {
      source: converter.krMeta($, {electionId: electionId, urls: [url]}),
      results: transformer.kr.kand_kanton(rows)
    };

    return resultSet;
  });
}

var exe = module.exports.exe = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?table=kandkanton', function($, url) {
      var rows = converter.cheerioTable($, $('table').eq(-2)).slice(0, -1);

      var resultSet = {
        source: converter.rrMeta($, {electionId: electionId, urls: [url]}),
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
        source: converter.rrMeta($, {electionId: electionId, urls: [url]}),
        results: transformer.rr.kandgemeinden(rows)
      };

      return resultSet;
    });
  }
};
exe.canton.help = 'fetches executive candidate results';
exe.areas.help = 'fetches executive candidate results in all areas';



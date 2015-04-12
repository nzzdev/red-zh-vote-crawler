var Q = require('q');
var d3 = require('d3');
var _ = require('lodash');
var fs = require('fs');

var fetcher = require('./fetcher.js');
var converter = require('./converter.js');
var transformer = require('./transformer.js');
var aggregater = require('./aggregater.js');

var baseUrl = 'http://www.wahlen.zh.ch/wahlen/';
var utcTime = d3.time.format.iso;

var loginString = '';
if(process.env.ZH_VOTE_CRAWLER_USER && process.env.ZH_VOTE_CRAWLER_PW) {
  loginString = '&u=' + process.env.ZH_VOTE_CRAWLER_USER + '&p=' + process.env.ZH_VOTE_CRAWLER_PW;
}

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

var resultsDir = './data/results/';
function loadLocally(electionId, keys) {
  var deferred = Q.defer();

  var filePath = resultsDir + electionId + '_' + keys.join('_') + '.json';
  fs.readFile(filePath, {encoding: 'utf8'}, function(err, data) {
    if(err) throw err;

    deferred.resolve(JSON.parse(data));
  });

  return deferred.promise;
}

var leg = module.exports.leg = {};

var lists = leg.lists = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_kanton' + loginString, function($, url) {
      var rows = converter.cheerioTable($, $('table').last());

      var resultSet = {
        source: converter.krMeta($, {electionId: electionId, urls: [url]})
      };
      _.extend(resultSet, transformer.kr.listen_kanton(rows));

      return resultSet;
    });
  },
  constituencies: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?menu=listen_wk&wk=a' + loginString, function($, url) {
      var rows = converter.cheerioTable($, $('table').last());

      var resultSet = {
        source: converter.krMeta($, {electionId: electionId, urls: [url]})
      };
      _.extend(resultSet, transformer.kr.listen_wk_a(rows));

      return resultSet;
    });
  },
  comparison: {
    canton: function(electionId, year, previousYear) {
      return htmlFetch(electionId + '/viewer.php?menu=listen_vergleich_kanton' + loginString, function($, url) {
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
          })
        };
        _.extend(resultSet, transformer.kr.listen_vergleich_kanton(rows, year, previousYear));

        return resultSet;
      });
    },
    constituencies: {
      percent: function(electionId, year, previousYear) {
        return htmlFetch(electionId + '/viewer.php?menu=listen_vergleich_wk&wk=a' + loginString, function($, url) {
          var rows = converter.cheerioTable($, $('table').eq(-2));

          verifyYears([{text: rows[1]['Wahlkreis und Auszählstand 3']}], [year, previousYear]);

          var resultSet = {
            source: converter.krMeta($, {
              electionId: electionId,
              urls: [url],
              year: year,
              previousYear: previousYear
            })
          };
          _.extend(resultSet, transformer.kr.listen_vergleich_wk_a(rows, year, previousYear));

          return resultSet;
        });
      },
      seats: function(electionId, year, previousYear) {
        return htmlFetch(electionId + '/viewer.php?menu=sitzzuteilung_vergleich' + loginString, function($, url) {
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
            })
          };
          _.extend(resultSet, transformer.kr.sitzzuteilung_vergleich(rows, year, previousYear));

          return resultSet;
        });
      }
    }
  },
  combined: function(electionId, year, previousYear) {
    var deferred = Q.defer();

    Q.all([
      lists.canton(electionId),
      lists.comparison.canton(electionId, year, previousYear),
      lists.constituencies(electionId),
      lists.comparison.constituencies.percent(electionId, year, previousYear),
      lists.comparison.constituencies.seats(electionId, year, previousYear)
    ]).then(function(resultSets) {
      var lists = resultSets[0];
      lists.source.year = year;
      lists.source.previousYear = previousYear;
      var listsComparison = resultSets[1];

      var listsConstituencies = resultSets[2];
      listsConstituencies.source.year = year;
      listsConstituencies.source.previousYear = previousYear;
      var listsConstituenciesCompPercent = resultSets[3];
      var listsConstituenciesCompSeats = resultSets[4];

      var resultSet = {
        source: aggregater.source(
          aggregater.source(lists.source, listsComparison.source),
          aggregater.source(listsConstituencies.source, 
            aggregater.source(listsConstituenciesCompPercent.source, listsConstituenciesCompSeats.source)
          )
        ),
        // meta: lists.meta,
        results: []
          .concat(aggregater.mergeResults(
            lists.results.concat(listsComparison.results)
          ))
          .concat(aggregater.mergeResults(
            listsConstituencies.results
              .concat(listsConstituenciesCompPercent.results)
              .concat(listsConstituenciesCompSeats.results)
          ))
      };

      if(!resultSet.source) {
        deferred.reject('results can\'t be combined because of different source states', canton.source, areas.source);
      }
      else {
        deferred.resolve(resultSet);
      }
    }).done();

    return deferred.promise;
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

lists.combined.help = '';
lists.combined.params = ['year', 'previous-year'];


leg.candidates = function(electionId) {
  return htmlFetch(electionId + '/viewer.php?menu=kand_kanton' + loginString, function($, url) {
    var rows = converter.cheerioTable($, $('table').last());

    var resultSet = {
      source: converter.krMeta($, {electionId: electionId, urls: [url]})
    };
    _.extend(resultSet, transformer.kr.kand_kanton(rows));

    return resultSet;
  });
}

var exe = module.exports.exe = {
  canton: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?table=kandkanton' + loginString, function($, url) {
      var rows = converter.cheerioTable($, $('table').eq(-2)).slice(0, -1);

      var resultSet = {
        source: converter.rrMeta($, {electionId: electionId, urls: [url]})
      };
      _.extend(resultSet, transformer.rr.kandkanton(rows));

      return resultSet;
    });
  },
  areas: function(electionId) {
    return htmlFetch(electionId + '/viewer.php?table=kandgemeinden' + loginString, function($, url) {
      var rows = converter.cheerioTableArrays($, $('table').eq(-2)).slice(0, -1);

      rows = converter.rows.rmRepeatHeaders(rows);
      rows[0][0].text = 'area';
      rows = rows.filter(function(row) {
        return !row[0].text.match(/^\s*Bezirk/);
      });
      rows = converter.rows.toObjects(rows);

      var resultSet = {
        source: converter.rrMeta($, {electionId: electionId, urls: [url]})
      };
      _.extend(resultSet, transformer.rr.kandgemeinden(rows));

      return resultSet;
    });
  },
  combined: function(electionId) {
    var deferred = Q.defer();

    Q.all([
      exe.canton(electionId),
      exe.areas(electionId)
    ]).then(function(resultSets) {
      var canton = resultSets[0];
      var areas = resultSets[1];

      var resultSet = {
        source: aggregater.source(canton.source, areas.source),
        meta: canton.meta,
        results: []
          .concat(canton.results)
          .concat(aggregater.areasToConstituencies(areas.results))
          .concat(areas.results)
      };

      if(!resultSet.source) {
        deferred.reject('results can\'t be combined because of different source states', canton.source, areas.source);
      }
      else {
        deferred.resolve(resultSet);
      }
    }).done();

    return deferred.promise;
  }
};

exe.canton.help = 'fetches executive candidate results';
exe.areas.help = 'fetches executive candidate results in all areas';



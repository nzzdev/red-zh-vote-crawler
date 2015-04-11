var _ = require('lodash');
var d3 = require('d3');
var geo = require('./geo');

var classifications = {
  nonessential: ['urls', 'fetched', 'aggregated']
}

function essentialSource(source) {
  return _.omit(source, classifications.nonessential);
}

var utcTime = d3.time.format.iso;
module.exports.source = function(source1, source2) {
  if(!_.isEqual(essentialSource(source1), essentialSource(source2))) {
    console.warn('essential source properties do not match', source1, source2);
    return false;
  }

  var urls = [].concat(source1.urls).concat(source2.urls);
  var source = {};
  _.extend(source, source1);
  _.extend(source, source2);
  source.urls = urls;

  source.aggregated = utcTime(new Date());
  delete source.fetched;

  return source;
}

module.exports.areasToConstituencies = function(results) {
  var geoIndex = geo.index();
  return d3.nest()
    .key(function(d) {
      var constituencyId = geo.areaToConstituencyId(d.geography.id);
      if(!constituencyId) {
        console.warn('unrecognised area', d.geography, d.id);
        constituencyId = 'unkown';
      }
      return [d.id, constituencyId].join('|');
    })
    .rollup(function(values) {
      var aggregate = {};
      _.extend(aggregate, _.pick(values[0], ['id', 'type', 'name']))

      var geoId = geo.areaToConstituencyId(values[0].geography.id);
      var geography = aggregate.geography = {
        id: geoId,
        type: geoId ? 'constituency' : 'unkown'
      };

      var valuesWithVotes = values.filter(function(d) {
        return d.votes !== null;
      });
      aggregate.votes =  d3.sum(valuesWithVotes, function(d) { return d.votes; });

      var area = geography.area = [valuesWithVotes.length, values.length];
      geography.complete = area[0] === area[1];

      return aggregate;
    })
    .entries(results)
    .map(function(d) {
      return d.values;
    });
};

module.exports.mergeResults = function(results) {
  return d3.nest()
    .key(function(d) {
      return [d.type, d.id, d.geography.type, d.geography.id].join('|');
    })
    .rollup(function(values) {
      var aggregate = {
        geography: {}
      };
      values.forEach(function(value) {
        _.extend(aggregate.geography, value.geography);
        _.extend(aggregate, _.omit(value, 'geography'));
      });
      return aggregate;
    })
    .entries(results)
    .map(function(d) {
      return d.values;
    });
}

module.exports.addResultMeta = function(results, metaSource, keys) {
  return results;
}

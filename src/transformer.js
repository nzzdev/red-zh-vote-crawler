var _ = require('lodash');
var inflector = require('inflected');
var slug = require('slug');
var geo = require('./geo');

inflector.transliterations('de', function(t) {
  t.approximate('ü', 'ue');
  t.approximate('ö', 'oe');
  t.approximate('ä', 'ae');
  t.approximate('ß', 'ss');
});

function transliterateGerman(text) {
  return inflector.transliterate(text, {locale: 'de', replacement: ' '});
}

function normalizeId(input) {
  return slug(transliterateGerman(input)).toLowerCase();
}

function normalizeZhGeoName(input) {
  return input
    .replace(/Kreis (\d+)\+(\d+)/, function(match, kr1, kr2) { return 'Kreis ' + kr1 + ' und ' + kr2; })
    .replace(/ \(?ZH\)?\s*$/, '')
    .replace('a.d.', ' an der ')
    .replace('W\'thur', 'Winterthur')
    .replace('O\'Winterthur', 'Oberwinterthur')
    .replace(/ bei [^ ]+$/, '')
    .replace(/\s+/g, ' ');
}

module.exports.normalizeZhGeoName = normalizeZhGeoName;
module.exports.normalizeId = normalizeId;

var rr = {
  candidateId: normalizeId,
  kandkanton: function(rows) {
    var candidates = rows.map(function(row) {
      var candidate = {
        id: rr.candidateId(row.Name),
        type: 'candidate',
        name: row.Name,
        party: row.Partei,
        incumbent: row.Bisher === 'bisher',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        majority: +row['abs. Mehr'],
        votesAbs: +row.Stimmen,
        elected: row.classes.indexOf('gewaehlt') !== -1
      };
      candidate.hasMajority = candidate.majority <= candidate.votesAbs;
      return candidate;
    });

    return candidates;
  },
  kandgemeinden: function(rows) {
    var results = [];

    var geoIndex = geo.index();
    rows.forEach(function(row) {
      var name = normalizeZhGeoName(row.area.text);
      var area = geoIndex[normalizeId(name)];
      if(!area) {
        console.warn('unrecognised area', name, row);
        return;
      }
      _.each(_.omit(row, 'area'), function(value, name) {
        results.push({
          id: rr.candidateId(name),
          type: 'candidate',
          name: name,
          geography: {
            id: area.bfsk,
            type: 'area'
          },
          votesAbs: +value.text,
          majority: value.classes.indexOf('cellquorum') !== -1
        });
      });
    });

    return results;
  }
};

module.exports.rr = rr;
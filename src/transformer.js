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

function normalizeNum(input) {
  input = (input || '').trim();
  return input === '' ? undefined : +input;
}

module.exports.normalizeZhGeoName = normalizeZhGeoName;
module.exports.normalizeId = normalizeId;

var rr = {
  candidateId: normalizeId,
  kandkanton: function(rows) {
    var meta = [];
    var results = rows.map(function(row) {
      var id = rr.candidateId(row.Name);
      var candidate = {
        id: id,
        type: 'candidate',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        majority: normalizeNum(row['abs. Mehr']),
        votes: normalizeNum(row.Stimmen),
        elected: row.classes.indexOf('gewaehlt') !== -1
      };
      meta.push({
        id: id,
        type: 'candidate',
        name: row.Name,
        party: row.Partei,
        incumbent: row.Bisher === 'bisher',
      });
      candidate.hasMajority = candidate.majority <= candidate.votes;
      return candidate;
    });

    return {
      meta: meta,
      results: results
    };
  },
  kandgemeinden: function(rows) {
    var results = [];
    var meta = [];

    var geoIndex = geo.index();
    rows.forEach(function(row) {
      var geoName = normalizeZhGeoName(row.area.text);
      var area = geoIndex[normalizeId(geoName)];
      if(!area) {
        console.warn('unrecognised area', geoName, row);
        return;
      }
      _.each(_.omit(row, 'area'), function(value, name) {
        var id = rr.candidateId(name);
        results.push({
          id: id,
          type: 'candidate',
          geography: {
            id: area.bfsk,
            type: 'area'
          },
          votes: normalizeNum(value.text),
          majority: value.classes.indexOf('cellquorum') !== -1
        });
        meta.push({
          id: id,
          type: 'candidate',
          name: name
        });
      });
    });

    return {
      meta: _.uniq(meta, 'id'),
      results: results
    };
  }
};
module.exports.rr = rr;


var kr = {
  kand_kanton: function(rows) {
    var meta = [];

    var results = rows.map(function(row) {
      var id = [row.Wk, row.Nr].join('-');
      var candidate = {
        id: id,
        type: 'candidate',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        votes: normalizeNum(row.Stimmen),
        elected: row['Gew./Abg.'] === 'gewählt'
      };
      meta.push({
        id: id,
        type: 'candidate',
        party: row['Listenbez.'],
        name: [row.Vorname, row.Name].join(' '),
        occupation: row.Beruf,
        birthyear: row.Jahrgang,
        residence: row.Wohnort,
        incumbent: row.Bisher === 'bisher',
      });
      return candidate;
    });

    return {
      meta: meta,
      results: results
    };
  },
  listen_kanton: function(rows) {
    var lists = rows.map(function(row) {
      var list = {
        id: row['Listen Bez.'],
        type: 'list',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        votes: normalizeNum(row.Stimmen),
        voters: normalizeNum(row['Wählerzahl']),
        votersPercent: normalizeNum(row['Wähleranteil %']),
        seats: normalizeNum(row['Anzahl Sitze'])
      };
      return list;
    });

    return {
      results: lists
    };
  },
  listen_vergleich_kanton: function(rows, year, previousYear) {
    var lists = rows.map(function(row) {
      var list = {
        id: row['Listen-Bezeichnung'].text,
        type: 'list',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        votersPercent: normalizeNum(row['% Wähleranteil ' + year].text),
        previousVotersPercent: normalizeNum(row['% Wähleranteil ' + previousYear].text),
        seats: normalizeNum(row['Sitze ' + year].text),
        previousSeats: normalizeNum(row['Sitze ' + previousYear].text)
      };
      return list;
    });

    return {
      results: lists
    };
  },
  helpers: {
    getLists: function(row, extraOmittances) {
      return _.omit(_.omit(row, 'classes', extraOmittances), function(value, key) {
        return !!key.match(/^Wahlkreis und Auszählstand/);
      });
    },
    multiLineIndex: function(labelCell) {
      var keys = {};
      labelCell.trim().split("\n").forEach(function(key, i) {
        keys[key.trim()] = i;
      });
      return keys;
    }
  },
  listen_wk_a: function(rows) {
    var results = [];

    rows.forEach(function(row, i) {
      var geography = {
        id: i + 1,
        type: 'constituency'
      }

      var lists = kr.helpers.getLists(row);
      var keys = kr.helpers.multiLineIndex(row['Wahlkreis und Auszählstand 3']);
      _.each(lists, function(values, id) {
        values = values.trim().split("\n");
        results.push({
          id: id,
          type: 'list',
          geography: geography,
          votes: normalizeNum(values[keys['Stimmen absolut']]),
          voters: normalizeNum(values[keys['Wählerzahl']]),
          votesPercent: normalizeNum(values[keys['Stimmen %']])
        });
      });
    });

    return {
      results: results
    };
  },
  listen_vergleich_wk_a: function(rows, year, previousYear) {
    var results = [];

    rows.forEach(function(row, i) {
      var geography = {
        id: i + 1,
        type: 'constituency'
      }

      var lists = kr.helpers.getLists(row);
      var keys = kr.helpers.multiLineIndex(row['Wahlkreis und Auszählstand 3']);
      _.each(lists, function(values, id) {
        values = values.split("\n");
        results.push({
          id: id,
          type: 'list',
          geography: geography,
          votesPercent: normalizeNum(values[keys['% Stimmen ' + year]]),
          previousVotesPercent: normalizeNum(values[keys['% Stimmen ' + previousYear]])
        });
      });
    });

    return {
      results: results
    };
  },
  sitzzuteilung_vergleich: function(rows, year, previousYear) {
    var results = [];

    rows.forEach(function(row, i) {
      var geography = {
        id: i + 1,
        type: 'constituency'
      }

      var lists = kr.helpers.getLists(row, ['Total', 'area', 'labels']);
      var keys = kr.helpers.multiLineIndex(row.labels);
      _.each(lists, function(values, id) {
        values = values.trim().split("\n");
        results.push({
          id: id.trim(),
          type: 'list',
          geography: geography,
          seats: normalizeNum(values[keys['Sitze ' + year]]),
          previousSeats: normalizeNum(values[keys['Sitze ' + previousYear]])
        });
      });
    });

    return {
      results: results
    };
  }
}
module.exports.kr = kr;


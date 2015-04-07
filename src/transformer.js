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
        majority: normalizeNum(row['abs. Mehr']),
        votes: normalizeNum(row.Stimmen),
        elected: row.classes.indexOf('gewaehlt') !== -1
      };
      candidate.hasMajority = candidate.majority <= candidate.votes;
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
          votes: normalizeNum(value.text),
          majority: value.classes.indexOf('cellquorum') !== -1
        });
      });
    });

    return results;
  }
};
module.exports.rr = rr;


var kr = {
  kand_kanton: function(rows) {
    var candidates = rows.map(function(row) {
      var candidate = {
        id: [row.Wk, row.Nr].join('-'),
        type: 'candidate',
        name: [row.Vorname, row.Name].join(' '),
        party: row['Listenbez.'],
        incumbent: row.Bisher === 'bisher',
        geography: {
          id: 'zh',
          type: 'canton'
        },
        votes: normalizeNum(row.Stimmen),
        elected: row['Gew./Abg.'] === 'gewählt'
      };
      return candidate;
    });

    return candidates;
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
        percent: normalizeNum(row['Wähleranteil %']),
        seats: normalizeNum(row['Anzahl Sitze'])
      };
      return list;
    });

    return lists;
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
        percent: normalizeNum(row['% Wähleranteil ' + year].text),
        previousPercent: normalizeNum(row['% Wähleranteil ' + previousYear].text),
        seats: normalizeNum(row['Sitze ' + year].text),
        previousSeats: normalizeNum(row['Sitze ' + previousYear].text)
      };
      return list;
    });

    return lists;
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
          percent: normalizeNum(values[keys['Stimmen %']])
        });
      });
    });

    return results;
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
          percent: normalizeNum(values[keys['% Stimmen ' + year]]),
          previousPercent: normalizeNum(values[keys['% Stimmen ' + previousYear]])
        });
      });
    });

    return results;
  },
  sitzzuteilung_vergleich: function(rows, year, previousYear) {
    var results = [];

    rows.forEach(function(row, i) {
      var geography = {
        id: i + 1,
        type: 'constituency',
        name: row.area.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')
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

    return results;
  }
}
module.exports.kr = kr;


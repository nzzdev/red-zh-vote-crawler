var _ = require('lodash');
var fs = require('fs');

var fetcher = require('./fetcher.js');
var transformer = require('./transformer.js');

module.exports.fetch = function(argument) {
  return fetcher.get({
    url: 'http://www.statistik.zh.ch/content/dam/justiz_innern/statistik/W_A/wahlen/Wahljahr%202015/KRW2015/GemeindenWahlkreise_KR2015.json'
  });
}

module.exports.cleanAndIndex = function(topojson) {
  var index = {};

  var ignoreSourceId = [  // Fromat: wk + '-' + bfsk
    '15-2302', // Oberwinterthur is always city
    '14-226' // Schlatt is always country
  ];

  topojson.objects.overlay_merge2.geometries.filter(function(d) {
    return d.properties.BFS !== 0 && d.properties.Wahlkreise !== null;;
  }).forEach(function(geometry) {
    var properties = geometry.properties;
    var name = transformer.normalizeZhGeoName(properties.NAME);
    var key = transformer.normalizeId(name);

    var resolution = {
      name: name,
      wk: properties.Wahlkrei_1,
      bfs: properties.BFS,
      bfsk: properties.BFSK
    };

    if(ignoreSourceId.indexOf(resolution.wk + '-' + resolution.bfsk) !== -1) {
      return;
    }

    if(index[key] && !_.isEqual(resolution, index[key])) {
      console.warn('conflicting key', key, resolution, index[key], properties);
    }
    else {
      index[key] = resolution;
    }
  });

  return index;
}
var _ = require('lodash');
var fs = require('fs');
var stripBom = require('strip-bom');

var fetcher = require('./fetcher.js');
var transformer = require('./transformer.js');

var topojsonFilePath = __dirname + '/../data/meta/geo_source.json';

module.exports.fetch = function(argument) {
  return fetcher.get({
    url: 'http://www.statistik.zh.ch/content/dam/justiz_innern/statistik/W_A/wahlen/Wahljahr%202015/KRW2015/GemeindenWahlkreise_KR2015.json'
  }).then(function(data) {
    fs.writeFileSync(topojsonFilePath, stripBom(data));
  });
}

module.exports.index = function() {
  var index = {};

  var topojson = JSON.parse(stripBom(fs.readFileSync(topojsonFilePath, {encoding: 'utf8'})));

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

    if(index[key]) {
      console.warn('conflicting key', key, resolution, index[key], properties);
    }
    else {
      index[key] = resolution;
    }
  });

  return index;
}
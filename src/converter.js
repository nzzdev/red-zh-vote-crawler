var _ = require('lodash');
var d3 = require('d3');

function toArrays($, $table) {
  var rows = [];
  $table.find('tr').each(function(i) {
    var columns = [];

    $(this).find('td').each(function() {
      var column = {
        text: $(this).html($(this).html().replace(/<br>/g, "\n")).text(),
        classes: ($(this).attr('class') || '').split(' ')
      };

      var colspan = $(this).attr('colspan') || 1;
      for(var i = 1; i <= colspan; i++) {
        var clone = _.clone(column);
        clone.text += (i > 1 ? ' ' + i : '');
        columns.push(clone);
      }
    });
    rows.push(columns);
  });

  return rows;
}

function toObjects(rows) {
  var header = rows.shift();
  var objects = [];

  rows.forEach(function(row) {
    var object = {};
    row.forEach(function(column, i) {
      var key = (header[i] || {}).text;
      if(key) {
        object[key] = column;
      }
    });
    objects.push(object);
  });
  return objects;
}

function rmRepeatHeaders(rows) {
  var header = rows[0];
  return rows.filter(function(row, i) {
    return !i || !_.isEqual(row, header);
  });
}

module.exports.rows = {
  toObjects: toObjects,
  rmRepeatHeaders: rmRepeatHeaders
};
module.exports.cheerioTableArrays = toArrays;
module.exports.cheerioTable = function($, $table) {
  var rows = toObjects(toArrays($, $table));

  rows.forEach(function(row, i) {
    var classes = [];
    _.each(row, function(value, key) {
      classes.push(value.classes);
      row[key] = value.text;
    });
    row.classes = _.uniq(_.flatten(classes)).filter(Boolean);
  });

  return rows;
};

var utcTime = d3.time.format.iso;
var zhFormat = d3.time.format("%d.%m.%Y, %H:%M");
module.exports.rrMeta = function($, electionId, url) {
  var time = zhFormat.parse($('.time').last().text());
  var area = $('body').text().match(/(\d+) von (\d+) Gebieten/);

  return {
    time: utcTime(time),
    area: [+area[1], +area[2]],
    complete: area[1] === area[2],
    fetched: utcTime(new Date()),
    electionId: electionId,
    urls: [url]
  };
}

module.exports.krMeta = function($, electionId, url) {
  var statusLine = $('body').text().match(/Auszählstand\s+Kantonsratswahlen[^\n]+/)[0];
  var timeLine = statusLine.match(/am\s+(\d{2}.\d{2}.\d{4})\s+um\s+(\d{2}:\d{2})\s+Uhr/);
  var time = zhFormat.parse(timeLine[1] + ', ' + timeLine[2]);
  var area = statusLine.match(/(\d+) von (\d+) Gebieten/);

  return {
    time: utcTime(time),
    area: [+area[1], +area[2]],
    complete: area[1] === area[2] && statusLine.indexOf('definitives Endresultat') !== -1,
    fetched: utcTime(new Date()),
    electionId: electionId,
    urls: [url]
  };
}

var _ = require('lodash');

function toArrays($, $table) {
  var rows = [];
  $table.find('tr').each(function(i) {
    var columns = [];

    $(this).find('td').each(function() {
      var column = {
        text: $(this).text(),
        className: $(this).attr('class')
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
      object[header[i].text] = column;
    });
    objects.push(object);
  });
  return objects;
}

function raw($, $table) {
  return toObjects(toArrays($, $table));
}

module.exports.cheerioTableRaw = function($, $table) {
  return raw($, $table);
};
module.exports.cheerioTable = function($, $table) {
  var rows = raw($, $table);

  rows.forEach(function(row, i) {
    var classes = [];
    _.each(row, function(value, key) {
      classes.push(value.className.split(' '));
      row[key] = value.text;
    });
    row.classes = _.uniq(_.flatten(classes)).filter(Boolean);
  });

  return rows;
};

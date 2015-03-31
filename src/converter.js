var d3 = require('d3');
var _ = require('lodash');

module.exports.cheerioTable = function($, $table) {
  var rows = [];
  $table.find('tr').each(function(i) {
    var isHeader = i === 0;
    var columns = [], classes = [];

    $(this).find('td').each(function() {
      var text = $(this).text();
      var colspan = $(this).attr('colspan') || 1;
      for(var i = 1; i <= colspan; i++) {
        columns.push(text + (i > 1 ? ' ' + i : ''));
      }
      classes = classes.concat(($(this).attr('class') || '').split(' '));
    });

    if(isHeader) {
      columns.push('classes');
    }
    else {
      columns.push(_.uniq(classes).filter(Boolean).join(' '));
    }

    rows.push(columns);
  });

  var objects = d3.csv.parse(d3.csv.formatRows(rows));
  objects.forEach(function(object) {
    object.classes = object.classes.split(' ');
  });
  return objects;
};

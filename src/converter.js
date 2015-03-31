var d3 = require('d3');

module.exports.cheerioTable = function($, $table) {
  var rows = [];
  $table.find('tr').each(function() {
    var columns = [];
    $(this).find('td').each(function() {
      columns.push($(this).text());
    });
    rows.push(columns);
  });
  var csv = d3.csv.formatRows(rows);
  return d3.csv.parse(csv);
};

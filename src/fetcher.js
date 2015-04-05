var request = require('request');
var Q = require('q');
var cheerio = require('cheerio');

var Iconv  = require('iconv').Iconv;
var converter = new Iconv('ISO-8859-1', 'UTF-8');

// rate limiting with min timeout between requests
var requestQueue = Q(0);
var requestWait = 500; // ms

function get(options) {
  var deferred = Q.defer();
  requestQueue = requestQueue.then(function() {
    var requestDeferred = Q.defer();
    console.info('GET', options.url);
    request.get(options, function(error, response, data) {
      if(!error && response.statusCode === 200) {
        deferred.resolve(data);
      }
      else {
        deferred.reject({
          error: error,
          response: response,
          data: data
        });
      }
      setTimeout(function() {
        requestDeferred.resolve();
      }, requestWait);
    });
    return requestDeferred.promise;
  });
  return deferred.promise;
}

module.exports.get = get;
module.exports.html = function(url) {
  return get({url: url, encoding: null}).then(function(data) {
    return cheerio.load(converter.convert(data).toString());
  }, function(failure) {
    console.error(
      '=>',
      (failure.response || {}).statusCode,
      failure.error,
      failure.data
    );
    throw new Error('failed to fetch ' + url);
  });
}

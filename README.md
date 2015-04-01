# ZH Vote Crawler

*This is an unofficial crawler to retrieve data from the Statistical Office of the Kanton Zürich. No guarantees provided.*

The goal is to write a crawler to fetch and extract the html tables of [www.wahlen.zh.ch](http://www.wahlen.zh.ch/).

This crawler is intitially written for the cantonal election on April 12th 2015. But it may be useful thereafter aswell.

The two example pages of the two upcoming elections are:
- [Kantonsratswahlen](http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_kanton)
- [Regierungsratswahlen](http://www.wahlen.zh.ch/wahlen/rr2015_preview/viewer.php?table=kandkanton)

Links to the hot pages and data from it can not be published until the poles close at April 12th 12:00 PM.

## How to use

The crawler can be used via grunt or as a regular npm package.

### Grunt

All tasks require `--election-id` parameter.

```
grunt --help
```

#### Examples

```
grunt fetch:lists:canton --election-id=kr2011_medieninfo
grunt fetch:lists:constituencies --election-id=kr2011_medieninfo
grunt fetch:exe:canton --election-id=rr2015_preview
```


#### Never used npm and grunt?

[Install Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#osx) on your machine. Then install grunt globally and the dependencies locally.

```
npm install -g grunt-cli && npm install
```

### JavaScript

```
npm install zh-vote-crawler --save
```

The crawler always returns a `q` promise object. The crawler has a default waiting time of 500ms between requests and only runs one request at a time.

#### Examples

```
var crawler = require('zh-vote-crawler');

crawler.lists.canton('kr2011_medieninfo').then(function(rows) {
  console.log(rows);
});
crawler.lists.constituencies('kr2011_medieninfo').then(function(rows) {
  console.log(rows);
});
crawler.exe.canton('rr2015_preview').then(function(rows) {
  console.log(rows);
});
```


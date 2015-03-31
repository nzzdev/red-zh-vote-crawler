# ZH Vote Crawler

The goal is to write a crawler to fetch and extract the html tables of [www.wahlen.zh.ch](http://www.wahlen.zh.ch/).

This crawler is intitially written for the cantonal election on April 12th 2015. But it may be useful thereafter aswell.

The two example pages of the two upcoming elections are:
- [Kantonsratswahlen](http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_kanton)
- [Regierungsratswahlen](http://www.wahlen.zh.ch/wahlen/rr2015_preview/viewer.php?table=kandkanton)

Links to the hot pages and data from it can not be published until the poles close at April 12th 12:00 PM.

## Installation

This project is mainly based on following node.js packages: `request`, `cheerio`, `grunt` and `q`. For the complete list see `package.json`

### How to install

Install Node.js on your machine.

```
npm install
```

### How to use

The crawler can be used via grunt or as a regular npm package.

#### Grunt

All tasks require `--election-id` parameter.

```
grunt --help
```

##### Examples

```
grunt fetch:lists:canton --election-id=kr2011_medieninfo
grunt fetch:lists:constituencies --election-id=kr2011_medieninfo
grunt fetch:exe:canton --election-id=rr2015_preview
```

#### JavaScript

```
npm install zh-vote-crawler --save
```

The crawler always returns a `q` promise object. The crawler has a default waiting time of 500ms between requests and only runs one request at a time.

##### Examples

```
var crawler = require('zh-vote-crawler');

crawler.lists.canton('kr2011_medieninfo');
crawler.lists.constituencies('kr2011_medieninfo');
crawler.exe.canton('rr2015_preview');
```


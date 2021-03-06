# ZH Vote Crawler

*This is an unofficial crawler to retrieve data from the Statistical Office of the Kanton Zürich. No guarantees provided.*

The goal is to write a crawler to fetch and extract the html tables of [www.wahlen.zh.ch](http://www.wahlen.zh.ch/).

This crawler is intitially written for the cantonal election on April 12th 2015. But it may be useful thereafter aswell.

The two example pages of the two upcoming elections are:
- [Kantonsratswahlen](http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=listen_kanton)
- [Regierungsratswahlen](http://www.wahlen.zh.ch/wahlen/rr2015_preview/viewer.php?table=kandkanton)

Links to the hot pages and data from it can not be published until the polls close at April 12th 12:00 PM.

## How to use

The crawler can be used via grunt or directly in javascript.

```
npm install zh-vote-crawler --save
```

The crawler assumes to be running with `TZ=Europe/Zurich` for correct meta data time readings.

### Grunt

All tasks require `--election-id` parameter.

```
grunt --help
```

#### Examples

```bash
grunt fetch:exe:combined --election-id=rr2015_preview
grunt fetch:leg:lists:combined --election-id=kr2011_medieninfo --year=2011 --previous-year=2007

# detail endpoints
grunt fetch:exe:canton --election-id=rr2015_preview
grunt fetch:exe:areas --election-id=rr2015_preview

grunt fetch:leg:lists:canton --election-id=kr2011_medieninfo
grunt fetch:leg:lists:constituencies --election-id=kr2011_medieninfo
grunt fetch:leg:candidates --election-id=kr2011_medieninfo

grunt fetch:leg:lists:comparison:canton --election-id=kr2011_medieninfo --year=2011 --previous-year=2007
grunt fetch:leg:lists:comparison:constituencies:percent --election-id=kr2011_medieninfo --year=2011 --previous-year=2007
grunt fetch:leg:lists:comparison:constituencies:seats --election-id=kr2011_medieninfo --year=2011 --previous-year=2007
```

Results will be written to `data/results`.

#### Never used npm and grunt?

[Install Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#osx) on your machine. Then install grunt globally and the dependencies locally.

```
npm install -g grunt-cli && npm install
```

### JavaScript

The crawler always returns a `q` promise object. The crawler has a waiting time of 500ms between requests and always runs requests sequently.

#### Examples

```js
var crawler = require('zh-vote-crawler');

crawler.leg.lists.canton('kr2011_medieninfo').then(function(resultSet) {
  console.log(resultSet);
});
crawler.leg.lists.comparison.canton('kr2011_medieninfo', 2011, 2007).then(function(resultSet) {
  console.log(resultSet);
});
crawler.exe.combined('rr2015_preview').then(function(resultSet) {
  console.log(resultSet);
});
```

## Data Format

### Result Set

```js
{
  "source": {
    "time": "2015-03-25T12:13:00.000Z",
    "area": [
      185, // counted
      185  // total
    ],
    "complete": true,
    "fetched": "2015-04-06T20:17:19.976Z",
    "electionId": "kr2011_medieninfo",
    "urls": [
      "http://www.wahlen.zh.ch/wahlen/kr2011_medieninfo/viewer.php?menu=kand_kanton"
    ],
    // result set with previous values
    "year": "2011",
    "previousYear": "2007"
  },
  "meta": [],
  "results": []
}
```

All dates are UTC time strings.

### Meta Object

Meta object can hold any arbitrary data about a result object. The data should not be geo specific. The only mandatory fields are `id` and `type`.

```js
{
  "id": "1-101",                 // mandatory
  "type": "candidate" || "list", // mandatory
  // example candidate
  "name": "Ernst Bachmann",      // first + last name
  "party": "SVP",                // party abbr
  "incumbent": true,             // previously elected
}
```

### Result Object

```js
{
  "id": "SVP",                   // mandatory
  "type": "list" || "candidate", // mandatory
  "geography": {                 // mandatory, spatial limitation of result
    "id": 17,                    // see meta data section
    "type": "constituency",
    "area": [                    // constituency only: partial count info
      10,                        // counted
      22                         // total
    ],
    "complete": false            // area[0] === area[1]
  },
  "votes": 84034,                // absolute vote count
  // list only
  "voters": 98,                  // absolute voters count
  "votersPercent": 17,           // percentage of voters
  "votesPercent": 19,            // percentage of votes
  "quorum": true || false,       // has minimal votes to participate
  "seats": 36,                   // seats
  "previousSeats": 35,           // seats in previouse election
  "previousVotersPercent": 1     // percentage of votes in previouse election
  "previousVotesPercent": 1      // percentage of votes in previouse election
  // candidate only
  "elected": true                // is elected
  // exe candidate only
  "majority": 84034,             // number of votes to reach majority
  "hasMajority": true            // if majority is reached
}
```

All non mandatory may or may not be available. The sections only imply that they could appear with a specific result or election type.

It is possible that `hasMajority` is defined and `majority` is missing since some source pages only indicate weather majority is reached but not the number of votes required.

## Meta Data

Some meta data is needed to aggregate and later visualize the results.

### Geography

`geo_source.json` is a modified version of the [topojson file published by the Statistical Office](http://www.statistik.zh.ch/internet/justiz_inneres/statistik/de/wahlen_abstimmungen/wahlen_2015/KRW_2015/wahlkreis.html) provided by Matthias Mazenauer.

Matching is done with normalized and slugified area names which seems like the only available option.

#### Geo Types

| Type           | Values   | Description                   |
|----------------|----------|-------------------------------|
| `canton`       | `ZH`     | canton abbreviation           |
| `constituency` | 1-18     | constituency #                |
| `area`         | 1-999999 | `BFSK` - `GDENR` + district # |

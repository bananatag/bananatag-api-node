Node Library for the Bananatag API 
==================================

### Installation
```bash

$ npm install bananatag-api

```

### Usage

#### Get All Tags
```javascript
var BTagAPI = require('bananatag-api');
var btag = new BTagAPI('Your AuthID', 'Your Key');

btag.request('tags', {}, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
```

#### Get Aggregate Stats Over Date-Range
```javascript
var BTagAPI = require('bananatag-api');
var btag = new BTagAPI('Your AuthID', 'Your Key');

btag.request('tags', {start: '2013-01-01', end: '2014-03-30', aggregateData: true}, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
```

### Running Tests
To run the test suite first invoke the following command within the repo,
installing the development dependencies:

```bash

$ npm install

```

then run the tests:

```bash

$ npm test

```

### License
Licensed under the MIT License.
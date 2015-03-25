Node Library for the Bananatag API 
==================================

### Installation
```bash

$ npm install bananatag-api

```

### Usage

#### Get All Tags
```javascript
var BTagAPI = require('../lib/btag.js');
var credentails = {
    authID: '421231b6c7857ffd1',
    key: '4f614vR41y541d9632109a5b'
};

var btag = new BTagAPI(credentails.authID, credentails.key);

btag.request('tags', {}, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
```

#### Get Aggregate Stats Over Date-Range

#### Send Tracked Email

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
Node Library for the Bananatag API 
==================================

### Installation
```bash
$ npm install bananatag-api
```

### Request (methods and options)
#### Request Method
This library has a single method that requires either three for four parameters:

```javascript
btag.request(
    endPoint,             // The request endpoint
    params,               // The request parameters
    options | callback,   // If options are set then the callback is the next param
    callback              // Callback
)
```

#### Pagination
*Please see documentation for pagination details.*

Response data from the API is paginated. This library can assist with retrieving a single page at a time or getting all pages at once. To automatically fetch the next page until all results have been returned, use set ```options.getAllResults = true``` before making the request. The API restricts requests to 1 per second so this library delays each request accordingly.

### Response

#### Callback parameters
The callback parameter in the ```request``` method handles the response. 
```javascript
btag.request(
    endPoint,             // The request endpoint
    params,               // The request parameters
    options | callback,   // If options are set then the callback is the next param
    function (err, data, cursor, total) {
        console.log(cursor); // used to fetch the next page manually (see below)
        console.log(total); // used to fetch the next page manually
    }
)
```

#### Pagination
See examples below.

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
btag.request('tags', {start: '2013-01-01', end: '2014-03-30', aggregateData: true}, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
```

#### Automatically fetch the next page of results (until entire result set is returned)
To automatically get pass in an options argument into the third parameter of the .request method.
```getAllResults``` option is a boolean and defaults to false.

```javascript
btag.request('tags', params, {getAllResults: true}, function (err, data, cursor, total) {
    console.log(cursor);
    console.log(total);
});

```

#### Manually fetch the next page of results 
To automatically get pass in an options argument into the third parameter of the .request method.
```getAllResults``` option is a boolean and defaults to false.

```javascript
// Simple function to demonstrate manually retrieving the next page of results.
function getTags(params, i) {

    btag.request('tags', params, {getAllResults: true}, function (err, data, cursor, total) {
        console.log(cursor);
        console.log(total);
        
        if (i <= 1 && cursor < total) {
            setTimeout(function() {
                params.next = cursor;
                params.total = total;
            
                getTags(params, (i += 1));
            }, 1200);
        }
    });
}

getTags({}, 0};
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
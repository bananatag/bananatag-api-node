Node Library for the Bananatag API 
==================================

### Installation
```bash
$ npm install bananatag-api
```

### Request / Response (methods and options)
This library has a single method that requires either three for four parameters:

```javascript
/**
 * Check data and setup makeRequest
 * @param {string} endpoint
 * @param {object} params
 * @param {object|function} options
 * @param {bool} options.getAllResults
 * @param {function} callback
 */
BtagAPI.request = function (endpoint, params, options, callback) {};
```

#### Parameters
*Please see documentation for pagination details.*

#### Options
*Please see documentation for pagination details.*

#### Callback parameters
The callback parameter in the ```request``` method handles the response. 
```javascript

/**
* @param {string} err
* @param {string} data     JSON string
* @param {int} cursor      Where the returned results end and the next request should start.
* @param {int} total       Total records
*/
var callback = function (err, data, cursor, total) {
   console.log(cursor); // used to fetch the next page manually (see below)
   console.log(total); // used to fetch the next page manually
};

btag.request(
    endPoint,                      // The request endpoint
    params,                        // The request parameters
    {getAllResults: false},        // If options are set then the callback is the next param
    callback
)
```

#### Pagination
Response data from the API is paginated. This library can assist with retrieving a single page at a time or getting all pages at once. To automatically fetch the next page until all results have been returned, use set ```options.getAllResults = true``` before making the request. The API restricts requests to 1 per second so this library delays each request accordingly.

*See examples below.*

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
var params = {
    start: '2013-01-01',
    end: '2014-03-30', 
    aggregateData: true
};

btag.request('tags', params, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
```

#### Automatically fetch the next page of results
To automatically get all pages a result, pass in an options argument into the third parameter of the .request method.
Set ```getAllResults``` property of this parameter to true (defaults to false).

```javascript
btag.request('tags', params, {getAllResults: true}, function (err, data, cursor, total) {
    console.log(cursor);
    console.log(total);
});

```

#### Manually fetch the next page of results 
To manually get the next page, set ```params.next = cursor``` (```cursor``` is returned from API). Or, if you are
making the request in the same session, you can simply call ```btag.request``` again.

```javascript
// Simple function to demonstrate manually retrieving the next page of results.
var params = {
    start: '2013-01-01',
    end: '2014-03-30', 
    next: 0 // Default value is 0
};

function getTags(i) {
    btag.request('tags', params, {getAllResults: true}, function (err, data, cursor, total) {
        if (i <= 1 && cursor < total) {
            setTimeout(function() {
                getTags((i += 1));
            }, 1200);
        }
    });
}

getTags(0);
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
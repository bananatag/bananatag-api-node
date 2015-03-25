/**
 * Created by ruman on 3/25/2015.
 */
'use strict';
var BTagAPI = require('../lib/btag.js');

var credentails = {
    authID: 'c',
    key: 'c'
};

var params = {start:'2013-01-01', end:'2014-03-30'};

var btag = new BTagAPI(credentails.authID, credentails.key);

btag.request('tags', params, function (data) {
    console.log(data);
});
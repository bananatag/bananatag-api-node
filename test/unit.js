'use strict';
var BTagAPI = require('../lib/btag.js');
var should = require('should');
var credentails = {
    authID: '',
    key: ''
};


describe('Testing basic API requests:', function () {

    var btag = new BTagAPI(credentails.authID, credentails.key);
    var params = {};

    it('Validate credentials', function (done) {
        credentails.authID.should.not.equal('');
        credentails.key.should.not.equal('');

        done();
    });

    it('Get tags within date range', function (done) {
        var btag = new BTagAPI(credentails.authID, credentails.key);
        btag.request('tags', params, function (err, data) {
            should.not.exist(err);

            done();
        });
    });
});
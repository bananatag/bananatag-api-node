'use strict';
var BTagAPI = require('../lib/btag.js');

var credentails = {
    authID: '',
    secret: ''
};

describe('Testing basic API requests', function () {

    BTagAPI(credentails.authID, credentails.secret);

    it('Validate credentials', function (done) {
        credentails.authID.should.not.equal('');
        credentails.secret.should.not.equal('');

        done();
    });

    it('Get tags within date range', function (done) {
        var onePlusOne = 1 + 1;
        onePlusOne.should.equal(2);
        // must call done() so that mocha know that we are... done.
        // Useful for async tests.
        done();
    });
});
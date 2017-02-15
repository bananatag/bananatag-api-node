import assert from 'assert';
import BtagAPI from '../src/btag';

const btag = new BtagAPI('api id here', 'api key here');

describe('Email', function () {
    this.timeout(50000);

    describe('get user', () => {
        it('shouldn\'t throw an error.', (done) => {
            btag.request('users', {}, (err, response) => {
                if (err) {
                    throw err;
                }

                assert.equal(typeof response.data.id, 'string');
                assert.equal(typeof response.data.accountType, 'string');

                done(null);
            });
        });
    });

    describe('get tags', () => {
        it('shouldn\'t throw an error.', (done) => {
            btag.request('tags', {}, { getAllResults: false }, (err, response) => {
                if (err) {
                    throw err;
                }

                assert.equal(response.data instanceof Array, true);
                assert.equal(response.data.length > 0, true);

                done(null);
            });
        });
    });

    describe('email send', () => {
        it('shouldnt throw an error.', (done) => {
            const params = {
                from: 'ericpwein@gmail.com',
                to: 'eric@bananatag.com',
                subject: 'Test API Email Send',
                html: '<div><h1>Testing</h1><p> building of mime messages and stuff</p> <a href="http://www.google.com">www.google.com</a></div>'
            };

            btag.buildMessage(params, (err, message) => {
                if (err) {
                    throw err;
                }

                btag.request('tags/send', {
                    sender: 'ericpwein@gmail.com',
                    raw: message,
                    track: true
                }, (err, response) => {
                    if (err) {
                        throw err;
                    }

                    assert.equal(response.code, 100);
                    assert.equal(response.data, 'Success');

                    done(null);
                });
            });
        });
    });
});
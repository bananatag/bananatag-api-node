/**
 * Bananatag Public API Node Library
 *
 * @author Bananatag Systems <eric@bananatag.com>
 * @version 0.1.0
 * @license MIT
 *
 * @module bananatag-api
 */

/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false, process: true */
(function () {
    'use strict';
    var querystring = require('querystring'),
        Crypto = require('crypto'),
        Request = require('request'),
        async = require('async'),
        MailComposer = require('mailComposer').MailComposer,
        mailComposer = new MailComposer({'forceEmbeddedImages': true}),
        md5 = Crypto.createHash('md5'),
        baseUrl;

    /**
     *	Unique API identifier
     */
    var authId;

    /**
     *	Unique API Access Key
     */
    var accessKey;

    /**
     *	Store requests for pagination purposes
     */
    var requests = {};

    /**
     * Constructor
     * @param: id
     * @param: key
     * @throws Exception
     */
    function BTagAPI(id, key) {
        if (Crypto === undefined) {
            throw new Error("400 (Bad request): The Bananatag-JS API library requires the 'crypto' module.");
        }

        if (Request === undefined) {
            throw new Error("400 (Bad request): The Bananatag-JS API library requires the 'makeRequest' module.");
        }

        if (async === undefined) {
            throw new Error("400 (Bad request): The Bananatag-JS API library requires the 'Request' module.");
        }

        if (!id || !key) {
            throw new Error("401 (Unauthorized): You must provide both an authID and access key.");
        }

        authId = id;
        accessKey = key;
        baseUrl = "https://api.bananatag.com/";
    }

    var methods = {
        /**
         * Check data and setup makeRequest
         * @param {string} endpoint
         * @param {object} params
         * @param {object|function} options
         * @param {bool} options.getAllResults
         * @param {function} callback
         */
        request: function (endpoint, params, options, callback) {
            var self = methods;

            // Allow users to either send options or callback as the third param
            if (options instanceof Function) {
                callback = options;
                options = {
                    getAllResults: false
                }
            } else {
                if (options.getAllResults === undefined) {
                    options.getAllResults = false;
                }
            }

            async.series(
                {
                    'check': function (next) {
                        self.checkData(params, next);
                    },
                    'method': function (next) {
                        self.getMethod(endpoint, next);
                    },
                    'session': function (next) {
                        self.updateSession(endpoint, params, false, next);
                    }
                },
                function (err, req) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (options instanceof Object) {
                        req.options = options;
                    }

                    self.makeRequest(endpoint, req, params, callback);
                }
            );
        },

        /**
         * Send GET/PUT makeRequest, parse json response and call callback with returned data
         * @param endpoint
         * @param params
         * @param {function} callback
         * @param req
         *
         * @namespace bodyParsed.paging
         * @namespace bodyParsed.paging.cursors
         */
        makeRequest: function (endpoint, req, params, callback) {
            var self = methods,
                bodyParsed,
                options = {
                    url: req.session.url,
                    method: req.method,
                    timeout: 10000,
                    headers: {
                        Authorization: req.session.signature
                    }
                };

            if (req.method === 'post') {
                options.form = req.session.params;
            } else {
                options.url = req.session.url + '?' + querystring.stringify(req.session.params);
            }

            try {
                Request(options, function (err, response, body) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    bodyParsed = JSON.parse(body);

                    if (Math.floor(bodyParsed.code / 100) >= 4) {
                        callback((bodyParsed.code + " (" + bodyParsed.error + "): " + bodyParsed.message));
                    } else {
                        if (bodyParsed.paging !== undefined) {
                            self.updateSession(endpoint, params, bodyParsed.paging, false);
                        }

                        if (req.options.getAllResults && bodyParsed.paging !== undefined) {
                            callback(null, body, bodyParsed.paging.cursors.next, bodyParsed.paging.cursors.total);
                            if (bodyParsed.paging.cursors.next < bodyParsed.paging.cursors.total) {
                                setTimeout(function () {
                                    self.send(endpoint, params, req.options, callback);
                                }, 1200);
                            }
                        } else {
                            callback(null, body);
                        }
                    }
                });
            } catch (err) {
                callback(null, err);
            }
        },

        /**
         * @method updateSession
         * @param {string} endpoint
         * @param {object} params
         * @param {bool|object} update
         * @param {object} update.cursors
         * @param {function|bool} next
         */
        updateSession: function(endpoint, params, update, next) {
            var data = querystring.stringify(params),
                session = md5.update(endpoint + data),
                self = methods;
            // Create the params for the request (need to include the cursor)
            data = querystring.parse(data);

            // Set default of rtn to json
            if (data.rtn === undefined) {
                data.rtn = 'json';
            }

            if (requests[session] === undefined) {
                requests[session] = {
                    params: data,
                    next: 0,
                    prev: 0,
                    url: baseUrl + endpoint
                };
            } else if (update) {
                // Update request session with response information
                // Set the total, if it comes back in the response
                if (update.cursors.total !== undefined) {
                    requests[session].total = update.cursors.total;
                }

                requests[session].params = data;
                requests[session].next = update.cursors.next;
                requests[session].prev = update.cursors.prev;
            }

            if (requests[session].total !== undefined) {
                data.total = requests[session].total;
            }

            data.cursor = requests[session].next;

            if (next) {
                // Generate signature
                self.generateSignature(data, function (err, signature) {
                    requests[session].signature = signature;

                    process.nextTick(function () {
                        next(err, requests[session]);
                    })
                });
            }
        },

        /**
         * Check data and setup makeRequest
         * @param params
         * @param next
         */
        generateSignature: function (params, next) {
            try {
                var signature = Crypto.createHmac('sha1', accessKey).update(querystring.stringify(params)).digest('hex'),
                    rtn =  new Buffer(authId + ':' + signature).toString('base64');
                console.log(querystring.stringify(params));
                process.nextTick(function () {
                    next(null, rtn);
                });
            } catch (err) {
                process.nextTick(function () {
                    next(err, null);
                });
            }
        },

        /**
         * Return the correct makeRequest type for the given endpoint
         * @param endpoint
         * @param callback
         */
        getMethod: function (endpoint, callback) {
            setImmediate(function () {
                switch (endpoint) {
                    case "tags/send":
                        callback(null, 'POST');
                        break;
                    default:
                        callback(null, 'GET');
                }
            });
        },

        /**
         * Check data and catch any parameter errors before sending makeRequest
         * @param {object} data
         * @param {string} data.start
         * @param {string} data.end
         * @param callback
         */
        checkData: function (data, callback) {
            async.series([
                // Check date strings are in correct format
                function (next) {
                    if (data.start !== undefined) {
                        helpers.validateDate(data.start, next);
                    } else {
                        next(null);
                    }
                },
                // Check date strings are in correct format
                function (next) {
                    if (data.end !== undefined) {
                        helpers.validateDate(data.end, next);
                    } else {
                        next(null);
                    }
                },
                // Check if start date is less than end date.
                function (next) {
                    if (data.start !== undefined && data.end !== undefined) {
                        if ((Date.parse(data.start) / 1000) > (Date.parse(data.end) / 1000)) {
                            next("400 (Bad request): Error with provided parameters; Start date is greater than end date.");
                            return;
                        }
                    }

                    next(null);
                }
            ], function (err) {
                callback(err);
            });
        }
    };

    var mime = {
        /**
         * @method buildMessage
         * @param params
         * @param callback
         *
         * @namespace params.attachments
         */
        buildMessage: function (params, callback) {
            var that = this;
            var data = {};

            if (params.from === undefined) {
                callback("You must specify the from parameter.");
                return;
            } else if (params.to === undefined) {
                callback("You must include the to parameter.");
                return;
            } else if (params.html === undefined) {
                callback("You must include the html parameter.");
                return;
            } else if (params.text === undefined) {
                // TODO: make sure it is plaintext
                data.body = params.text;
            }

            // TODO: only allow 1 recipient or no limit?
            if (params.to.split(",") > 1) {
                throw new Error("You can only specify one to address.");
            }

            if (params.attachments !== undefined) {
                if (params.attachments.constructor !== Array) {
                    throw new Error("Attachments must be an array.");
                }
            }

            data.from = params.from;
            data.to = params.to;
            data.html = params.html;

            if (params.subject) {
                data.subject = params.subject;
            }

            if (params.cc) {
                data.cc = params.cc;
            }

            if (params.bcc) {
                data.bcc = params.bcc;
            }

            if (params.replyTo) {
                data.replyTo = params.replyTo;
            }

            if (params.inReplyTo) {
                data.inReplyTo = params.inReplyTo;
            }

            // Setup message data
            process.nextTick(function () {
                async.series([
                    // set basic email headers
                    function (next) {
                        mailComposer.setMessageOption(data);
                        next();
                    },
                    // add attachments if any are provided
                    function (next) {
                        if (params.attachments !== undefined && params.attachments.length > 0) {
                            that.addAttachments(mailComposer, params.attachments, function (err) {
                                (err) ? next(err) : next();
                            });
                        } else {
                            next();
                        }
                    }
                ], function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // build the message into a mime message raw string
                    mailComposer.buildMessage(function(err, messageSource) {
                        if (err) {
                            callback(err);
                        } else {
                            // return Mime message as base64 encoded string
                            callback(null, new Buffer(messageSource).toString('base64'));
                        }
                    });
                });
            });
        },

        addAttachments: function (mailComposer, attachments, callback) {
            var data = {};
            async.each(attachments, function (attachment, next) {
                data = {};

                if (attachment.fileName === undefined) {
                    next("You must include the fileName parameter.");
                } else if (attachment.contents === undefined && attachment.filePath === undefined) {
                    next("You must include either the contents or filePath parameter.");
                }

                data.fileName = attachment.fileName;

                if (attachment.contents !== undefined) {
                    data.contents = attachment.contents;
                }

                if (attachment.filePath !== undefined) {
                    data.filePath = attachment.filePath;
                }

                if (attachment.streamSource !== undefined) {
                    data.streamSource = attachment.streamSource;
                }

                if (attachment.contentType !== undefined) {
                    data.contentType = attachment.contentType;
                }

                if (attachment.contentDisposition !== undefined ) {
                    data.contentDisposition = attachment.contentDisposition;
                }

                if (attachment.userAgent !== undefined) {
                    data.userAgent = attachment.userAgent;
                }

                mailComposer.addAttachment(data);

                process.nextTick(next)
            }, function (err) {
                callback(err);
            });
        }
    };

    var helpers = {
        /**
         * Check if date parameter is given in the correct format (yyyy-mm-dd)
         * @param date
         * @throws Exception
         * @param next
         */
        validateDate: function (date, next) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                next(null);
            } else {
                next("400 (Bad request): Error with provided parameters; Date string must be in format yyyy-mm-dd.");
            }
        }
    };

    BTagAPI.prototype.request = methods.request;
    BTagAPI.prototype.getRaw = mime.buildMessage;

    module.exports = BTagAPI;

}());
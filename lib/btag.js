/**
 *	Bananatag Public API Node Library
 *
 * 	@author Bananatag Systems <eric@bananatag.com>
 * 	@version 1.0.0
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

    var btRequest = {
        /**
         * Check data and setup makeRequest
         * @param endpoint
         * @param {object} params
         * @param {function} callback
         */
        send: function (endpoint, params, callback) {
            var self = btRequest;

            async.series(
                {
                    'check': function (next) {
                        self.checkData(params, next);
                    },
                    'method': function (next) {
                        self.getMethod(endpoint, next);
                    },
                    'signature': function (next) {
                        self.generateSignature(params, next)
                    }
                },
                function (err, req) {
                    if (err) {
                        callback(err);
                    }

                    self.makeRequest(baseUrl + endpoint, req, params, callback);
                }
            );
        },

        /**
         * Send GET/PUT makeRequest, parse json response and call callback with returned data
         * @param url
         * @param params
         * @param {function} callback
         * @throws Exception
         * @param req
         */
        makeRequest: function (url, req, params, callback) {
            try {
                Request({
                    url: url,
                    method: req.method,
                    form: params,
                    timeout: 10000,
                    headers: {
                        Authorization: req.signature
                    }
                }, function (err, response, body) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (Math.floor(body.code / 100) >= 4) {
                        callback((body.code + " (" + body.error + "): " + body.message));
                    } else {
                        callback(null, body);
                    }
                });
            } catch (err) {
                 callback(null, err);
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
                },
                // Check if aggregateData is either true or false
                function (next) {
                    if (data.aggregateData !== undefined && data.aggregateData !== "true" && data.aggregateData !== "false") {
                        next("400 (Bad request): Error with provided parameters; aggregateData must either be 'true' or 'false'.");
                        return;
                    }

                    next(null);
                }
            ], function (err) {
                callback(err);
            });
        }
    };

    var btMime = {
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
                        callback(err)
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
            if (/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/.test(date)) {
                next(null);
            } else {
                next("400 (Bad request): Error with provided parameters; Date string must be in format yyyy-mm-dd.");
            }
        }
    };

    BTagAPI.prototype.request = btRequest.send;
    BTagAPI.prototype.getRaw = btMime.buildMessage;

    module.exports = BTagAPI;

}());
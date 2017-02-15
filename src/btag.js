import async from 'async';
import querystring from 'querystring';
import crypto from 'crypto';
import Request from 'request';
import md5 from 'md5';
import MailComposer from 'mailcomposer';

export default class BtagAPI {
    /**
     * Constructor
     * @param id
     * @param key
     */
    constructor(id, key) {
        if (!id || !key) {
            throw new Error('401 (Unauthorized): You must provide both an authID and access key.');
        }

        this._id = id;
        this._key = key;
        this._baseUrl = 'http://localhost:8080/'; // "https://api.bananatag.com/";
        this._requests = {};
        this._mailcomposer = MailComposer({ forceEmbeddedImages: true });

        /**
         * Send GET/POST/PUT makeRequest, parse json response and call callback with returned data
         * @param endpoint
         * @param params
         * @param {function} callback
         * @param req
         */
        this._makeRequest = (endpoint, req, params, callback) => {
            const options = {
                url: req.session.url,
                method: req.method,
                timeout: 10000,
                headers: {
                    Authorization: req.session.signature
                },
                json: true
            };

            if (req.method === 'POST' || req.method === 'PUT') {
                options.form = req.session.params;
            } else {
                options.url = `${req.session.url}?${querystring.stringify(req.session.params)}`;
            }

            Request(options, (err, response, body) => {
                if (err) {
                    callback(err);
                    return;
                }

                if (Math.floor(body.code / 100) >= 4) {
                    callback(new Error(`${body.code} (${body.error}): ${body.message}`));
                    return;
                }

                if (body.paging !== undefined) {
                    this._updateSession(endpoint, params, body.paging, false);
                }

                if (req.options.getAllResults && body.paging !== undefined) {
                    callback(null, body, body.paging.cursors.next, body.paging.cursors.total);

                    if (body.paging.cursors.next < body.paging.cursors.total) {
                        setTimeout(() => {
                            this.request(endpoint, params, req.options, callback);
                        }, 1200);
                    }
                } else {
                    callback(null, body);
                }
            });
        };

        /**
         * @method updateSession
         * @param {string} endpoint
         * @param {object} params
         * @param {bool|object} update
         * @param {object} update.cursors
         * @param {function|bool} callback
         */
        this._updateSession = (endpoint, params, update, callback) => {
            let data = querystring.stringify(params);
            const session = md5(endpoint + data);

            // Create the params for the request (need to include the cursor)
            data = querystring.parse(data);

            // Set default of rtn to json
            if (data.rtn === undefined) {
                data.rtn = 'json';
            }

            if (this._requests[session] === undefined) {
                this._requests[session] = {
                    params: data,
                    next: 0,
                    prev: 0,
                    url: this._baseUrl + endpoint
                };
            } else if (update) {
                // Update request session with response information
                // Set the total, if it comes back in the response
                if (update.cursors.total !== undefined) {
                    this._requests[session].total = update.cursors.total;
                }

                this._requests[session].params = data;
                this._requests[session].next = update.cursors.next;
                this._requests[session].prev = update.cursors.prev;
            }

            if (this._requests[session].total !== undefined) {
                data.total = this._requests[session].total;
            }

            data.cursor = this._requests[session].next;

            if (callback) {
                // Generate signature
                this._generateSignature(data, (err, signature) => {
                    this._requests[session].signature = signature;
                    callback(err, this._requests[session]);
                });
            }
        };

        /**
         * Generate request signature using api id, key and parameters
         * @param params
         * @param callback
         * @private
         */
        this._generateSignature = (params, callback) => {
            const signature = crypto.createHmac('sha1', this._key).update(querystring.stringify(params)).digest('hex');
            const rtn =  new Buffer(`${this._id}:${signature}`).toString('base64');
            callback(null, rtn);
        };

        /**
         * Get the request method based on provided endpoint
         * @param endpoint
         * @param callback
         * @private
         */
        this._getMethod = (endpoint, callback) => {
            switch (endpoint) {
                case 'tags/send':
                    callback(null, 'POST');
                    break;
                default:
                    callback(null, 'GET');
            }
        };

        /**
         * Check data and catch any parameter errors before sending makeRequest
         * @param data
         * @param callback
         * @private
         */
        this._checkData = (data, callback) => {
            async.series([
                // Check date strings are in correct format
                (next) => {
                    if (data.start !== undefined) {
                        this._validateDate(data.start, next);
                    } else {
                        next(null);
                    }
                },
                // Check date strings are in correct format
                (next) => {
                    if (data.end !== undefined) {
                        this._validateDate(data.end, next);
                    } else {
                        next(null);
                    }
                },
                // Check if start date is less than end date.
                (next) => {
                    if (data.start !== undefined && data.end !== undefined) {
                        if ((Date.parse(data.start) / 1000) > (Date.parse(data.end) / 1000)) {
                            next(new Error('400 (Bad request): Error with provided parameters; Start date is greater than end date.'));
                            return;
                        }
                    }

                    next(null);
                }
            ], callback);
        };

        /**
         * Add provided attachments to Mime message
         * @param data
         * @param attachments
         * @param callback
         * @private
         */
        this._addMimeAttachments = (data, attachments, callback) => {
            data.attachments = [];
            async.each(attachments, (attachment, next) => {
                if (attachment.fileName === undefined) {
                    next(new Error('You must include the fileName parameter.'));
                } else if (attachment.contents === undefined && attachment.filePath === undefined) {
                    next(new Error('You must include either the contents or filePath parameter.'));
                }

                const attachmentParams = {};

                attachmentParams.fileName = attachment.fileName;

                if (attachment.contents !== undefined) {
                    attachmentParams.contents = attachment.contents;
                }

                if (attachment.filePath !== undefined) {
                    attachmentParams.filePath = attachment.filePath;
                }

                if (attachment.streamSource !== undefined) {
                    attachmentParams.streamSource = attachment.streamSource;
                }

                if (attachment.contentType !== undefined) {
                    attachmentParams.contentType = attachment.contentType;
                }

                if (attachment.contentDisposition !== undefined ) {
                    attachmentParams.contentDisposition = attachment.contentDisposition;
                }

                if (attachment.userAgent !== undefined) {
                    attachmentParams.userAgent = attachment.userAgent;
                }

                data.attachments.push(attachmentParams);
                next(null);
            }, callback);
        };

        /**
         * Check if date parameter is given in the correct format (yyyy-mm-dd)
         * @param date
         * @param callback
         */
        this._validateDate = (date, callback) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                callback(null);
            } else {
                callback(new Error('400 (Bad request): Error with provided parameters; Date string must be in format yyyy-mm-dd.'));
            }
        };
    }

    /**
     * Check data and setup api request
     * @param {string} endpoint
     * @param {object} params
     * @param {object|function} options
     * @param {bool} options.getAllResults
     * @param {function} callback
     */
    request(endpoint, params, options, callback) {
        // Allow users to either send options or callback as the third param
        if (options instanceof Function) {
            callback = options;
            options = {
                getAllResults: false
            };
        } else if (options.getAllResults === undefined) {
            options.getAllResults = false;
        }

        async.series({
            check: (next) => {
                this._checkData(params, next);
            },
            method: (next) => {
                this._getMethod(endpoint, next);
            },
            session: (next) => {
                this._updateSession(endpoint, params, false, next);
            }
        }, (err, req) => {
            if (err) {
                callback(err);
                return;
            }

            if (options instanceof Object) {
                req.options = options;
            }

            this._makeRequest(endpoint, req, params, callback);
        });
    }

    buildMessage(params, callback) {
        const data = {};

        if (params.from === undefined) {
            throw new Error("You must specify the 'from' parameter.");
        } else if (params.to === undefined) {
            throw new Error("You must include the 'to' parameter.");
        } else if (params.html === undefined) {
            throw new Error("You must include the 'html' parameter.");
        } else if (params.text === undefined) {
            // TODO: make sure it is plaintext
            data.body = params.text;
        }

        if (params.to.split(',') > 1) {
            throw new Error('You can only specify one recipient address.');
        }

        if (params.attachments !== undefined) {
            if (params.attachments.constructor !== Array) {
                throw new Error('Attachments must be an array.');
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

        // setup message data
        async.waterfall([
            // add attachments if any are provided
            (next) => {
                if (params.attachments !== undefined && params.attachments.length > 0) {
                    this._addMimeAttachments(data, params.attachments, next);
                } else {
                    next(null);
                }
            },
            // set basic email headers
            (next) => {
                next(null, this._mailcomposer(data));
            },
            (next) => {
                // build the message into a mime message raw string
                this._mailcomposer.build(next);
            }
        ], (err, messageSource) => {
            if (err) {
                throw err;
            }

            // return Mime message as base64 encoded string
            callback(new Buffer(messageSource).toString('base64'));
        });
    }
}
var testHelper = require('../../index');

var expect = require('chai').expect,
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),
    rewire = require("rewire"),

    minimatch = require("minimatch"),
    Minimatch = minimatch.Minimatch,

    utils = require(testHelper.APP_DIR + '/utils'),
    fields = require(testHelper.APP_DIR + '/fields'),
    errors = require(testHelper.APP_DIR + '/errors');

// Rewiring copy task, so that we can override some dependencies
var copy = rewire(testHelper.APP_DIR + '/tasks/copy.js');

describe('tasks/copy.js', function () {
    var mockFsHandler,
        isDirectory,
        okDir,
        mockFs,
        errorCases,
        Context;

    before(function () {
        okDir = process.cwd();

        // Creating file responder that we will use in test cases to handle fake filesystem
        mockFsHandler = function (filePath, content) {
            filePath = path.resolve(okDir, filePath);

            if (arguments.length === 1) {
                // It is a getter
                return mockFs[filePath];
            } else {
                // It is a setter for content
                mockFs[filePath] = content;
                return filePath;
            }
        };

        var existsSync = function (filePath) {
            filePath = path.resolve(okDir, filePath);
            return !_.isUndefined(mockFs[filePath]);
        };

        copy.__set__("shelljs", {
            cp: function() {
                var options, from, to;
                if(arguments.length === 3) {
                    options = arguments[0];
                    from = arguments[1];
                    to = arguments[2];
                } else {
                    from = arguments[0];
                    to = arguments[1];
                }

                _.each(mockFs, function(content, mockPath) {
                    var newPlace;

                    // Assuming directory copy happens
                    if(mockPath.indexOf(from) === 0 && options) {
                        newPlace = mockPath.replace(from, to);
                        mockFs[newPlace] = content;

                    } else if(mockPath === from) {
                        // Assume file copy happens
                        var fileName = path.basename(from);
                        var relat = path.relative(path.dirname(from), path.dirname(to));

                        newPlace = path.resolve(from, relat, to, fileName);
                        mockFs[newPlace] = content;
                    }
                });
            }
        });

        copy.__set__("glob", {
            sync: function(from, options) {
                from = path.resolve(okDir, from);

                var mm = new Minimatch(from, options);
                var list = _.keys(mockFs);

                list = list.filter(function (f) {
                    return mm.match(f)
                });

                return list;
            }
        });

        copy.__set__("utils", {
            mkdirp: function (pathDir) {
                if (!existsSync(pathDir)) {
                    var relativeTargetPath = path.relative(okDir, pathDir);
                    var relativeTargetPathParts = relativeTargetPath.split(path.sep);

                    var createPath = '';
                    relativeTargetPathParts.forEach(function (part) {
                        createPath += part;

                        mockFsHandler(createPath, '');

                        createPath += '/';
                    });
                }
            },
            arrayify: function(what) {
                return utils.arrayify(what);
            }
        });

        copy.__set__("fs", {
            // Faking existsSync() of 'fs' node module
            existsSync: existsSync,
            // Faking readFileSync() of 'fs' node module
            readFileSync: function (filePath) {
                filePath = path.resolve(okDir, filePath);

                if (mockFs[filePath]) {
                    return mockFs[filePath];
                } else {
                    return null;
                }
            },
            // Faking appending data to file
            appendFileSync: function (filePath, data) {
                filePath = path.resolve(okDir, filePath);

                if (mockFs[filePath]) {
                    mockFs[filePath] += data;
                } else {
                    mockFs[filePath] = data;
                }
            },
            // Faking stat info for path
            statSync: function (filePath) {
                return {
                    isDirectory: function() {
                        return isDirectory;
                    }
                }
            }
        });
    });

    beforeEach(function () {
        // Init mock file system before every test case
        mockFs = {};

        // Set isDirectory for fs.statSync() call, so that you can change it in testcase
        isDirectory = false;

        // Create context for task, so that we can catch messages and apply properties
        Context = {
            _errors: [],
            _warnings: [],
            _infos: [],
            _mockProp: 'kuku',

            error: function (msg) {
                this._errors.push(msg)
            },
            info: function (msg) {
                this._infos.push(msg)
            },
            warn: function (msg) {
                this._warnings.push(msg)
            }
        };

        /**
         * To remove boiler plate from all error test-cases
         * @param options options to pass in copy run() method
         * @param error error template from copy messages object
         */
        errorCases = function(options, error) {
            var doneTriggered = false;

            copy.run.call(Context, options, function () {
                var errorTemplate = errors.regex(error);
                expect(Context._errors[0]).to.match(errorTemplate);

                doneTriggered = true;
            });

            // Always check if done was called
            expect(doneTriggered).to.be.true;
        }
    });

    it('Return error if path where to copy contains wildcards', function () {
        var options = {
            from: '',
            to: '/*/**/my.house'
        };

        errorCases(options, copy.messages.E_TO_NO_WILDCARDS);
    });

    it('Return error if from array contains items, that are not of type String', function () {
        var options = {
            from: ['kuku.txt', {}],
            to: 'my.house'
        };

        errorCases(options, copy.messages.E_FROM_WRONG_TYPE);
    });

    it('Return error if from array contains empty items', function () {
        var options = {
            from: ['kuku.txt', ''],
            to: 'my.house'
        };

        errorCases(options,copy.messages.E_FROM_EMPTY);
    });

    it('Return error if from array is empty', function () {
        var options = {
            from: [],
            to: 'my.house'
        };

        errorCases(options, copy.messages.E_FROM_ITEMS_EMPTY);
    });

    it('Return error if from array item path does not exist', function () {
        var options = {
            from: ['tuk.tuk'],
            to: 'my.house'
        };

        errorCases(options, copy.messages.E_FROM_NO_PATH);
    });

    it('Return error if from array item path is not under current root', function () {
        var options = {
            from: path.resolve(okDir, '../', 'tuk.tuk'),
            to: 'my.house'
        };

        // Add path & data for from path in moch fs
        mockFsHandler(options.from, '');

        errorCases(options, copy.messages.E_FROM_NOT_UNDER_ROOT);
    });

    it('Return circular dependency error if "to" is hierarchically under "from"', function () {
        var options = {
            from: path.resolve(okDir),
            to: path.resolve(okDir, 'deep/place/')
        };

        // Add path & data for from path in moch fs
        mockFsHandler(options.from, '');
        mockFsHandler(options.to, '');

        errorCases(options, copy.messages.E_CIRCULAR);
    });

    it('Return error if copying from directory to file', function () {
        var options = {
            from: 'test/',
            to: 'my/file.txt'
        };

        // Set flag for mock fs.statSync().isDirectory() call to return true
        isDirectory = true;

        // Add path & data for from path in moch fs
        mockFsHandler(options.from, '');
        mockFsHandler(options.to, '');

        errorCases(options, copy.messages.E_FROM_DIR_TO_FILE);
    });

    it('Happy happy, copy file to file', function () {
        var options = {
            from: 'test/one.txt',
            to: 'private/file.txt'
        };

        // Add path & data for from path in moch fs
        mockFsHandler(options.from, 'do');
        mockFsHandler(options.to, 're');

        var doneTriggered = false;

        copy.run.call(Context, options, function () {
            expect(Context._errors[0]).to.not.exist;

            var result = mockFsHandler(options.from);
            expect(result).to.equal(mockFsHandler(options.from));

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });

    it('Happy happy, copy wildcard files to directory', function () {
        var options = {
            from: 'test/*.txt',
            to: 'private/'
        };

        // Add path & data for from path in moch fs
        mockFsHandler('test/1.txt', '1');
        mockFsHandler('test/2.txt', '2');
        mockFsHandler('test/3.txt', '3');
        mockFsHandler('test/book/read.txt', 'read some books');

        mockFsHandler(options.to, 're');

        var doneTriggered = false;

        copy.run.call(Context, options, function () {
            expect(Context._errors[0]).to.not.exist;

            expect(mockFsHandler('private/1.txt')).to.equal('1');
            expect(mockFsHandler('private/2.txt')).to.equal('2');
            expect(mockFsHandler('private/3.txt')).to.equal('3');

            expect(mockFsHandler('private/read.txt')).to.not.exist;
            expect(mockFsHandler('private/book/read.txt')).to.not.exist;

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });
});


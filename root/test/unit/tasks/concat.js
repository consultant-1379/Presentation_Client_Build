var testHelper = require('../../index');

var expect = require('chai').expect,
    path = require('path'),
    _ = require('lodash'),
    rewire = require("rewire"),

    errors = require(testHelper.APP_DIR + '/errors');

// Rewiring concat, so that we can override some dependencies
var concat = rewire(testHelper.APP_DIR + '/tasks/concat.js');

describe('tasks/concat.js', function () {
    var mockFsHandler,
        okDir,
        mockFs,
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

        concat.__set__("utils", {
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
            }
        });

        concat.__set__("fs", {
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
            // Faking file delete
            unlinkSync: function (filePath) {
                filePath = path.resolve(okDir, filePath);
                delete mockFs[filePath];
            }
        });
    });

    beforeEach(function () {
        // Init mock file system before every test case
        mockFs = {};

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
    });

    it('Return error if target path not under current root', function () {
        var options = {
            target: '/my/file.txt',
            files: []
        };

        concat.run.call(Context, options);

        var errorTemplate = errors.regex(concat.messages.E_TARGET_NOT_UNDER_ROOT);
        expect(Context._errors[0]).to.match(errorTemplate);
    });

    it('Return error if no files to concatenate', function () {
        var options = {
            target: path.resolve(okDir, 'my/file.txt'),
            files: []
        };

        concat.run.call(Context, options);

        var errorTemplate = errors.regex(concat.messages.E_NO_FILES);
        expect(Context._errors[0]).to.match(errorTemplate);
    });

    it('Return error if any of the files for contatenation are missing', function () {
        var options = {
            target: path.resolve(okDir, 'my/file.txt'),
            files: ['kuku.txt', 'lala.txt']
        };

        mockFsHandler('kuku.txt', 'kuku');

        concat.run.call(Context, options);

        var errorTemplate = errors.regex(concat.messages.E_FILE_NOT_EXIST);
        expect(Context._errors[0]).to.match(errorTemplate);
    });

    it('Return error if any of the files path is not a string', function () {
        var options = {
            target: path.resolve(okDir, 'my/file.txt'),
            files: ['kuku.txt', {}]
        };

        mockFsHandler('kuku.txt', 'kuku');

        concat.run.call(Context, options);

        var errorTemplate = errors.regex(concat.messages.E_FILES_WRONG_TYPE);
        expect(Context._errors[0]).to.match(errorTemplate);
    });

    it('Return warning if target exists and will be overriden', function () {
        var options = {
            target: path.resolve(okDir, 'my/file.txt'),
            files: ['kuku.txt']
        };

        mockFsHandler(options.target, '');
        mockFsHandler('kuku.txt', 'kuku');

        concat.run.call(Context, options);

        var warningTemplate = errors.regex(concat.messages.W_TARGET_OVERRIDE);
        expect(Context._warnings[0]).to.match(warningTemplate);
    });

    it('Data from files is appended', function () {
        var options = {
            target: 'my/file.txt',
            files: ['kuku.txt', 'lala.txt', 'bubu.txt']
        };

        mockFsHandler(options.target, '');
        mockFsHandler('kuku.txt', 'kuku');
        mockFsHandler('lala.txt', 'lala');
        mockFsHandler('bubu.txt', 'bubu');

        var expected = 'kuku\nlala\nbubu\n';
        concat.run.call(Context, options);

        var content = mockFsHandler(options.target);
        expect(content).to.equal(expected);
    });
});
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

// Rewiring delete task, so that we can override some dependencies
var deleteTask = rewire(testHelper.APP_DIR + '/tasks/delete.js');

describe('tasks/delete.js', function () {
    var mockFsHandler,
        directoryPath,
        okDir,
        mockFs,
        errorCases,
        Context;

    before(function () {
        okDir = process.cwd();

        // Define place that will be determined to be directory for fs.statSync().isDirectory() call
        directoryPath = path.resolve('i/am/directory');

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

        deleteTask.__set__("shelljs", {
            rm: function() {
                var options, target;
                if(arguments.length === 2) {
                    options = arguments[0];
                    target = arguments[1];
                } else {
                    target = arguments[0];
                }

                _.each(mockFs, function(content, mockPath) {
                    if(mockPath.indexOf(target) === 0 && options) {
                        delete mockFs[mockPath];
                    }
                });
            }
        });

        deleteTask.__set__("fs", {
            // Faking existsSync() of 'fs' node module
            existsSync: function (filePath) {
                filePath = path.resolve(okDir, filePath);
                return !_.isUndefined(mockFs[filePath]);
            },
            // Faking file delete
            statSync: function (filePath) {
                return {
                    isDirectory: function() {
                        return filePath === directoryPath;
                    },
                    isFile: function() {
                        return !this.isDirectory();
                    }
                }
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

        /**
         * To remove boilder plate from all error test-cases
         * @param options options to pass in copy run() method
         * @param error error template from copy messages object
         */
        errorCases = function(options, error) {
            var doneTriggered = false;

            deleteTask.run.call(Context, options, function () {
                var errorTemplate = errors.regex(error);
                expect(Context._errors[0]).to.match(errorTemplate);

                doneTriggered = true;
            });

            // Always check if done was called
            expect(doneTriggered).to.be.true;
        }
    });

    it('Return error if target items are not of type String', function () {
        var options = {
            target: [{}]
        };

        errorCases(options, deleteTask.messages.E_TARGET_ITEMS_WRONG_TYPE);
    });

    it('Return error if target items are not of type String', function () {
        var options = {
            target: path.resolve(process.cwd(), '../')
        };

        errorCases(options, deleteTask.messages.E_TARGET_CURRENT_ROOT);
    });

    it('Almost happy if target item does not exist', function () {
        var options = {
            target: 'kuku.json'
        };

        var doneTriggered = false;

        deleteTask.run.call(Context, options, function () {
            var warnTemplate = errors.regex(deleteTask.messages.W_TARGET_NOT_EXIST);
            expect(Context._warnings[0]).to.match(warnTemplate);

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });

    it('Happy happy - delete a file', function () {
        var options = {
            target: 'bum.txt'
        };

        mockFsHandler(options.target, true);

        var doneTriggered = false;

        deleteTask.run.call(Context, options, function () {
            var infoTemplate = errors.regex(deleteTask.messages.I_FILE_DELETED);
            expect(Context._infos[0]).to.match(infoTemplate);

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });

    it('Happy happy - delete directory', function () {
        var options = {
            target: directoryPath
        };

        // Add directory to fake file system
        mockFsHandler(options.target, true);

        var doneTriggered = false;

        deleteTask.run.call(Context, options, function () {
            var infoTemplate = errors.regex(deleteTask.messages.I_DIRECTORY_DELETED);
            expect(Context._infos[0]).to.match(infoTemplate);

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });

    it('Happy happy - delete file & directory', function () {
        var options = {
            target: [directoryPath, 'hey.txt']
        };

        // Add file & directory to fake file system
        mockFsHandler(options.target[0], true);
        mockFsHandler(options.target[1], true);

        var doneTriggered = false;

        deleteTask.run.call(Context, options, function () {
            var infoFileTemplate = errors.regex(deleteTask.messages.I_FILE_DELETED);
            expect(Context._infos[1]).to.match(infoFileTemplate);

            var infoDirectoryTemplate = errors.regex(deleteTask.messages.I_DIRECTORY_DELETED);
            expect(Context._infos[0]).to.match(infoDirectoryTemplate);

            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });
});


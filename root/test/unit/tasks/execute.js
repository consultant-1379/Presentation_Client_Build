var testHelper = require('../../index');

var expect = require('chai').expect,
    path = require('path'),
    util = require('util'),
    _ = require('lodash');

var badCommand = "badCommand", goodCommand = "goodCommand",
    badCommandStdErr = 'Error', goodCommandStdOut = 'We made it';

var errors = require(testHelper.APP_DIR + '/errors');

describe('tasks/execute.js', function () {
    var response = [],
        Context, oldies, rewire, execute;

    before(function () {
        // Caching original version of exec to replace it back
        oldies = {
            childProcessExec: require('child_process').exec
        };

        // Replacing global object to mock it for this test
        require('child_process').exec = function (cmd, cb) {
            if (cmd === badCommand) {
                cb(true, null, badCommandStdErr);
            } else if (cmd === goodCommand) {
                cb(false, goodCommandStdOut, null);
            } else {
                cb(false, null, null);
            }
        };

        // For utils mocking we use rewire
        rewire = require('rewire');

        // Load execute task
        execute = rewire(testHelper.APP_DIR + '/tasks/execute.js');

        execute.__set__('util', {
            error: function() { process.exit() },
            puts: function() { console.log(arguments); },
            format: function() { util.format.call(util.format, arguments) }
        });
    });

    after(function () {
        // Put back original instances of external modules objects
        require('child_process').exec = oldies.childProcessExec;
    });

    beforeEach(function () {
        // Create context for task, so that we can catch messages
        Context = {
            _errors: [],
            _warnings: [],
            _infos: [],

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

    it('Return error if target items are not of type String', function (done) {
        var doneTriggered = false;
        var options = {
            command: ''
        };

        execute.run.call(Context, options, function () {
            var expErrReg = errors.regex(execute.messages.E_NO_COMMAND_SPECIFIED);
            expect(Context._errors[0]).to.match(expErrReg);

            done();
            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });

    it.skip('Return error if execution raises an error', function (done) {
        var doneTriggered = false;
        var options = {
            command: badCommand
        };

        var logger = console.log;

        execute.run.call(Context, options, function () {
            var expErrReg = errors.regex(execute.messages.E_NO_COMMAND_SPECIFIED);
            expect(logger).to.match(expErrReg);

            done();
            doneTriggered = true;
        });

        // Always check if done was called
        expect(doneTriggered).to.be.true;
    });
});


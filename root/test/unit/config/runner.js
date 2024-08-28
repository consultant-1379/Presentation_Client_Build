var testHelper = require('../../index');

var expect = require('chai').expect,
    util = require('util'),
    rewire = require('rewire'),

    errors = require(testHelper.APP_DIR + '/errors'),
    fields = require(testHelper.APP_DIR + '/fields'),
    colorer = require(testHelper.APP_DIR + '/colorer'),
    runner = rewire(testHelper.APP_DIR + '/config/runner.js'),
    Runner = runner.Runner;

// Load valid configuration from external file
var configuration = require(testHelper.VALID_CONFIG_JSON);

describe('config/runner.js', function () {

    var configuration = {}, tasks, messages = [];

    before(function () {
        // Disable coloring for CLI
        colorer.useColors = false;

        // Setup simplified configuration, that contains only phases
        configuration[fields.PHASES] = {
            'clean': {
                'delete': {
                    target: 'file.txt'
                }
            }
        };

        // Mock out console for runner
        runner.__set__('console', {
            // By looking at source code in runner.js figured out index for real message to look for
            error: function () {
                var err = arguments[2];
                if (err) {
                    messages.push(err);
                }

            }, info: function () {
                var inf = arguments[2];
                if (inf) {
                    messages.push(inf);
                }
            }, warn: function () {
                var war = arguments[2];
                if (war) {
                    messages.push(war);
                }
            }, log: function () {
                var l = arguments[1];
                if (l) {
                    messages.push(l);
                }
            }
        });
    });

    beforeEach(function () {
        // Template for task
        tasks = {
            delete: {
                run: function (options, done) {
                    done()
                }
            }
        };

        // Renew messages list
        messages = [];
    });

    describe('run()', function () {

        it('Return error if phase not found', function (done) {
            var runner = new Runner(configuration, tasks);
            runner.run('none', function (err) {
                var errorTemplate = errors.regex(errors.R_NO_PHASE);
                expect(err).to.match(errorTemplate);

                done();
            });
        });

        // TODO: Verify - Possibly faced a bug in Mocha, when executing this particular test case with full test suite
        it.skip('Return an error if task timeouts', function (done) {
            // Update task to timeout
            var tasks = {};
            tasks['delete'] = {};
            tasks['delete']['run'] = function (options, finish) {
                setTimeout(finish, 50);
            };

            var runner = new Runner(configuration, tasks, 10);    // Set timeout to really small
            runner.run('clean', function (err) {
                var errorTemplate = errors.regex(errors.R_TASK_TIMEOUT);
                expect(err).to.match(errorTemplate);

                done();
            });
        });

        it('Check that sync task is executed synchronous', function (done) {

            tasks = {
                delete: {
                    run: function (options) {
                        // Does some magic
                    }
                }
            };

            var runner = new Runner(configuration, tasks);
            runner.run('clean', function (err) {
                expect(err).to.not.exist;

                done();
            });
        });

        it('Check that assync task is executed asynchronously', function (testDone) {
            var localTasks = {
                delete: {
                    run: function (options, done) {
                        // Does some magic asynchronously
                        process.nextTick(function () {
                            done();
                        });
                    }
                }
            };

            var runner = new Runner(configuration, tasks);
            runner.run('clean', function (err) {
                expect(err).to.not.exist;

                testDone();
            });
        });

        it('If error, info or warning is passed in from task, it is handlerd by runner', function (done) {
            var err = 'Error';
            var inf = 'Info';
            var war = 'Warning';

            // Make task return an error in console
            tasks['delete']['run'] = function (options, finish) {
                this.error(err);
                this.warn(war);
                this.info(inf);

                finish();
            };

            var runner = new Runner(configuration, tasks);
            runner.run('clean', function (runnerError) {
                var infoMessage = messages.pop();
                expect(infoMessage).to.equal(inf);

                var warnMessage = messages.pop();
                expect(warnMessage).to.equal(war);

                var errorMessage = messages.pop();
                expect(errorMessage).to.equal(err);

                done();
            });
        });
    });
});

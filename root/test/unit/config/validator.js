var testHelper = require('../../index');

var expect = require('chai').expect,
    util = require('util'),
    _ = require('lodash'),

    fields = require(testHelper.APP_DIR + '/fields'),
    errors = require(testHelper.APP_DIR + '/errors'),
    validator = require(testHelper.APP_DIR + '/config/validator.js');

// Load valid configuration from external file
var validConfiguration = require(testHelper.VALID_CONFIG_JSON);

describe('config/validator.js', function () {

    describe('validateConfiguration()', function () {

        var configForTest;

        beforeEach(function () {
            // Prepare teting object, that we will change to conform to particular tests
            configForTest = _.clone(validConfiguration, true);
        });

        it('return error if configuration is not of type object', function () {
            validator.validateConfiguration('', function (err) {
                var errTemplate = errors.regex(errors.V_CONFIG_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        describe('Properties', function () {
            // TODO: Have to check if gets an error if there is any
        });

        describe('External tasks', function () {
            it('return error if has defined external tasks, but with incorrect type', function () {
                configForTest[fields.EXTERNAL_TASKS] = {};

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_TASKS_WRONG_LIST_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined external tasks as string, but it is empty', function () {
                configForTest[fields.EXTERNAL_TASKS] = '';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_TASKS_ITEM_EMPTY_STRING);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined external tasks as array that is empty', function () {
                configForTest[fields.EXTERNAL_TASKS] = [];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_TASKS_LIST_EMPTY_ARRAY);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined external tasks as array that contains item that is not string', function () {
                configForTest[fields.EXTERNAL_TASKS] = [
                    { s: 2 }
                ];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_TASKS_WRONG_ITEMS_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined external tasks as array that contains empty string', function () {
                configForTest[fields.EXTERNAL_TASKS] = [''];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_TASKS_LIST_EMPTY_STRING);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Parents', function () {
            it('return error if has defined parent configuration, but with incorrect type', function () {
                configForTest[fields.PARENTS] = {};

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PARENTS_WRONG_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined parent configuration as string, but it is empty', function () {
                configForTest[fields.PARENTS] = '';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PARENTS_EMPTY_STRING);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined parent configuration as array that is empty', function () {
                configForTest[fields.PARENTS] = [];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PARENTS_EMPTY_ARRAY);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined parent configuration as array that contains item that is not string', function () {
                configForTest[fields.PARENTS] = [
                    {}
                ];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PARENTS_ITEMS_WRONG_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if has defined parent configuration as array that contains empty string', function () {
                configForTest[fields.PARENTS] = ['./correct/', ''];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PARENTS_ITEMS_EMPTY_STRING);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Phases', function () {
            it('return error if no phases are defined', function () {
                delete configForTest[fields.PHASES];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASES_MISSING);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if phases is not of type object', function () {
                configForTest[fields.PHASES] = '';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASES_WRONG_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if phases is of type object, but empty', function () {
                configForTest[fields.PHASES] = {};

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASES_NO_ITEMS);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if any phase is not of type object', function () {
                configForTest[fields.PHASES] = { clean: 1 };

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASE_WRONG_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if any phase does not contain any task', function () {
                configForTest[fields.PHASES] = { clean: {} };

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASE_NO_TASKS);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if any phase contains only "depends" to define phase dependencies, but no tasks', function () {
                configForTest[fields.PHASES] = { clean: { depends: [] } };

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASE_NO_TASKS);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Phases dependencies', function () {
            it('return array of errors if phase that is dependency for other phase is not found in list phases', function () {
                configForTest[fields.PHASES] = { clean: { depends: ['nophase'], concat: {} } };

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASE_MISSING_DEPENDENCY);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Phases circular dependencies', function () {
            it('return error if phases has circular dependency', function () {
                configForTest[fields.PHASES]['clean']['depends'] = 'test';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_PHASE_CIRCULAR_DEPENDENCY);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Default phase', function () {
            it('return error if default phase is not defined', function () {
                delete configForTest[fields.DEFAULT_PHASE];

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_DEFAULT_PHASE_MISSING);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if default phase is not of type String', function () {
                configForTest[fields.DEFAULT_PHASE] = {};

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_DEFAULT_PHASE_WRONG_TYPE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if default phase is empty String', function () {
                configForTest[fields.DEFAULT_PHASE] = '';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_DEFAULT_PHASE_EMPTY);
                    expect(err).to.match(errTemplate);
                });
            });

            it('return error if default phase is not contained in the list of phases', function () {
                configForTest[fields.DEFAULT_PHASE] = 'kuku';

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_DEFAULT_PHASE_NOT_FOUND);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Junk', function () {
            it('return error if there is junk in json file, that is not relevant to build configuration', function () {
                configForTest['some'] = 'junk';
                configForTest['other'] = { 'junk': 'is here' };

                validator.validateConfiguration(configForTest, function (err) {
                    var errTemplate = errors.regex(errors.V_JUNK);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Happy validation', function () {
            it('returns no error if configuration conforms to validation rules', function () {
                validator.validateConfiguration(configForTest, function (err) {
                    expect(err).to.not.exist;
                });
            });
        });
    });

    describe('validateTasksExistance()', function () {
        it('Returns error if task is not found in list of tasks', function () {
            var phases = { clean: { magic: {} } };
            var tasks = { delete: function() {} };

            validator.validateTasksExistance(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_TASK_NOT_FOUND);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns no error if task is found in list of tasks', function () {
            var phases = { clean: { delete: {} } };
            var tasks = { delete: function() {} };

            validator.validateTasksExistance(phases, tasks, function (err) {
                expect(err).to.not.exist;
            });
        });
    });

    describe('validateTasksOptions()', function () {
        it('Returns error if task options is not of type object', function () {
            var phases = { clean: { concat: '' } };
            var tasks = {};

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTIONS_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is empty object', function () {
            var phases = { clean: { concat: {} } };
            var tasks = {};

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTIONS_EMPTY);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is Object, that does not contain required option', function () {
            var phases = { clean: { concat: { other: 'option' } } };
            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES]['target'] = String;

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_REQUIRED_MISSING);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is Object, that contain required option, but is empty', function () {
            var phases = { clean: { concat: { target: '' } } };
            var tasks = { concat: {} };

            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES]['target'] = String;

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_REQUIRED_EMPTY);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is Object, that contain required option, but with wrong type', function () {
            var phases = { clean: { concat: { target: 123 } } };
            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES]['target'] = [Array, String];

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_REQUIRED_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is Object, that contains optional option, but with wrong type', function () {
            var phases = { clean: { concat: { target: [123], other: 'option' } } };

            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['target'] = String;

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_OPTIONAL_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns only one error if task options is Object, that contains optinal option, but with wrong type when task has multiple optional options', function () {
            var phases = { clean: { concat: { target: [123] } } };

            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['target'] = String;
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['other'] = String;

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_OPTIONAL_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns error if task options is Object, that contains optional option, but is empty', function () {
            var phases = { clean: { concat: { target: '' } } };
            var tasks = { concat: {} };

            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['target'] = String;

            validator.validateTasksOptions(phases, tasks, function (err) {
                var errTemplate = errors.regex(errors.V_OPTION_OPTIONAL_EMPTY);
                expect(err[0]).to.match(errTemplate);
            });
        });

        it('Returns no error if task options satisfy task required and optional properties', function () {
            var phases = { clean: { concat: { target: '123.js', attributes: ['test', 'deploy'] } } };

            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES]['target'] = String;

            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['attributes'] = Array;

            validator.validateTasksOptions(phases, tasks, function (err) {
                expect(err).to.not.exist;
            });
        });

        it('Returns no error if task options satisfy task required and optional properties where option has multiple types', function () {
            var phases = { clean: { concat: { target: '123.js', attributes: ['test', 'deploy'] } } };

            var tasks = { concat: {} };
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_REUIRED_PROPERTIES]['target'] = [String, Array];

            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES] = {};
            tasks['concat'][fields.TASKS_OPTIONAL_PROPERTIES]['attributes'] = [Array, String];

            validator.validateTasksOptions(phases, tasks, function (err) {
                expect(err).to.not.exist;
            });
        });
    });
});
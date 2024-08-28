var testHelper = require('../../index');

var expect = require('chai').expect,
    util = require('util'),

    fields = require(testHelper.APP_DIR + '/fields'),
    merger = require(testHelper.APP_DIR + '/config/merger.js');

describe('config/merger.js', function () {

    describe('mergeConfigs()', function () {

        it('returns current config if parent one is empty', function () {
            var current = {}, result;
            current[fields.PHASES] = {};
            current[fields.PHASES]['clean'] = {};

            result = merger.mergeConfigs(current, null);
            expect(result).to.eql(current);

            result = merger.mergeConfigs(current, {});
            expect(result).to.eql(current);
        });

        it('returns parent config if current one is empty', function () {
            var parent = {}, result;
            parent[fields.PHASES] = {};
            parent[fields.PHASES]['clean'] = {};

            result = merger.mergeConfigs(null, parent);
            expect(result).to.eql(parent);

            result = merger.mergeConfigs({}, parent);
            expect(result).to.eql(parent);
        });

        it('overrides parent config default phase with current one if provided', function () {
            var current = {};
            current[fields.DEFAULT_PHASE] = 'compile';
            current[fields.PHASES] = {};

            var parent = {};
            parent[fields.DEFAULT_PHASE] = 'test';

            var result = merger.mergeConfigs(current, parent);
            expect(result).to.eql(current);
        });
    });

    describe('mergeProperties()', function () {

        it('returns current properties if parent properties are empty', function () {
            var current = {}, result;
            current['some'] = 1;

            result = merger.mergeProperties(current, null);
            expect(result).to.eql(current);

            result = merger.mergeProperties(current, {});
            expect(result).to.eql(current);
        });

        it('returns parent properties if current properties are empty', function () {
            var parent = {}, result;
            parent['some'] = 1;

            result = merger.mergeProperties(null, parent);
            expect(result).to.eql(parent);

            result = merger.mergeProperties({}, parent);
            expect(result).to.eql(parent);
        });

        it('returns current properties with all the attributes, that were in parent properties, overridden', function () {
            var result,
                current = {},
                parent = {},
                expected = {};

            current['some'] = 1;

            parent['some'] = 6;
            parent['other'] = 2;

            expected['some'] = 1;
            expected['other'] = 2;

            result = merger.mergeProperties(current, parent);

            expect(result).to.eql(expected);
        });
    });

    describe('mergeTasks()', function () {

        it('returns tasks as array if they are provided as string', function () {
            var current = '/dir/to/other/tasks',
                parent = '/dir/to/tasks';

            var result = merger.mergeTasks(current, parent);

            expect(result).to.include(current);
            expect(result).to.include(parent);
        });

        it('returns current tasks if parent tasks are empty', function () {
            var current = '/dir/to/tasks',
                expected = [current], result;

            result = merger.mergeTasks(current, undefined);
            expect(result).to.eql(expected);

            result = merger.mergeTasks(current, '');
            expect(result).to.eql(expected);

            result = merger.mergeTasks(current, []);
            expect(result).to.eql(expected);
        });

        it('returns parent tasks if current tasks are empty', function () {
            var parent = ['/dir/to/tasks'], result;

            result = merger.mergeTasks(undefined, parent);
            expect(result).to.eql(parent);

            result = merger.mergeTasks('', parent);
            expect(result).to.eql(parent);

            result = merger.mergeTasks([], parent);
            expect(result).to.eql(parent);
        });

        it('returns tasks with no duplicating entries', function () {
            var current = ['/dir/to/tasks'],
                parent = ['/dir/to/tasks'];

            var result = merger.mergeTasks(current, parent);
            expect(result).to.eql(parent);
        });

        it('returns tasks, where first items are parent ones and only after that current ones ,so that current ones takes preference once loaded', function () {
            var current = '/dir/to/current/tasks',
                parent = '/dir/to/parent/tasks';

            var result = merger.mergeTasks(current, parent);
            expect(result[0]).to.eql(parent);
            expect(result[1]).to.eql(current);
        });
    });

    describe('mergePhases()', function () {

        it('returns current phases if parent phases are empty', function () {
            var current = {}, result;
            current['clean'] = {};

            result = merger.mergePhases(current, null);
            expect(result).to.eql(current);

            result = merger.mergePhases(current, {});
            expect(result).to.eql(current);
        });

        it('returns parent phases if current phases are empty', function () {
            var parent = {}, result;
            parent['clean'] = {};

            result = merger.mergePhases(null, parent);
            expect(result).to.eql(parent);

            result = merger.mergePhases({}, parent);
            expect(result).to.eql(parent);
        });

        // If parent phase contains the same phase as current does, the current will be taken into account
        it('returns current phases with all the attributes, that were in parent phases, overridden', function () {
            var result,
                current = {},
                parent = {},
                expected = {};

            current['clean'] = 1;

            parent['clean'] = 6;
            parent['compile'] = 2;

            expected['clean'] = 1;
            expected['compile'] = 2;

            result = merger.mergePhases(current, parent);

            expect(result).to.eql(expected);
        });
    });
});

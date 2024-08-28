var testHelper = require('../../index');

var expect = require('chai').expect,
    util = require('util'),

    errors = require(testHelper.APP_DIR + '/errors'),
    propertiesHelper = require(testHelper.APP_DIR + '/config/properties.js');

describe('lib/config/properties.js', function () {

    describe('parse()', function () {
        describe('Conditional properties', function() {
            it('Returns error if condition prefix not found', function () {
                var properties = {
                    'am': {
                        '?my.skill=magic': 'magician'
                    }
                };

                propertiesHelper.parse(properties, function(err) {
                    var errTemplate = errors.regex(errors.P_PARSE_WRONG_CONDITION_PREFIX);
                    expect(err).to.match(errTemplate);
                });
            });

            it('Returns error if condition postfix not found', function () {
                var properties = {
                    'bad': {
                        '?os.name=linux': 'value'
                    }
                };

                propertiesHelper.parse(properties, function(err) {
                    var errTemplate = errors.regex(errors.P_PARSE_WRONG_CONDITION_POSTFIX);
                    expect(err).to.match(errTemplate);
                });
            });

            it('Returns error if none of conditions has matched', function () {
                var properties = {
                    'bad': {
                        '?os.platform=kuku': 'value1',
                        '?os.platform=tutu': 'value2',
                        '?os.platform=lala': 'value3'
                    }
                };

                propertiesHelper.parse(properties, function(err) {
                    var errTemplate = errors.regex(errors.P_PARSE_NO_CONDITIONS_MET);
                    expect(err).to.match(errTemplate);
                });
            });
        });

        describe('Replaceables in properties', function() {
            it('Returns error if replaceable not found in list of properties', function () {
                var properties = {
                    'some': 'property',
                    'other': 'Hey where is $(kuku)'
                };

                propertiesHelper.parse(properties, function(err) {
                    var errTemplate = errors.regex(errors.P_PARSE_MISSING_REPLACEABLE);
                    expect(err).to.match(errTemplate);
                });
            });

            it('Returns error if replaceables leads to circular reference', function() {
                var properties = {
                    'name': 'James $(subject)',
                    'surname': 'Carnoby',
                    'fullname': '$(name) $(surname)',
                    'subject': 'Hey $(fullname), how are you?'
                };

                propertiesHelper.parse(properties, function(err) {
                    var errTemplate = errors.regex(errors.P_PARSE_CIRCULAR_DEPENDENCY);
                    expect(err).to.match(errTemplate);
                });
            });

            it('Returns the same properties object if no replaceables found', function () {
                var properties = {
                    'some': 'property'
                };

                propertiesHelper.parse(properties, function(err, result) {
                    expect(err).to.not.exist;
                    expect(result).to.eql(properties);
                });
            });

            it('Returns object with properties, where replaceables are replaced, if they exist', function() {
                var properties = {
                    'some': 'property',
                    'title': 'Hey this is $(some)'
                };

                var expectedTitle = 'Hey this is property';

                propertiesHelper.parse(properties, function(err, result) {
                    expect(err).to.not.exist;
                    expect(result['title']).to.equal(expectedTitle);
                });
            });
        });

        it('Returns parsed object, if there is conditional property, that contains replaceable in value', function () {
            var properties = {
                'title': 'Title for the sunny day',
                'sun': {
                    // As tests are run both on windows and linux, we keep the same value
                    '?os.platform=windows': '$(title)',
                    '?os.platform=linux': '$(title)'
                }
            };

            propertiesHelper.parse(properties, function(err, result) {
                expect(err).to.not.exist;
                expect(result['sun']).to.equal(result['title']);
            });
        });
    });

    describe('apply()', function () {

        it('Return error if replaceable property in object is not found in list of properties', function () {
            propertiesHelper.apply('This is $(my)', { 'other': 'value' }, function (err) {
                var errTemplate = errors.regex(errors.P_PARSE_MISSING_REPLACEABLE);
                expect(err).to.match(errTemplate);
            })
        });

        it('Return the same object, if it does not contain replaceable properties', function () {
            var obj = 'This is some string without replaceable';

            propertiesHelper.apply(obj, {}, function (err, result) {
                expect(err).to.not.exist;
                expect(result).to.equal(obj);
            })
        });

        it('Return object with replaced properties, if it contains replaceable properties', function () {
            var obj = 'This is $(me) and this is $(you) and again $(you)';
            var expectedObj = 'This is test and this is property and again property';

            var properties = { 'me': 'test', 'you': 'property' };

            propertiesHelper.apply(obj, properties, function (err, result) {
                expect(err).to.not.exist;
                expect(result).to.equal(expectedObj);
            })
        });
    });

    describe('validateProperties()', function () {

        it('return error if has properties, but is not of type plain object - {}', function () {
            propertiesHelper.validateProperties('', function (err) {
                var errTemplate = errors.regex(errors.P_LIST_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });

        it('return error if has properties, but is of type plain object and empty', function () {
            propertiesHelper.validateProperties({}, function (err) {
                var errTemplate = errors.regex(errors.P_LIST_EMPTY);
                expect(err).to.match(errTemplate);
            });
        });

        it('return array of errors if has properties and they are not of correct type', function () {
            propertiesHelper.validateProperties({ "test": [] }, function (err) {
                var errTemplate = errors.regex(errors.P_WRONG_TYPE);
                expect(err).to.match(errTemplate);
            });
        });
    });

    describe('validateProperty()', function () {

        it('returns error if property is empty string', function () {
            var value = '';

            propertiesHelper.validateProperty('name', value, function (err) {
                var errTemplate = errors.regex(errors.P_EMPTY_STRING);
                expect(err).to.match(errTemplate);
            });
        });

        // TODO: Should validate, that item contains $(...) that will be replaced

        it('returns error if property is empty Object', function () {
            var value = {};

            propertiesHelper.validateProperty('name', value, function (err) {
                var errTemplate = errors.regex(errors.P_EMPTY_OBJECT);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if property is Object, that does not contain conditions', function () {
            var value = { 'value': 1 };

            propertiesHelper.validateProperty('name', value, function (err) {
                var errTemplate = errors.regex(errors.P_WRONG_CONDITION_FORMAT);
                expect(err[0]).to.match(errTemplate);
            });
        });

        it('returns error if property is Object, that contain condition, but with wrong value type', function () {
            var value = {
                "?os.family=unix": 12
            };

            propertiesHelper.validateProperty('name', value, function (err) {
                var errTemplate = errors.regex(errors.P_CONDITION_WRONG_VALUE_TYPE);
                expect(err[0]).to.match(errTemplate);
            });
        });

        it('returns no error if property is string, that has some content', function () {
            var value = 'value';

            propertiesHelper.validateProperty('name', value, function (err) {
                expect(err).to.not.exist;
            });
        });

        it('returns no error if property is Object, that contains conditions in correct format', function () {
            var value = {
                "?os.family=unix": "value"
            };

            propertiesHelper.validateProperty('name', value, function (err) {
                expect(err).to.not.exist;
            });
        });
    });
});
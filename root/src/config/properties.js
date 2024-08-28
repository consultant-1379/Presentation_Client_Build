var _ = require('lodash'),
    util = require('util'),

    errors = require('../errors'),
    fields = require('../fields'),
    conditions = require('./conditions/index');

var REPLACEABLE_REGEX = new RegExp('\\$\\(([a-zA-Z._]+)\\)', 'gm');

exports.parse = function (properties, cb) {
    var resolveErrors = [];

    // Resolve conditional properties to their matching values
    Object.keys(properties).forEach(function (name) {
        conditions.resolve(name, properties[name], function (err, value) {
            if (err) {
                resolveErrors.push(err);
            } else {
                properties[name] = value;
            }
        });
    });

    if (resolveErrors.length > 0) {
        cb(resolveErrors);
        return;
    }

    validateProperties(properties, function (err) {
        if (err) {
            cb(err);
        } else {
            // Check for circular dependencies in properties
            checkCircularDependency(properties, function (err) {
                if (err) {
                    cb(err);
                } else {
                    exports.apply(properties, properties, function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, result);
                        }
                    });
                }
            });
        }
    });
};

exports.apply = function (obj, properties, cb) {

    function replacer(str, match) {
        if (properties[match]) {
            return properties[match];
        } else {
            throw new SyntaxError(util.format(errors.P_PARSE_MISSING_REPLACEABLE, match));
        }
    }

    function walk(obj) {
        if (_.isString(obj)) {
            return obj.replace(REPLACEABLE_REGEX, replacer);
        } else if ((_.isArray(obj) || _.isPlainObject(obj)) && !_.isEmpty(obj)) {
            Object.keys(obj).forEach(function (o) {
                obj[o] = walk(obj[o]);
            });
        }

        return obj;
    }

    var error;
    try {
        obj = walk(obj);
    } catch (e) {
        error = e.message;
    }

    if (error) {
        cb(error);
    } else {
        cb(null, obj);
    }
};

var validateProperties = exports.validateProperties = function (properties, cb) {
    if (_.isPlainObject(properties)) {
        if (_.isEmpty(properties)) {
            cb(util.format(errors.P_LIST_EMPTY, fields.PROPERTIES));
        } else {
            var hasError = Object.keys(properties).some(function (prop) {
                var value = properties[prop];
                var propertyValidationErrors = null;

                exports.validateProperty(prop, value, function (err) {
                    propertyValidationErrors = err;
                });

                if (!_.isEmpty(propertyValidationErrors)) {
                    cb(propertyValidationErrors);
                    return true;
                }

                return false;
            });

            if (!hasError) {
                cb(null);
            }
        }
    } else {
        cb(util.format(errors.P_LIST_WRONG_TYPE, fields.PROPERTIES));
    }
};

var validateProperty = exports.validateProperty = function (name, value, cb) {
    var isObj = _.isPlainObject(value),
        isStr = _.isString(value);

    if (!isObj && !isStr) {
        cb(util.format(errors.P_WRONG_TYPE, name, name, name));
    } else if (isObj) {
        if (_.isEmpty(value)) {
            cb(util.format(errors.P_EMPTY_OBJECT, name, name));
            return;
        }

        var conditionErrors = [];
        var conditionRegex = conditions.getConditionRegex();
        _.each(value, function (condValue, condName) {
            if (conditionRegex.test(condName)) {
                if (!_.isString(condValue)) {
                    conditionErrors.push(util.format(errors.P_CONDITION_WRONG_VALUE_TYPE, name));
                }
            } else {
                conditionErrors.push(util.format(errors.P_WRONG_CONDITION_FORMAT, name, name));
            }
        });

        if (conditionErrors.length > 0) {
            cb(conditionErrors);
        } else {
            cb(null);
        }

    } else if (isStr && _.isEmpty(value)) {
        cb(util.format(errors.P_EMPTY_STRING, name, name));
    }
};

function checkCircularDependency(properties, cb) {
    function walk(properties, property, depends, seen, resolved) {
        seen.push(property);

        depends.forEach(function (dependency) {
            if (!_.contains(resolved, dependency)) {
                if (_.contains(seen, dependency)) {
                    throw new Error(util.format(errors.P_PARSE_CIRCULAR_DEPENDENCY, dependency, property));
                }

                walk(properties, dependency, properties[dependency] || [], seen, resolved);
            }
        });

        resolved.push(property);
    }

    // Build dependency tree
    var dependencyTree = {};
    Object.keys(properties).some(function (name) {
        dependencyTree[name] = getReplaceableProperties(properties[name]);
    });

    var hasError = false,
        resolved = [];

    Object.keys(dependencyTree).every(function (property) {
        var dependencies = dependencyTree[property];

        try {
            walk(dependencyTree, property, dependencies || [], [], resolved);
        } catch (error) {
            cb(error.message);
            hasError = true;
        }

        return hasError;
    });

    if (!hasError) {
        cb(null);
    }
}

function getReplaceableProperties(obj) {
    var stripped = [];

    obj.replace(REPLACEABLE_REGEX, function (str, match) {
        stripped.push(match);
        return str;
    });

    return stripped;
}
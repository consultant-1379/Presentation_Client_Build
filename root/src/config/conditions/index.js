var _ = require('lodash'),
    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    errors = require('../../errors');

var conditions = {};

// Load conditions
var prefixs = fs.readdirSync(path.resolve(__dirname));
prefixs.forEach(function (pre) {
    var prePath = path.resolve(__dirname, pre);
    if (fs.statSync(prePath).isDirectory()) {
        conditions[pre] = {};

        var postfixs = fs.readdirSync(prePath);
        postfixs.forEach(function (post) {
            var postExtension = path.extname(post);
            var postPath = path.resolve(prePath, post);
            var postName = post.replace(postExtension, '');

            if (postExtension === '.js') {
                conditions[pre][postName] = require(postPath);
            }
        });
    }
});

// Makes condition regular expression available
exports.getConditionRegex = function() {
    return new RegExp('^\\?([a-zA-Z]+)\\.([a-zA-Z]+)=(.+)$');
};

/**
 * Resolve property, that contains conditions
 * @param propName Property name, that is used for error message
 * @param propValue Property value that contains conditions
 * @param cb Callback, that returns (null, value) in case there is no error or (error) if resolving was unsuccessful
 */
exports.resolve = function (propName, propValue, cb) {

    // TODO: Move conditions validator here
    if (_.isPlainObject(propValue)) {
        var matchingValue = undefined;

        // Iterate through property conditions to find which one matches
        Object.keys(propValue).some(function (condition) {
            var finished = false;
            prepare(condition, function (err, prefix, postfix, conditionValue) {
                if (err) {
                    cb(err);
                    finished = true;
                } else if (conditions[prefix][postfix].match(conditionValue)) {
                    matchingValue = propValue[condition];
                }
            });

            return finished;
        });

        if (_.isUndefined(matchingValue)) {
            // There is no matching conditions - error is raised
            cb(util.format(errors.P_PARSE_NO_CONDITIONS_MET, propName));
        } else {
            // Found matching value
            cb(null, matchingValue);
        }
    } else {
        // If property was of type String, we return the same value
        cb(null, propValue);
    }
};

/**
 * Get the list of available conditions and their values that they can correspond to
 * @return {}
 */
exports.getConditions = function () {
    return {};
    // TODO: Implement returning of available conditions
};

function prepare(conditionString, cb) {
    var match = conditionString.match(exports.getConditionRegex());

    if (match && match.length > 3) {
        var prefix = match[1];
        var postfix = match[2];
        var value = match[3];

        if (!conditions[prefix]) {
            cb(util.format(errors.P_PARSE_WRONG_CONDITION_PREFIX, prefix, conditionString));
        } else if (!conditions[prefix][postfix]) {
            cb(util.format(errors.P_PARSE_WRONG_CONDITION_POSTFIX, postfix, conditionString));
        } else {
            cb(null, prefix, postfix, value);
        }
    }
}
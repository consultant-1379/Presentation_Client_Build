var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    _ = require('lodash');

var colorer = require('./colorer');

/* Logging tools */
exports.error = function (messages) {
    log(messages, 'error', true, true);
};

exports.info = function (messages, addSpaces) {
    if (addSpaces !== false) {
        addSpaces = true;
    }

    log(messages, 'info', addSpaces);
};

exports.warning = function (messages, addSpaces) {
    if (addSpaces !== false) {
        addSpaces = true;
    }

    log(messages, 'warn', addSpaces);
};

/* Array tools */
var arrayify = exports.arrayify = function arrayify(obj) {
    if (!_.isUndefined(obj)) {
        if (util.isArray(obj)) {
            return obj;
        } else if (!_.isEmpty(obj)) {
            return [obj];
        } else {
            return [];
        }
    } else {
        return [];
    }
};

exports.mkdirp = function (pathDir) {
    if (!fs.existsSync(pathDir)) {
        var relativeTargetPath = path.relative(process.cwd(), pathDir);
        var relativeTargetPathParts = relativeTargetPath.split(path.sep);

        var createPath = '';
        relativeTargetPathParts.forEach(function (part) {
            createPath += part;
            if (!fs.existsSync(createPath)) {
                fs.mkdirSync(createPath);
            }

            createPath += '/';
        });
    }
};

function log(messages, type, addSpaces, exit) {

    if (addSpaces === true) {
        console[type]();
    }

    arrayify(messages).forEach(function (msg) {
        if (msg instanceof Error) {
            msg = msg.message;
        }

        if (type === 'error') {
            console[type]('  ', colorer.error('(e): ' + msg));
        } else {
            var identifier;
            if (type === 'warn') {
                identifier = colorer.warn('(w)');
            } else if (type === 'info') {
                identifier = colorer.info('(i)');
            }

            console[type]('  ', identifier, msg);
        }
    });

    if (exit) {
        process.exit(1);
    }
}

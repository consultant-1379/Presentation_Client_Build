var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    shelljs = require('shelljs'),
    util = require('util'),
    glob = require('glob');

var utils = require('../utils');

const regexForWildcard = /[*?]/;

module.exports = {
    requiredOptions: {
        'from': [String, Array],
        'to': String
    },
    messages: {
        E_TO_NO_WILDCARDS: 'Path where to copy "%s" should not contain wildcards',
        E_TO_NOT_UNDER_ROOT: 'Path where to copy "%s" is not under current root "%s"',
        E_FROM_ITEMS_EMPTY: 'List of files to copy is empty',
        E_FROM_WRONG_TYPE: 'From array should contain only objects of type String',
        E_FROM_EMPTY: 'From array items should not be empty',
        E_FROM_NO_PATH: 'Path to copy from "%s" does not exist',
        E_FROM_NOT_UNDER_ROOT: 'Path to copy from "%s" is not under current root "%s"',
        E_FROM_DIR_TO_FILE: 'It is not possible to copy directory "%s" to file "%s"',
        E_CIRCULAR: 'You can\'t copy to path "%s" that is under location you copy from "%s"',

        I_COPY_TO: 'Copying to "%s"',
        I_COPIED: '- Copied "%s"'

    },
    run: function (options, done) {
        var fromPaths = utils.arrayify(options.from);
        var toPath = options.to;

        var messages = module.exports.messages;

        // Determine if toPath is actually a directory
        var toIsDirectory = toPath.substr(-1) === '/';

        // Validate if we have wildcards in toPath, as we should not

        if (regexForWildcard.test(toPath)) {
            this.error(util.format(messages.E_TO_NO_WILDCARDS, toPath));
        }

        var toFullPath = path.resolve(toPath);
        var currentWorkingDir = process.cwd();

        if (toFullPath.indexOf(currentWorkingDir) !== 0) {
            this.error(util.format(messages.E_TO_NOT_UNDER_ROOT, toFullPath, currentWorkingDir));
        } else {
            // Prepare list of files to be copied
            var fromFilesList = [], self = this;
            fromPaths.every(function (from) {
                if (!_.isString(from)) {
                    self.error(messages.E_FROM_WRONG_TYPE);
                    return false;
                }

                if (_.isEmpty(from)) {
                    self.error(messages.E_FROM_EMPTY);
                    return false;
                }

                if (regexForWildcard.test(from)) {
                    // Run through glob if we have wildcard
                    var items = glob.sync(from, { nonegate: true, nobrace: true, noext: true });
                    fromFilesList = fromFilesList.concat(items);
                } else {
                    fromFilesList.push(from);
                }

                return true;
            });

            if (fromFilesList.length === 0) {
                this.error(messages.E_FROM_ITEMS_EMPTY);
            } else {
                this.info(util.format(messages.I_COPY_TO, toFullPath));

                if (toIsDirectory) {
                    // If path where to copy does not exist, we create folders up to toPath
                    utils.mkdirp(toFullPath);
                } else {
                    // If path where to copy does not exist, we create folders up to toPath
                    utils.mkdirp(path.dirname(toFullPath));
                }

                fromFilesList.every(function (from) {
                    // Resolve to full path
                    var fromFullPath = path.resolve(from);

                    if (!fs.existsSync(fromFullPath)) {
                        self.error(util.format(messages.E_FROM_NO_PATH, prepPathForMessage(from)));
                        return false;
                    } else if (fromFullPath.indexOf(currentWorkingDir) !== 0) {
                        self.error(util.format(messages.E_FROM_NOT_UNDER_ROOT, prepPathForMessage(from), currentWorkingDir));
                        return false;
                    } else if (toFullPath.indexOf(fromFullPath) === 0) {
                        self.error(util.format(messages.E_CIRCULAR, prepPathForMessage(toPath), prepPathForMessage(from)));
                        return false;
                    } else {
                        var fromIsDirectory = fs.statSync(fromFullPath).isDirectory();
                        if (!toIsDirectory && fromIsDirectory) {
                            self.error(util.format(messages.E_FROM_DIR_TO_FILE, prepPathForMessage(from), prepPathForMessage(toPath)));
                            return false;
                        } else if (fromIsDirectory) {
                            shelljs.cp('-Rf', fromFullPath, toFullPath);
                        } else {
                            shelljs.cp(fromFullPath, toFullPath);
                        }
                    }

                    self.info(util.format(messages.I_COPIED, prepPathForMessage(from)), false);

                    return true;
                });
            }
        }

        done();
    }
};

function prepPathForMessage(fullPath) {
    return path.relative(process.cwd(), fullPath);
}
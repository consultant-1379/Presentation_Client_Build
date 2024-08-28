var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var util = require('util');
var shelljs = require('shelljs');

module.exports = {
    requiredOptions: {
        'target': [String, Array]
    },
    messages: {
        E_TARGET_ITEMS_WRONG_TYPE: 'Even in array of targets, they should be of type String',
        E_TARGET_CURRENT_ROOT: 'Path to be deleted "%s" is not under current root "%s"',

        W_TARGET_NOT_EXIST: 'Path to be deleted "%s" does not exist',

        I_DIRECTORY_DELETED: 'Directory "%s" deleted',
        I_FILE_DELETED: 'File "%s" deleted'
    },
    run: function (options, done) {
        var targets = [];

        if (_.isString(options.target)) {
            targets = [options.target];
        } else {
            targets = options.target;
        }

        var messages = module.exports.messages;

        var self = this;
        targets.every(function (target) {

            // Target should be of type string
            if (!_.isString(target)) {
                self.error(messages.E_TARGET_ITEMS_WRONG_TYPE);
                return false;
            } else {
                // Resolve full path for target
                target = path.resolve(target);

                if (target.indexOf(process.cwd()) !== 0) {
                    self.error(util.format(messages.E_TARGET_CURRENT_ROOT, target, process.cwd()));
                    return false;
                } else {
                    if (fs.existsSync(target)) {
                        var stat = fs.statSync(target);
                        if (stat.isDirectory()) {
                            shelljs.rm('-rf', target);

                            self.info(util.format(messages.I_DIRECTORY_DELETED, target));
                        } else if (stat.isFile()) {
                            shelljs.rm(target);

                            self.info(util.format(messages.I_FILE_DELETED, target));
                        }
                    } else {
                        self.warn(util.format(messages.W_TARGET_NOT_EXIST, target));
                    }
                }
            }

            return true;
        });

        done();
    }
};
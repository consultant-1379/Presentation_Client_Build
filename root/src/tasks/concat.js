var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    utils = require('../utils'),
    _ = require('lodash');

module.exports = {
    // Define required options for validation
    requiredOptions: {
        'target': String,
        'files': Array
    },
    messages: {
        E_TARGET_NOT_UNDER_ROOT: 'Target path "%s" is not under current root "%s"',
        E_NO_FILES: 'No files provided for concatenation',
        E_FILE_NOT_EXIST: 'File "%s" does not exist',
        E_FILES_WRONG_TYPE: 'Files array should contain only String',

        W_TARGET_OVERRIDE: 'Target file "%s" exists and will be overriden',

        I_CONCATENATE_IN: 'Concatenating files in %s',
        I_APPENDED: '- appended %s'
    },
    run: function (options) {
        var files = options.files;
        var target = options.target;

        var messages = module.exports.messages;

        var targetFullPath = path.resolve(target);
        if (targetFullPath.indexOf(process.cwd()) !== 0) {
            this.error(util.format(messages.E_TARGET_NOT_UNDER_ROOT, target, process.cwd()));
        } else {
            // In case folders does not exist to fullfil path to target, we create them
            utils.mkdirp(path.dirname(targetFullPath));

            if (fs.existsSync(target)) {
                this.warn(util.format(messages.W_TARGET_OVERRIDE, target));
                fs.unlinkSync(target);
            }

            if (files.length === 0) {
                this.error(messages.E_NO_FILES);
            } else {
                this.info(util.format(messages.I_CONCATENATE_IN, target));

                var self = this;
                files.every(function (file) {
                    if (_.isString(file)) {
                        if (file.trim() !== '') {
                            // Read each file + append to the end of mentioned file
                            var filePath = path.resolve(file); // To put the full path to the file

                            if (!fs.existsSync(filePath)) {
                                self.error(util.format(messages.E_FILE_NOT_EXIST, prepPathForMessage(filePath)));
                                return false;
                            }

                            var data = fs.readFileSync(filePath);
                            fs.appendFileSync(target, data + '\n');

                            self.info(util.format(messages.I_APPENDED, prepPathForMessage(file)), false);
                        }

                        return true;
                    } else {
                        self.error(messages.E_FILES_WRONG_TYPE);
                        return false;
                    }
                });
            }
        }
    }
};

function prepPathForMessage(fullPath) {
    return path.relative(process.cwd(), fullPath);
}
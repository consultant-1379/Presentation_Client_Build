var exec = require('child_process').exec;
var util = require('util');
var path = require('path');
var _ = require('lodash');

var utils = require('../utils');

module.exports = {
    requiredOptions: {
        'command': String
    },
    optionalOptions: {
        'attributes': [String, Array]
    },
    messages: {
        E_NO_COMMAND_SPECIFIED: 'No command specified for execution',
        E_EXECUTION_ERROR: 'There was an error executing command (exit code: %s)',

        I_EXECUTING: 'Executing "%s"'
    },
    run: function (options, done) {
        var command = options.command;
        var attributes = utils.arrayify(options.attributes) || [];

        var messages = module.exports.messages;

        if (_.isEmpty(command)) {
            this.error(messages.E_NO_COMMAND_SPECIFIED);
            done();
            return;
        }

        // To be on the safe side, trim command, if there are unnecessary whitespace characters
        var executableCommand = command.trim();

        // Append attributes to command
        if (attributes.length > 0) {
            executableCommand += ' ' + attributes.join(' ');
        }

        var self = this;

        // Normalize execution command, as slashes matter a lot
        executableCommand = path.normalize(executableCommand);

        this.info(util.format(messages.I_EXECUTING, executableCommand));

        // Finally execute command with attributes
        exec(executableCommand, function (error, stdout, stderr) {
            if (error) {
                // Get the exit code:
                var exitCode = error.code;

                // Output a message that there has been an error
                self.error(util.format(messages.E_EXECUTION_ERROR, exitCode));

                // Add new line to make it look good
                util.error('');

                var message = error.message || stderr;

                var errLines = message.split('\n');
                errLines.forEach(function (line) {
                    util.error('     ' + line);
                });

                if (exitCode > 0) {
                    // In case there was an execution error, there is no need to continue the build process
                    process.exit(exitCode);
                }
            } else {
                if (stdout) {
                    // Add new line to make it look good
                    util.puts();

                    var stdLines = stdout.split('\n');
                    stdLines.forEach(function (line) {
                        util.puts('     ' + line);
                    });
                }
            }

            done();
        });
    }
};
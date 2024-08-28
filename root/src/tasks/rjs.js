var util = require('util'),
    requirejs = require('requirejs');

module.exports = {
    // Define required options for validation
    requiredOptions: {
        'config': Object
    },
    run: function (options, done) {
        var config = options.config;

        requirejs.optimize(config, function (buildResponse) {
            // Add new line to make it look good
            util.puts();

            var stdLines = buildResponse.split('\n');
            stdLines.forEach(function (line) {
                util.puts('     ' + line);
            });

            done();
        });
    }
};
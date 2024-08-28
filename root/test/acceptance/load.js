var path = require('path');
var cover = process.env['COVER'];

var libName = cover ? 'src-cov/' : 'src';
exports.APP_DIR = path.resolve(__dirname, '../..', libName);

describe('Testing build.load() as single entry point for build system', function() {

    before(function() {
        // Load good configuration
    });

});

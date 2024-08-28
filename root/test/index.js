var path = require('path');
var cover = process.env['COVER'];

// Handling for the case when you do tests with code coverage
var srcDir = cover ? 'src-cov/' : 'src';

exports.APP_DIR = path.resolve(__dirname, '..', srcDir);
exports.VALID_CONFIG_JSON = path.resolve(__dirname, 'validConfig.json');

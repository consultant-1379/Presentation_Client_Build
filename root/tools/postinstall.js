#!/usr/bin/env node

if(!!process.platform.match(/^win/)) {
    // If we are under windows, we do not care about executables for Unix systems
    process.exit(0);
}

console.log('Running postinstall script to set permissions for executable tools');

var fs = require('fs');
var path = require('path');

var pathToTools = __dirname;

fs.chmodSync(path.resolve(pathToTools, 'jscoverage/jscoverage'), 0755);
fs.chmodSync(path.resolve(pathToTools, 'jscoverage/jscoverage-server'), 0755);
fs.chmodSync(path.resolve(pathToTools, 'nodejs/bin/node'), 0755);
fs.chmodSync(path.resolve(pathToTools, 'nodejs/bin/node-waf'), 0755);
fs.chmodSync(path.resolve(pathToTools, 'nodejs/bin/npm'), 0755);
fs.chmodSync(path.resolve(pathToTools, 'phantomjs/bin/phantomjs'), 0755);

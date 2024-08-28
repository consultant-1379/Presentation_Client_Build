#!/usr/bin/env node

var loader = require('./config/loader'),
    validator = require('./config/validator'),
    Runner = require('./config/runner').Runner,
    utils = require('./utils'),
    fields = require('./fields'),

    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    program = require('commander'),
    _ = require('lodash');

var colorer = require('./colorer');

// get version from package.json
var version;
var packageJsonContent = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8');
try {
    var packageJson = JSON.parse(packageJsonContent);
    version = packageJson.version;
} catch (e) {
    console.log('There was an error parsing package.json file:', e.message);
    process.exit(1);
}

// Instantiate commands & options
program
    .version(version)
    .option('--no-color', 'remove coloring for CLI messages', false);

program
    .command('build [phase]')
    .option('-f, --config-file-name <file>', 'specify build config json file other than default "build.json"')
    .option('-t, --timeout <miliseconds>', 'set timeout for task execution', parseInt)
    .option('-e, --exclusive', 'run phase exclusively, without running phase dependencies')
    .option('--show-tasks', 'list build tasks')
    .option('--show-phases', 'list phases from configuration file')
    .option('--show-configuration', 'show loaded & merged configuration')
    .description('perform build on provided or default phase')
    .action(function (phase, options) {
        // Set coloring flag for CLI
        colorer.useColors = program.color;

        var fileName = getConfigFileName(options.configFileName);
        var fileDir = getConfigFileDirectory(options.configFileName);

        if (options.showTasks) {
            load(fileName, fileDir, function (config, tasks) {
                console.log('');
                console.log('  List of available tasks:');
                for (var task in tasks) {
                    console.log('    ' + task);
                }
            });
        } else if (options.showPhases) {
            load(fileName, fileDir, function (config, tasks) {
                console.log('');
                console.log('  List of phases:');
                for (var phase in config[fields.PHASES]) {
                    console.log('    ' + phase);
                }
            });
        } else if (options.showConfiguration) {
            load(fileName, fileDir, function (config, tasks) {
                console.log('');
                console.log('Current loaded & merged configuration: ');
                console.log(JSON.stringify(config, null, 2));
            });
        } else {
            load(fileName, fileDir, function (config, tasks) {
                phase = phase || config[fields.DEFAULT_PHASE];

                // Flag to not run exclusively only current phase, without it's dependencies
                if (options.exclusive) {
                    delete config[fields.PHASES][phase][fields.PHASES_DEPENDS];
                }

                var runInstance = new Runner(config, tasks, options.timeout);  // Set timeout that was provided in CLI
                runInstance.run(phase, function (err) {
                    if (err) {
                        utils.error(err);
                    }
                });
            });
        }
    });

program
    .command('init')
    .option('--name <name>', 'provide app name')
    .option('--namespace <namespace>', 'provide app namespace')
    .description('initialize skeleton for application')
    .action(function () {
        // Set coloring flag for CLI
        colorer.useColors = program.color;

        console.log('Initialize skeleton for application');

        // Check that directory is clean
        // Ask bunch of questions
        // Generate skeleton based on questions
    });

program
    .command('start')
    .option('--port <port>', 'set port number to bind to')
    .description('start local server')
    .action(function () {
        // Set coloring flag for CLI
        colorer.useColors = program.color;

        var port = 8585;

        console.log('');
        console.log(' Starting local server in current directory', process.cwd());
        console.log('   Go to http://localhost:' + port, 'to browse contents of current directory');
        console.log('');
        console.log('   Use key combination Ctrl+C to stop local server');
        console.log('');

        // To make it possible to press Enter in cli, to add empty line and not keep all the keys you pressed
        // while running the server in buffer and execute only when server has stoped
        var stdin = process.openStdin();

        var express = require('express');
        var app = express();

        // To remove request for favicon from logger.
        app.use(express.favicon());

        // To show in console log for accessed files
        app.use(express.logger('tiny'));

        // Map /_tools to sdk tools directory and / to current working directory
        app.use('/_tools', express.static(path.resolve(__dirname, '../tools')));
        app.use('/', express.static(process.cwd()));

        // To allow for directory listing for tools directory
        app.use('/_tools', express.directory(path.resolve(__dirname, '../tools'), {
            icons: true
        }));

        // To allow for directory listing for current directory
        app.use('/', express.directory(process.cwd(), {
            icons: true
        }));

        // Fallback in case path does not match anything before
        app.use(function (req, res) {
            res.send(404);
        });

        // Start server on port 8585
        app.listen(port);
    });

// In case any valid command specified, execute it, otherwise show help
if (!isCommandOrOptionSpecified()) {
    program.help();
} else {
    program.parse(process.argv);
}

function isCommandOrOptionSpecified() {
    var valid = ['-h', '--help', '-V', '--version'];

    program.commands.forEach(function (comm) {
        valid.push(comm._name);
    });

    return process.argv.some(function (arg) {
        return _.contains(valid, arg);
    });
}

/**
 * Decide which file name to take as configuration file name (default 'build.json', if none is provided in CLI)
 * @param fileName file name from CLI, if provided
 * @return {string} returns chosen file name
 */
function getConfigFileName(fileName) {
    return fileName || 'build.json'
}

/**
 * Decide where to start looking for configuration file
 * @param fileName path for build configuration file
 * @return {string} returns chosen configuration file directory
 */
function getConfigFileDirectory(fileName) {
    var fileDirectory;

    var fileNameDir = path.dirname(fileName);
    if (fileNameDir !== '.') {
        // In case no config file directory has been provided, check if file contained any path information
        fileDirectory = fileNameDir;
    } else {
        // In case no config file name is just plain filename, use current process directory as one where config file should be located
        fileDirectory = process.cwd();
    }

    return fileDirectory;
}

/**
 * Wrapper for configuration loading
 * @param fileName configuration file name
 * @param fileDirectory directory from which to start looking for configuration file
 * @param cb callback(config, tasks), that returns merged configuration and loaded tasks
 */
function load(fileName, fileDirectory, cb) {
    var config = {}, tasks = {};

    loader.loadConfig(fileName, fileDirectory, function (err, loadedConfig) {
        if (err) {
            utils.error(err);
        } else {
            // Load local tasks + external tasks if there are any
            loader.loadExternalTasks(loadedConfig[fields.EXTERNAL_TASKS], function (err, loadedTasks) {
                if (err) {
                    utils.error(err);
                }

                // Validate that we actually have all the tasks we have defined in the configuration
                validator.validateTasksExistance(loadedConfig[fields.PHASES], loadedTasks, function (err) {
                    if (err) {
                        utils.error(err);
                    }
                });

                // Validate that taks options satisfy task requirements
                validator.validateTasksOptions(loadedConfig[fields.PHASES], loadedTasks, function (err) {
                    if (err) {
                        utils.error(err);
                    }
                });

                tasks = loadedTasks;
            });
        }


        config = loadedConfig;
    });

    cb(config, tasks);
}
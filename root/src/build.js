#!/usr/bin/env node

var loader = require('./config/loader'),
    validator = require('./config/validator'),
    Runner = require('./config/runner').Runner,
    utils = require('./utils'),
    fields = require('./fields'),

    util = require('util'),
    path = require('path'),
    program = require('commander'),
    _ = require('lodash');

var colorer = require('./colorer');

// Set what to show for usage information, when help is requested
program.usage('[phase] [options]');

// CLI
program
    .option('-f, --config-file-name <file>', 'change default build file name "build.json" to provided one')
    .option('-d, --config-file-dir <directory>', 'change default directory where to start look for configuration file')
    .option('-t, --timeout <miliseconds>', 'default timeout for task execution', parseInt)
    .option('-e, --exclusive', 'run default or provided phase exclusively, by not running phase dependencies beforehand')
    .option('--no-color', 'remove coloring for CLI messages', false)
    .option('--list-tasks', 'list available build tasks')
    .option('--list-phases', 'list phases that are loaded from configuration file')
    .option('--show-configuration', 'show loaded & merged configuration');

program.parse(process.argv);

// Set coloring flag for CLI
colorer.useColors = program.color;

var fileName = getConfigFileName(program.configFileName);
var fileDir = getConfigFileDirectory(program.configFileName, program.configFileDir);
if (program.listTasks) {
    load(fileName, fileDir, function (config, tasks) {
        console.log('');
        console.log('  List of available tasks:');
        for (var task in tasks) {
            console.log('    ' + task);
        }
    });
} else if (program.listPhases) {
    load(fileName, fileDir, function (config, tasks) {
        console.log('');
        console.log('  List of phases:');
        for (var phase in config[fields.PHASES]) {
            console.log('    ' + phase);
        }
    });
} else if (program.showConfiguration) {
    load(fileName, fileDir, function (config, tasks) {
        console.log('');
        console.log('Current loaded & merged configuration: ');
        console.log(JSON.stringify(config, null, 2));
    });
} else if (require.main === module) { // Execute only if called directly by node
    load(fileName, fileDir, function (config, tasks) {
        var phase = program.args[0] || config[fields.DEFAULT_PHASE];

        // Flag to not run exclusively only current phase, without it's dependencies
        if (program.exclusive) {
            delete config[fields.PHASES][phase][fields.PHASES_DEPENDS];
        }

        var runInstance = new Runner(config, tasks, program.timeout);  // Set timeout that was provided in CLI
        runInstance.run(phase, function (err) {
            if (err) {
                utils.error(err);
            }
        });
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
 * Decode where to start looking for configuration file
 * @param fileName file name for build configuration
 * @param dir location where to start looking for configuration file from CLI
 * @return {string} returns chosen configuration file directory
 */
function getConfigFileDirectory(fileName, dir) {
    var fileDirectory;

    if (!dir) {
        var fileNameDir = path.dirname(fileName);
        if (fileNameDir !== '.') {
            // In case no config file directory has been provided, check if file contained any path information
            fileDirectory = fileNameDir;
        } else {
            // In case no config file name is just plain filename, use current process directory as one where config file should be located
            fileDirectory = process.cwd();
        }
    } else {
        // In case configuration file directory was passed in via CLI, use that instead
        fileDirectory = dir;
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



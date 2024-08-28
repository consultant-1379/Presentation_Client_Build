// Load dependencies
var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),

    fields = require('../fields'),
    utils = require('../utils'),
    errors = require('../errors'),
    validator = require('./validator'),
    propertiesHelper = require('./properties'),
    mergeHelper = require('./merger');

/**
 * Walks up the directory tree to look for file and return path if file is found
 * @param file file name that will be loaded - e.g. build.json
 * @param directory directory where to start looking for the file
 * @param cb callback returning (error, path)
 */
exports.walker = function (file, directory, cb) {

    var dir = directory || process.cwd();
    var parentDir = path.resolve(dir, '..');

    if (dir === parentDir) {
        cb(util.format(errors.L_NO_FILE, file));
        return;
    }

    var absPath = path.resolve(dir, file);

    if (fs.existsSync(absPath)) {
        // File found
        cb(null, absPath);
    } else {
        // Walk recursively up to parent dir
        this.walker(file, parentDir, cb);
    }
};

/**
 * Loads provided configuration file
 * @param file file name of build file
 * @param directory
 * @param cb callback(error, result) where errors will be returned as first argument, but in case of no errors result will contain merged configuration
 */
exports.loadConfig = function (file, directory, cb) {
    if (!file || file.trim() === '') {
        cb(errors.L_EMPTY_FILE_PATH);
        return;
    }

    // Get the file path, by walking up the directory tree
    this.walker(file, directory, function (err, filePath) {
        if (err) {
            cb(err);
        } else {
            // Change current working directory to where build configuration files resides
            process.chdir(path.dirname(filePath));

            // Do the magical recursive loading
            recursiveLoad(filePath, function (err, config) {
                if (err) {
                    cb(err);
                } else {
                    // Run config through validator
                    validator.validateConfiguration(config, function (err) {
                        if (err) {
                            cb(err);
                        } else {
                            // Apply properties to whole configuration

                            var properties = _.clone(config[fields.PROPERTIES], true);
                            propertiesHelper.apply(config, properties, function (err, result) {
                                if (err) {
                                    cb(err);
                                } else {
                                    // Finally return configuration
                                    cb(null, result);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

exports.loadExternalTasks = function (externalTasksDirectories, cb) {
    // If directories are not yet as an array, we will make one
    externalTasksDirectories = utils.arrayify(externalTasksDirectories);

    // Add local tasks at the end of the list
    externalTasksDirectories.push(path.resolve(path.dirname(__filename), '../tasks/'));

    var tasks = {}, hasError = false;

    externalTasksDirectories.some(function (extTaskDir) {
        var extTaskDirPath = path.resolve(extTaskDir);

        if (fs.existsSync(extTaskDirPath)) {
            var filesExtension = '.js';

            var extTasksDirContent = fs.readdirSync(extTaskDirPath);
            extTasksDirContent.some(function (taskFile) {
                var taskFilePath = path.resolve(extTaskDirPath, taskFile);

                var taskFileStat = fs.statSync(taskFilePath);
                if (taskFileStat.isFile() && path.extname(taskFile) === filesExtension) {
                    var taskName = taskFile.replace(filesExtension, '');

                    if (_.contains(fields.TASKS_RESERVED_NAMES, taskName)) {
                        cb(util.format(errors.L_TASK_USES_RESERVED_NAME, fields.TASKS_RESERVED_NAMES));
                        return hasError = true;
                    }

                    tasks[taskName] = require(taskFilePath);

                    // Validate task setup
                    if (_.isUndefined(tasks[taskName].run)) {
                        cb(util.format(errors.L_TASK_RUN_METHOD_MISSING, taskName));
                        return hasError = true;
                    }

                    if (tasks[taskName].run.length === 0) {
                        cb(util.format(errors.L_TASK_RUN_NO_ATTRIBUTES, taskName));
                        return hasError = true;
                    }
                }

                return hasError
            });
        } else {
            cb(util.format(errors.L_EXTERNAL_TASKS_NO_DIRECTORY, extTaskDirPath));
            return hasError = true;
        }

        return hasError;
    });

    if (!hasError) {
        cb(null, tasks);
    }
};

function recursiveLoad(file, cb) {

    var fullProperties = {};

    // Add property for sdk root path
    fullProperties[fields.PATH_TO_SDK] = path.resolve(__dirname, '../..');

    function load(file, seen, depth, cb) {
        if (!_.contains(seen, file)) {
            seen.push(file);

            // Load the configuration file
            var fileContents = fs.readFileSync(file, 'utf8');
            if ('' === fileContents) {
                cb(util.format(errors.L_EMPTY_FILE));
                return;
            } else if (!fileContents) {
                cb(util.format(errors.L_UNABLE_READ, file));
                return;
            }

            // Parse build file
            var config;
            try {
                config = JSON.parse(fileContents);
            } catch (Err) {
                cb(util.format(errors.L_UNABLE_PARSE, file));
                return;
            }

            ////////////////////////// HANDLE PROPERTIES

            if (_.isUndefined(config[fields.PROPERTIES])) {
                config[fields.PROPERTIES] = {};
            }

            fullProperties = mergeHelper.mergeProperties(fullProperties, config[fields.PROPERTIES]);

            var propertiesErrors = [];
            propertiesHelper.parse(fullProperties, function (err, props) {
                if (err) {
                    propertiesErrors = err;
                }

                config[fields.PROPERTIES] = props;
            });

            if (propertiesErrors.length > 0) {
                cb(propertiesErrors);
                return;
            }

            ////////////////////////// HANDLE EXTERNAL TASKS

            if (!_.isUndefined(config[fields.EXTERNAL_TASKS])) {
                // Set correct paths for tasks directories
                config[fields.EXTERNAL_TASKS] = utils.arrayify(config[fields.EXTERNAL_TASKS]);

                var resFileDir = path.dirname(file);

                for (var i = 0; i < config[fields.EXTERNAL_TASKS].length; i++) {
                    var extTaskPath = null;

                    // In case there are any properties in the path, apply them
                    propertiesHelper.apply(config[fields.EXTERNAL_TASKS][i], fullProperties, function (err, result) {
                        extTaskPath = result
                    });

                    // Generate full path, if relative has been provided
                    extTaskPath = path.resolve(resFileDir, extTaskPath);

                    if (extTaskPath.indexOf(resFileDir) !== 0) {
                        cb(util.format(errors.L_EXTERNAL_TASKS_WRONG_LOCATION, extTaskPath, resFileDir));
                        return;
                    } else {
                        config[fields.EXTERNAL_TASKS][i] = extTaskPath;
                    }
                }
            }

            ////////////////////////// HANDLE PARENTS

            // Checks for parents + if have parents, goes into recursion
            if (!_.isUndefined(config[fields.PARENTS])) {

                var parents = utils.arrayify(config[fields.PARENTS]),
                    hasErrors = false;

                // Increment depth
                depth++;

                parents.every(function (parent) {
                    propertiesHelper.apply(parent, fullProperties, function (err, applied) {
                        if (err) {
                            cb(err);
                            hasErrors = true;
                        }

                        parent = path.resolve(path.dirname(file), applied);
                    });

                    // In case we already failed in properties apply, we break out from parents array iteration
                    if (hasErrors) {
                        return false;
                    }

                    if (!fs.existsSync(parent)) {
                        cb(util.format(errors.L_NO_PARENT_FILE, parent));
                        hasErrors = true;
                    }

                    if (!hasErrors) {
                        load(parent, seen, depth, cb);
                        cb(null, config);
                    }

                    // To allow array every() method iterate to next item
                    return !hasErrors
                });

                if (hasErrors) {
                    return;
                }

                // Remove parents, as all the build files has been loaded
                delete config[fields.PARENTS];
            } else {
                cb(null, config);
            }
        } else {
            cb(util.format(errors.L_PARENT_CIRCULAR_REFERENCE, file));
        }
    }

    var mergedConfiguration = {}, loadHasErrors = false;

    //Execute recursive configuration loader
    load(file, [], 0, function (err, config) {
        if (err) {
            cb(err);
            loadHasErrors = true;
        } else {
            mergedConfiguration = mergeHelper.mergeConfigs(config, mergedConfiguration);

        }
    });

    if (!loadHasErrors) {
        cb(null, mergedConfiguration);
    }
}
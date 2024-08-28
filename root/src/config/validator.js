var errors = require('../errors'),
    utils = require('../utils'),
    fields = require('../fields'),
    conditions = require('./conditions/index');
propertiesHelper = require('./properties');

var util = require('util'),
    _ = require('lodash');

exports.validateConfiguration = function (configuration, cb) {

    if (!_.isPlainObject(configuration)) {
        cb(errors.V_CONFIG_WRONG_TYPE);
        return;
    }

    // PROPERTIES
    var properties = configuration[fields.PROPERTIES];
    if (!_.isUndefined(properties)) {
        var hasError = false;

        propertiesHelper.validateProperties(properties, function (err) {
            if (err) {
                cb(err);
                hasError = true;
            }
        });

        if(hasError) {
            return;
        }
    }

    // EXTERNAL TASKS
    var tasks = configuration[fields.EXTERNAL_TASKS];
    if (!_.isUndefined(tasks)) {
        if (!_.isString(tasks) && !_.isArray(tasks)) {
            cb(util.format(errors.V_TASKS_WRONG_LIST_TYPE, fields.EXTERNAL_TASKS));
            return;
        } else if (_.isArray(tasks)) {
            if (_.isEmpty(tasks)) {
                cb(util.format(errors.V_TASKS_LIST_EMPTY_ARRAY, fields.EXTERNAL_TASKS));
                return;
            }

            for (var taskKey in tasks) {
                if (tasks.hasOwnProperty(taskKey)) {
                    var task = tasks[taskKey];
                    if (!_.isString(task)) {
                        cb(util.format(errors.V_TASKS_WRONG_ITEMS_TYPE, fields.EXTERNAL_TASKS));
                        return;
                    } else if (task.trim() === '') {
                        cb(errors.V_TASKS_LIST_EMPTY_STRING);
                        return;
                    }
                }
            }
        } else if (_.isString(tasks) && _.isEmpty(tasks)) {
            cb(errors.V_TASKS_ITEM_EMPTY_STRING);
            return;
        }
    }

    // PARENTS
    var parents = configuration[fields.PARENTS];
    if (!_.isUndefined(parents)) {
        if (!_.isString(parents) && !_.isArray(parents)) {
            cb(util.format(errors.V_PARENTS_WRONG_TYPE, fields.PARENTS));
            return;
        } else if (_.isArray(parents)) {
            if (_.isEmpty(parents)) {
                cb(errors.V_PARENTS_EMPTY_ARRAY);
                return;
            }

            for (var parentKey in parents) {
                if (parents.hasOwnProperty(parentKey)) {
                    var parent = parents[parentKey];
                    if (!_.isString(parent)) {
                        cb(util.format(errors.V_PARENTS_ITEMS_WRONG_TYPE, fields.PARENTS));
                        return;
                    } else if (parent.trim() === '') {
                        cb(errors.V_PARENTS_ITEMS_EMPTY_STRING);
                        return;
                    }
                }
            }
        } else if (_.isString(parents) && _.isEmpty(parents)) {
            cb(errors.V_PARENTS_EMPTY_STRING);
            return;
        }
    }

    // PHASES
    var phases = configuration[fields.PHASES];
    if (_.isUndefined(phases)) {
        cb(util.format(errors.V_PHASES_MISSING, fields.PHASES));
        return;
    } else {
        if (!_.isPlainObject(phases)) {
            cb(util.format(errors.V_PHASES_WRONG_TYPE, fields.PHASES));
            return;
        } else if (_.isEmpty(phases)) {
            cb(util.format(errors.V_PHASES_NO_ITEMS, fields.PHASES));
            return;
        } else {
            for (var phaseKey in phases) {
                if (phases.hasOwnProperty(phaseKey)) {
                    var phase = phases[phaseKey];

                    // TODO: phaseKey should not contain spaces, etc..

                    if (_.isPlainObject(phase)) {
                        if (_.isEmpty(phase)) {
                            cb(util.format(errors.V_PHASE_NO_TASKS, phaseKey, phaseKey));
                            return;
                        } else {
                            var hasTasks = false;
                            for (var taskName in phase) {
                                // "depends" is reserved word and used for phases dependencies, therefore not counted as task
                                if (phase.hasOwnProperty(taskName) && taskName !== fields.PHASES_DEPENDS) {
                                    hasTasks = true;
                                }
                            }

                            // If apart from depends there is no other tasks, then raise an error
                            if (!hasTasks) {
                                cb(util.format(errors.V_PHASE_NO_TASKS, phaseKey, phaseKey));
                                return;
                            }
                        }
                    } else {
                        cb(util.format(errors.V_PHASE_WRONG_TYPE, phaseKey, phaseKey));
                        return;
                    }
                }
            }
        }
    }

    // PHASES DEPENDENCIES
    var phaseDepsErrors = null;
    checkPhaseDependencies(phases, function (err) {
        phaseDepsErrors = err;
    });

    if (phaseDepsErrors) {
        cb(phaseDepsErrors);
        return;
    }

    // PHASES CIRCULAR DEPENDENCIES
    var phaseCircularError = null;
    checkPhaseCircularDependencies(phases, function (err) {
        phaseCircularError = err;
    });

    if (phaseCircularError) {
        cb(phaseCircularError);
        return;
    }

    // DEFAULT PHASE
    var defaultPhase = configuration[fields.DEFAULT_PHASE];
    if (_.isUndefined(defaultPhase)) {
        cb(util.format(errors.V_DEFAULT_PHASE_MISSING, fields.DEFAULT_PHASE));
        return;
    } else {
        if (!_.isString(defaultPhase)) {
            cb(util.format(errors.V_DEFAULT_PHASE_WRONG_TYPE, fields.DEFAULT_PHASE));
            return;
        } else if (_.isEmpty(defaultPhase)) {
            cb(util.format(errors.V_DEFAULT_PHASE_EMPTY, fields.DEFAULT_PHASE));
            return;
        } else if (!_.contains(_.keys(phases), defaultPhase)) {
            cb(util.format(errors.V_DEFAULT_PHASE_NOT_FOUND, defaultPhase));
            return;
        }
    }

    // HAS JUNK IN CONFIGURATION
    var conf = _.clone(configuration, true);
    conf = _.omit(conf,
        fields.DEFAULT_PHASE,
        fields.EXTERNAL_TASKS,
        fields.PARENTS,
        fields.PHASES,
        fields.PROPERTIES
    );

    if (!_.isEmpty(conf)) {
        var junk = _.keys(conf);
        cb(util.format(errors.V_JUNK, _.flatten(junk)));
        return;
    }

    // Return no errors, if validation passes
    cb(null);
};

exports.validateTasksExistance = function (phases, tasks, cb) {
    var validationErrors = [];
    _.each(phases, function (phase, phaseName) {
        _.each(phases[phaseName], function (task, taskName) {
            // Avoid validating tasks, that are actually reserved names, like depends for phases dependency
            if (!_.contains(fields.TASKS_RESERVED_NAMES, taskName)) {
                if (!tasks[taskName]) {
                    validationErrors.push(util.format(errors.V_TASK_NOT_FOUND, taskName, phaseName));
                }
            }
        });
    });

    if (validationErrors.length > 0) {
        cb(validationErrors);
    } else {
        cb(null);
    }
};

// Validate external task options, do they follow defined rules!
exports.validateTasksOptions = function (phases, tasks, cb) {
    var validationErrors = [];

    // Since option type can be Object or array of Objects, we wrap checking for it in containsOption()
    function containsOption(option, types) {
        var result = false;

        if (util.isArray(types)) {
            types.forEach(function (type) {
                if (option.constructor === type) {
                    result = true;
                }
            });
        } else if (option.constructor === types) {
            result = true;
        }

        return result;
    }

    // To print human readable option type in case when type is Object or array of Objects
    function getReadableOptionType(types) {
        var result = '';

        if (util.isArray(types)) {
            var first = true;
            types.forEach(function (type) {
                if (!first) {
                    result += ', ';
                }

                result += type.name;

                first = false;
            });
        } else {
            result = types.name;
        }

        return result;
    }

    _.each(phases, function (phase, phaseName) {
        _.each(phases[phaseName], function (options, taskName) {

            // Avoid validating tasks, that are actually reserved names, like depends for phases dependency
            if (!_.contains(fields.TASKS_RESERVED_NAMES, taskName)) {
                if (!_.isPlainObject(options)) {
                    validationErrors.push(util.format(errors.V_OPTIONS_WRONG_TYPE, phaseName, taskName));
                } else {
                    if (_.isEmpty(options)) {
                        validationErrors.push(util.format(errors.V_OPTIONS_EMPTY, phaseName, taskName));
                        return;
                    }

                    var reqOptions = tasks[taskName][fields.TASKS_REUIRED_PROPERTIES];
                    var optOptions = tasks[taskName][fields.TASKS_OPTIONAL_PROPERTIES];

                    if (reqOptions && _.isPlainObject(reqOptions)) {
                        _.each(reqOptions, function (rOptType, rOptName) {
                            if (_.isUndefined(options[rOptName])) {
                                validationErrors.push(util.format(errors.V_OPTION_REQUIRED_MISSING, phaseName, taskName, rOptName));
                            } else if (!containsOption(options[rOptName], rOptType)) {
                                validationErrors.push(util.format(errors.V_OPTION_REQUIRED_WRONG_TYPE, phaseName, taskName, rOptName, getReadableOptionType(rOptType)));
                            } else if (_.isEmpty(options[rOptName])) {
                                validationErrors.push(util.format(errors.V_OPTION_REQUIRED_EMPTY, phaseName, taskName, rOptName));
                            }
                        });
                    }

                    if(optOptions && _.isPlainObject(optOptions)) {
                        var optionalOptionsNames = Object.keys(optOptions);
                        Object.keys(options).forEach(function(option) {
                            if(_.contains(optionalOptionsNames, option)) {
                                if (!containsOption(options[option], optOptions[option])) {
                                    validationErrors.push(util.format(errors.V_OPTION_OPTIONAL_WRONG_TYPE, phaseName, taskName, option, getReadableOptionType(options[option])));
                                } else if (_.isEmpty(options[option])) {
                                    validationErrors.push(util.format(errors.V_OPTION_OPTIONAL_EMPTY, phaseName, taskName, option));
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    if (validationErrors.length > 0) {
        cb(validationErrors);
    } else {
        cb(null);
    }
};

function checkPhaseDependencies(phases, cb) {
    var depsErrors = [];

    _.each(phases, function (phase, phaseName) {
        if (phase[fields.PHASES_DEPENDS]) {
            phase[fields.PHASES_DEPENDS] = utils.arrayify(phase[fields.PHASES_DEPENDS]);

            phase[fields.PHASES_DEPENDS].forEach(function (dependant) {
                if (!phases[dependant]) {
                    depsErrors.push(util.format(errors.V_PHASE_MISSING_DEPENDENCY, phaseName, dependant));
                }
            });
        }
    });

    if (depsErrors.length > 0) {
        cb(depsErrors);
    } else {
        cb(null);
    }
}

function checkPhaseCircularDependencies(phases, cb) {
    var circular = false;

    // Based on http://www.electricmonk.nl/docs/dependency_resolving_algorithm/dependency_resolving_algorithm.html
    function resolve(phase, dependencies, seen, resolved) {

        seen.push(phase);

        dependencies.forEach(function (dep) {
            if (!_.contains(resolved, dep)) {
                if (_.contains(seen, dep)) {
                    cb(util.format(errors.V_PHASE_CIRCULAR_DEPENDENCY, dep));
                    circular = true;
                    return;
                }

                var depDependencies = phases[dep][fields.PHASES_DEPENDS] || [];
                resolve(dep, depDependencies, seen, resolved);
            }
        });

        resolved.push(phase);
    }

    var resolved = [];
    _.each(phases, function (phase, phaseName) {
        resolve(phaseName, phase[fields.PHASES_DEPENDS] || [], [], resolved);
    });

    if (!circular) {
        cb(null);
    }
}
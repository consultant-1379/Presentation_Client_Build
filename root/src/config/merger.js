var util = require('util'),
    fields = require('../fields'),
    utils = require('../utils'),
    _ = require('lodash');

// TODO: Add stronger statements to check validity of merges, as currently they rely on the fact that config consistency is already nice & clean and that is invisible dependency

exports.mergeConfigs = function (current, parent) {
    // To make sure we don't change current object that we passed in
    parent = _.clone(parent, true);
    current = _.clone(current, true);

    if(!parent && current) {
        return current;
    } else if(parent && !current) {
        return parent;
    }

    if (_.isUndefined(current) || _.isEmpty(current)) {
        return parent;
    }

    if (!_.isUndefined(current[fields.PROPERTIES])) {
        parent[fields.PROPERTIES] = exports.mergeProperties(current[fields.PROPERTIES], parent[fields.PROPERTIES]);
    }

    if (!_.isUndefined(current[fields.EXTERNAL_TASKS])) {
        parent[fields.EXTERNAL_TASKS] = exports.mergeTasks(current[fields.EXTERNAL_TASKS], parent[fields.EXTERNAL_TASKS]);
    }

    if(!_.isUndefined(current[fields.PHASES])) {
        parent[fields.PHASES] = exports.mergePhases(current[fields.PHASES], parent[fields.PHASES]);
    }

    if (!_.isUndefined(current[fields.DEFAULT_PHASE])) {
        parent[fields.DEFAULT_PHASE] = current[fields.DEFAULT_PHASE];
    }

    return parent;
};

exports.mergeProperties = function (currentProperties, parentProperties) {
    // To make sure we don't change the variables we passed in
    parentProperties = _.clone(parentProperties, true);
    currentProperties = _.clone(currentProperties, true);

    if (currentProperties && !_.isEmpty(currentProperties)) {
        if (!parentProperties) {
            parentProperties = currentProperties;
        } else {
            _.each(currentProperties, function (prop, propName) {
                parentProperties[propName] = prop;
            });
        }
    }

    return parentProperties;
};

exports.mergeTasks = function (currentTasks, parentTasks) {
    // To make sure we don't change the variables we passed in
    parentTasks = _.clone(parentTasks, true);
    currentTasks = _.clone(currentTasks, true);

    parentTasks = utils.arrayify(parentTasks);
    currentTasks = utils.arrayify(currentTasks);

    // For external tasks first items in array should be parent ones, as that way they will be first to be loaded
    if (currentTasks) {
        if (_.isEmpty(parentTasks)) {
            parentTasks = currentTasks;
        } else {
            currentTasks.forEach(function (task) {
                parentTasks.push(task);
            });
        }
    }

    return _.uniq(parentTasks);
};

exports.mergePhases = function (currentPhases, parentPhases) {
    // To make sure we don't change the variables we passed in
    parentPhases = _.clone(parentPhases, true);
    currentPhases = _.clone(currentPhases, true);

    if (currentPhases) {
        if (!parentPhases) {
            parentPhases = currentPhases;
        } else {
            _.each(currentPhases, function (phase, phaseName) {
                parentPhases[phaseName] = phase;
            });
        }
    }

    return parentPhases;
};
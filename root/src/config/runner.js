var _ = require('lodash'),
    util = require('util'),
    events = require('events');

var fields = require('../fields'),
    errors = require('../errors'),
    utils = require('../utils'),
    colorer = require('../colorer');

var eventNames = {
    BUILD_START: 'buildStart',
    PHASE_START: 'phaseStart',
    TASK_START: 'taskStart',
    TASK_END: 'taskEnd',
    PHASE_END: 'phaseEnd',
    BUILD_END: 'buildEnd'
};

var messages = {
    PHASE_DEPENDANT_RUN: 'Running dependant phase "%s"',
    PHASE_RUN: 'Running phase "%s"',
    TASK_RUN: '+Running task "%s"'
};

var messageTypes = {
    ERRRO: 1,
    WARNING: 2,
    INFO: 3
};

function Runner(configuration, tasks, tasksDefaultTimeout) {

    this.configuration = configuration;
    this.tasks = tasks;

    // Define default timeout, how long it takes before failing with timeout error
    this.timeout = tasksDefaultTimeout || 30000;

    events.EventEmitter.call(this);
}

// Inherit EventEmitter functionality for runner
util.inherits(Runner, events.EventEmitter);

Runner.prototype.run = function (phase, cb) {
    var phases = this.configuration[fields.PHASES];

    if (_.isUndefined(phases[phase])) {
        cb(util.format(errors.R_NO_PHASE, phase));
        return;
    }

    var tasksOrder,
        phasesOrder = buildPhasesExecutionOrder(phase, phases);

    this.on(eventNames.BUILD_START, function () {
        this.emit(eventNames.PHASE_START, phasesOrder.shift());
    });

    this.on(eventNames.PHASE_START, function (phaseName) {
        // Add new line to make it look nicer
        console.log();

        if (phaseName != phase) {
            console.log('', util.format(messages.PHASE_DEPENDANT_RUN, colorer.phase(phaseName)));
        } else {
            console.log('', util.format(messages.PHASE_RUN, colorer.phase(phaseName)));
        }

        tasksOrder = getTasksNameList(phases[phaseName]);
        if (tasksOrder.length > 0) {
            this.emit(eventNames.TASK_START, phaseName, tasksOrder.shift());
        } else {
            this.emit(eventNames.PHASE_END, phaseName);
        }
    });

    this.on(eventNames.TASK_START, function (phaseName, taskName) {
        console.log('');
        console.log('  ', util.format(messages.TASK_RUN, colorer.task(taskName)));

        var task = this.tasks[taskName];
        var taskOptions = phases[phaseName][taskName];

        var TaskDoneHandler = function (timeout, cb) {

            var timer = setTimeout(function () {
                cb(util.format(errors.R_TASK_TIMEOUT, phaseName, taskName));
            }, timeout);

            return {
                done: function () {
                    clearTimeout(timer);
                    cb();
                }
            }
        };

        var TaskContext = {
            message: function (text, type) {
                if (!this.hadMessage) {
                    // To print messages nicely, we add extra space before messages
                    console.log();
                }

                message(text, type);

                // Store flag, that we have had a message
                this.hadMessage = true;
            },
            error: function (msg) {
                this.message(msg, messageTypes.ERROR);
            },
            warn: function (msg) {
                this.message(msg, messageTypes.WARNING);
            },
            info: function (msg) {
                this.message(msg, messageTypes.INFO);
            }
        };

        var self = this;
        var doneHandler = new TaskDoneHandler(this.timeout, function () {
            self.emit(eventNames.TASK_END, phaseName, taskName);
        });

        if (task.run.length === 1) {
            // Task is synchronous
            task.run.call(TaskContext, taskOptions);
            doneHandler.done();
        } else {
            // Task is asynchronous
            task.run.call(TaskContext, taskOptions, doneHandler.done);
        }
    });

    this.on(eventNames.TASK_END, function (phaseName, taskName) {
        if (tasksOrder.length > 0) {
            this.emit(eventNames.TASK_START, phaseName, tasksOrder.shift());
        } else {
            this.emit(eventNames.PHASE_END, phaseName);
        }
    });

    this.on(eventNames.PHASE_END, function (phaseName) {
        if (phasesOrder.length === 0) {
            this.emit(eventNames.BUILD_END);
        } else {
            this.emit(eventNames.PHASE_START, phasesOrder.shift());
        }
    });

    this.on(eventNames.BUILD_END, function () {
        cb(null);
    });

    // Start the build process
    this.emit(eventNames.BUILD_START);
};

// Expose class for runner, so that you can have new instance each time you whave to run
module.exports = {
    Runner: Runner
};

function buildPhasesExecutionOrder(phase, phases) {
    var executionOrder = [];

    function walker(phase, dependendsOnPhases) {
        if (dependendsOnPhases) {
            dependendsOnPhases = utils.arrayify(dependendsOnPhases);

            dependendsOnPhases.forEach(function (dep) {
                walker(dep, phases[dep][fields.PHASES_DEPENDS]);
            });
        }

        if (!_.contains(executionOrder, phase)) {
            executionOrder.push(phase);
        }
    }

    walker(phase, phases[phase][fields.PHASES_DEPENDS]);

    return executionOrder;
}

function getTasksNameList(phase) {
    return _.keys(_.omit(phase, fields.TASKS_RESERVED_NAMES));
}

function message(msg, type) {
    if (arguments.length === 1) {
        type = messageTypes.INFO;
    }

    switch (type) {
        case messageTypes.ERROR:
            console.error('    ', colorer.error('(e)'), colorer.error(msg));
            break;
        case messageTypes.WARNING:
            console.warn('    ', colorer.warn('(w)'), msg);
            break;
        case messageTypes.INFO:
            console.info('    ', colorer.info('(i)'), msg);
            break;
    }
}
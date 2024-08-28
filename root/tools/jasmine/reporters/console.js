(function (jasmine, console) {
    // Fix for PhantomJS issue http://code.google.com/p/phantomjs/issues/detail?id=522
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== "function") {
                // closest thing possible to the ECMAScript 5 internal IsCallable function
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {
                },
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }

    if (!jasmine) {
        throw 'jasmine library isn\'t loaded!';
    }

    function fullSuiteDescription(suite) {
        var fullDescription = suite.description;

        if (suite.parentSuite) {
            fullDescription = fullSuiteDescription(suite.parentSuite) + ' ' + fullDescription;
        }

        return fullDescription;
    }

    var report = {
        suites: [],
        time: 0,
        count: 0,
        passed: 0,
        failures: 0
    };

    var reportReady = false;

    var ConsoleReporter = function () {
        if (!console || !console.log) {
            throw 'console isn\'t present!';
        }
    };

    var proto = ConsoleReporter.prototype;

    proto.reportRunnerStarting = function (runner) {
        runner.startTime = (new Date()).getTime();
    };

    proto.reportRunnerResults = function (runner) {
        var results = runner.results();
        var specCount = runner.specs().length;
        var duration = (new Date()).getTime() - runner.startTime;

        report.failures = results.failedCount;
        report.passed = results.passedCount;
        report.count = results.totalCount;
        report.time = duration;

        var spec_str = specCount + (specCount === 1 ? ' spec, ' : ' specs, ');
        var fail_str = report.failures + (report.failures === 1 ? ' failure in ' : ' failures in ');

        reportReady = true;

        this.log('');
        this.log('------------------------------');
        this.log(spec_str + fail_str + (duration / 1000) + 's.');
    };

    proto.reportSpecStarting = function (spec) {
        spec.startTime = (new Date()).getTime();

        // Since we don't have reportSuiteStarting, we have to initiate suite test collection here
        if (!spec.suite.tests && !spec.suite.time) {
            spec.suite.tests = [];
            spec.suite.time = 0;
        }
    };

    proto.reportSpecResults = function (spec) {
        spec.endTime = (new Date()).getTime();
        spec.time = spec.endTime - spec.startTime;

        var failures = [];
        if (spec.results().passed()) {
            this.log(fullSuiteDescription(spec.suite) + ' ' + spec.description + ' - passed');
        } else {
            this.log(fullSuiteDescription(spec.suite) + ' ' + spec.description + ' - failed');
            var items = spec.results().getItems();
            for (var i = 0; i < items.length; i++) {
                var failure = {
                    stack: items[i].trace.stack || items[i].trace,
                    message: jasmine.util.formatException(items[i])
                };

                failures.push(failure);

                this.log(failure.stack);
            }
        }

        spec.suite.tests.push({
            name: spec.description,
            success: spec.results().passed(),
            failures: failures,
            expects: spec.results().totalCount,
            time: spec.time
        });

        spec.suite.time += spec.time;
    };

    proto.reportSuiteResults = function (suite) {
        var results = suite.results();
        var description = fullSuiteDescription(suite);

        report.suites.push({
            name: description,
            tests: suite.tests,
            time: suite.time,
            count: results.totalCount,
            passed: results.passedCount,
            failures: results.totalCount - results.passedCount
        });
    };

    proto.log = function (str) {
        console.log(str)
    };

    jasmine.ConsoleReporter = ConsoleReporter;

    window.getReport = function () {
        return report;
    };

    window.isReportReady = function () {
        return reportReady;
    };

})(jasmine, console);


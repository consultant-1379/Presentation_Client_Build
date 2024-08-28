module.exports = {

    /**
     * @param page
     */
    generateReport:function (page, options) {
        var report = page.evaluate(function () {
            return getReport();
        });

        var xmlEscape = function (text) {
            return text.replace(/["'<>&]/g, function (c) {
                switch (c) {
                    case "<":
                        return "&lt;";
                    case ">":
                        return "&gt;";
                    case "\"":
                        return "&quot;";
                    case "'":
                        return "&apos;";
                    case "&":
                        return "&amp;";
                }
            });
        };

        var lines = [];

        lines.push('<?xml version="1.0" encoding="UTF-8"?>');
        lines.push('<testsuites tests="' + report.count + '" failures="' + report.failures + '" disabled="0" errors="0" time="' + ( report.time / 1000 ) + '" name="tests">');

        if (report.suites) {
            report.suites.forEach(function (suite) {
                var suiteName = suite.name;

                if (suite.tests) {
                    lines.push('\t<testsuite tests="' + suite.count + '" failures="' + suite.failures + '" disabled="0" errors="0" time="' + ( suite.time / 1000 ) + '" name="' + xmlEscape(suiteName) + '">');

                    suite.tests.forEach(function (test) {
                        if (test.success) {
                            lines.push('\t\t<testcase name="' + xmlEscape(test.name) + '" assertions="' + test.expects + '" status="' + ( test.success ? 'pass' : 'fail' ) + '" time="' + ( test.time / 1000 ) + '" classname="' + xmlEscape(suiteName) + '" />');
                        } else {
                            lines.push('\t\t<testcase name="' + xmlEscape(test.name) + '" assertions="' + test.expects + '" status="' + ( test.success ? 'pass' : 'fail' ) + '" time="' + ( test.time / 1000 ) + '" classname="' + xmlEscape(suiteName) + '">');

                            if (test.failures) {
                                test.failures.forEach(function (failure) {
                                    lines.push('\t\t\t<failure message="' + xmlEscape(failure.message) + '" type="expectationNotMet"><![CDATA[' + failure.message + ']]></failure>');
                                });
                            }

                            lines.push('\t\t</testcase>');
                        }
                    });

                    lines.push('\t</testsuite>');
                }
            });
        }

        lines.push('</testsuites>');

        console.log('Tests completed (' + report.count + '): ');
        console.log('\t' + report.passed + ' passed');
        console.log('\t' + report.failures + ' failed');

        return lines.join('\n');
    }

};
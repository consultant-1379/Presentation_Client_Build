var testHelper = require('../../../../index');

var expect = require('chai').expect,
    util = require('util'),
    rewire = require('rewire'),

    platform = rewire(testHelper.APP_DIR + '/config/conditions/os/platform.js');

describe('/config/conditions/os/platform.js', function () {

    var win = platform.availableValues.WINDOWS;
    var unix = platform.availableValues.UNIX;

    it('Returns true if you run on windows', function() {
        platform.__set__('process', {
            platform: 'win32'
        });

        expect(platform.match(win)).to.be.true;
    });

    it('Returns true if you run on some magical system, that is not covered by this condition handler', function() {
        platform.__set__('process', {
            platform: 'magic'
        });

        expect(platform.match(unix)).to.be.true;
    });

    it('Returns true if you run on unix based system', function() {
        platform.__set__('process', {
            platform: 'linux'
        });

        expect(platform.match(unix)).to.be.true;
    });
});

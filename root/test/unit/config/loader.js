//noinspection JSUnresolvedFunction

var testHelper = require('../../index');

var expect = require('chai').expect,
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),

    rewire = require("rewire"),
    loader = rewire(testHelper.APP_DIR + '/config/loader.js'),

    fields = require(testHelper.APP_DIR + '/fields'),
    errors = require(testHelper.APP_DIR + '/errors');

// Load valid configuration from external file
var validConfiguration = require(testHelper.VALID_CONFIG_JSON);

describe('config/loader.js', function () {

    var okPath, okDir, okFile, okFileContent, fileResponder;

    beforeEach(function () {
        okDir = process.cwd();
        okFile = 'build.json';

        // Prepare teting object, that we will change to conform to particular tests
        okFileContent = _.clone(validConfiguration, true);

        // Creating fake file system
        var mockFs = {};
        fileResponder = function (filePath, content) {
            filePath = path.resolve(okDir, filePath);
            mockFs[filePath] = content;

            return filePath;
        };

        okPath = fileResponder(okFile, JSON.stringify(okFileContent));

        loader.__set__("fs", {
            // Faking existsSync() of 'fs' node module
            existsSync: function (filePath) {
                filePath = path.resolve(okDir, filePath);
                return !_.isUndefined(mockFs[filePath]);
            },
            // Faking readFileSync() of 'fs' node module
            readFileSync: function (filePath) {
                filePath = path.resolve(okDir, filePath);

                if (!_.isUndefined(mockFs[filePath])) {
                    return mockFs[filePath];
                } else {
                    return null;
                }
            },
            readdirSync: function (dirPath) {
                var result = [];

                dirPath = path.resolve(okDir, dirPath);

                Object.keys(mockFs).forEach(function (mockItem) {
                    mockItem = path.resolve(okDir, mockItem);
                    if (mockItem.indexOf(dirPath) === 0) {
                        result.push(path.basename(mockItem));
                    }
                });

                return result;
            },
            statSync: function () {
                return { isFile: function () {
                    return true;
                } }
            }
        });
    });

    describe('walker()', function () {

        it('returns error if does not have configuration file', function () {
            var file = 'build.json';
            var dir = path.resolve('/other/test/application');

            loader.walker(file, dir, function (err) {
                var errTemplate = errors.regex(errors.L_NO_FILE);
                expect(err).to.match(errTemplate);
            });
        });

        it('return error if has absolute full url to incorrect file without directory provided', function () {
            var file = path.resolve(okDir, '../', okFile);

            loader.walker(file, null, function (err) {
                var errTemplate = errors.regex(errors.L_NO_FILE);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns full path to file if has configuration file at provided directory', function () {
            loader.walker(okFile, okDir, function (err, path) {
                expect(err).to.not.exist;
                expect(path).to.equal(okPath);
            });
        });

        it('returns full path to file if has configuration file at upper level directories', function () {
            var dir = path.join(okDir, '/some/deeper/place');

            loader.walker(okFile, dir, function (err, path) {
                expect(err).to.not.exist;
                expect(path).to.equal(okPath);
            });
        });

        it('returns full path to file if has absolute full url to correct file without directory provided', function () {
            loader.walker(okPath, null, function (err, path) {
                expect(err).to.not.exist;
                expect(path).to.equal(okPath);
            });
        });

        it('returns full path to file if has file as partial path relative to directory provided', function () {
            var dir = path.resolve(okDir, '../');
            var file = path.relative(dir, okFile);

            loader.walker(file, dir, function (err, path) {
                expect(err).to.not.exist;
                expect(path).to.equal(okPath);
            });
        });
    });

    describe('loadConfig()', function () {

        it('returns error if empty file name provided', function () {

            // Testing with null
            loader.loadConfig(null, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_EMPTY_FILE_PATH);
                expect(err).to.match(errTemplate);
            });

            // Testing with empty string
            loader.loadConfig('', process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_EMPTY_FILE_PATH);
                expect(err).to.match(errTemplate);
            });

            // Adding some whitespace characters
            loader.loadConfig(' \n  \t', process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_EMPTY_FILE_PATH);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if non-existing file provided', function () {
            loader.loadConfig('/path/to/some.json', process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_NO_FILE);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if existing file provided, but it is empty', function () {
            var almostGoodJsonFile = 'good.json';
            fileResponder(almostGoodJsonFile, '');

            loader.loadConfig(almostGoodJsonFile, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_EMPTY_FILE);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if existing file provided, that is not readable for some reason', function () {
            var almostGoodJsonFile = 'good.json';
            fileResponder(almostGoodJsonFile, null);

            loader.loadConfig(almostGoodJsonFile, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_UNABLE_READ);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if existing file provided, that is contains failing properties', function () {
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for current configuration JSON where property has circular reference
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PROPERTIES] = {};
            currentContent[fields.PROPERTIES]['ping'] = '$(ping)';

            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err) {
                expect(err).to.exist;
            });
        });

        it('returns error if existing file provided, that is contains non existing replaceable property in task', function () {
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for current configuration JSON where property has circular reference
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PHASES]['clean']['delete']['target'] = '$(titan)';

            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err) {
                expect(err).to.exist;
            });
        });

        it('returns error if existing file provided, that contains invalid JSON', function () {
            var badJsonFile = 'bad.json';
            fileResponder(badJsonFile, 'Invalid json');

            loader.loadConfig(badJsonFile, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_UNABLE_PARSE);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if configuration points to non existing parent configuration file', function () {
            var incorrectParentFile = 'incorrectParent.json';

            var incorrectContent = {};
            incorrectContent[fields.PARENTS] = ["/some/path/to/bad.json"];
            incorrectContent[fields.DEFAULT_PHASE] = "compile";
            incorrectContent[fields.PHASES] = {};

            fileResponder(incorrectParentFile, JSON.stringify(incorrectContent));

            loader.loadConfig(incorrectParentFile, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_NO_PARENT_FILE);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if configuration points to parent configuration file with replaceable properties', function () {
            var relativeParentPath = 'node_modules/uisdk/appBuild.json';
            var parentPath = path.join(okDir, relativeParentPath);
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for current configuration JSON
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PARENTS] = relativeParentPath.replace('node_modules/uisdk', '$(uisdk)');

            // Map content with their respective content
            fileResponder(parentPath, JSON.stringify({}));
            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.P_APPLY_REPLACEABLE_PROPERTY_NOT_FOUND);
                expect(err).to.match(errTemplate);
            });
        });

        it('returns error if external tasks directory is not under current root', function () {
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for current configuration JSON where property has circular reference
            var currentContent = _.clone(okFileContent);
            currentContent[fields.EXTERNAL_TASKS] = "/my/tasks";

            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err) {
                var errTemplate = errors.regex(errors.L_EXTERNAL_TASKS_WRONG_LOCATION);
                expect(err).to.match(errTemplate);
            });
        });

        // Test also relative external tasks thingy once loaded

        it('returns error if loaded configuration does not pass the validation', function () {
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for current configuration JSON
            var currentContent = _.clone(okFileContent);
            delete currentContent[fields.PHASES];

            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err) {
                expect(err).to.exist;
            });
        });

        it('returns merged content if has existing file provided, that points to valid parent build config file', function () {
            var relativeParentPath = 'node_modules/uisdk/appBuild.json';
            var parentPath = path.join(okDir, relativeParentPath);
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for parent configuration JSON
            var parentContent = {};
            parentContent[fields.PROPERTIES] = {};
            parentContent[fields.PROPERTIES]['ping'] = 'pong';
            parentContent[fields.DEFAULT_PHASE] = "test";
            parentContent[fields.EXTERNAL_TASKS] = [path.resolve(path.dirname(relativeParentPath), 'my/tasks')];

            // Prepare content for current configuration JSON
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PARENTS] = relativeParentPath;
            currentContent[fields.EXTERNAL_TASKS] = [path.resolve(okDir, 'local/tasks')];

            // Map content with their respective content
            fileResponder(parentPath, JSON.stringify(parentContent));
            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err, content) {
                expect(err).to.not.exist;

                // Default phase should be taken from current, since it was already in current config
                expect(content[fields.DEFAULT_PHASE]).to.equal(currentContent[fields.DEFAULT_PHASE]);

                // Property 'ping' should be coming from parent config, as current config does not have that property
                expect(content[fields.PROPERTIES]['ping']).to.equal(parentContent[fields.PROPERTIES]['ping']);

                // External content was not in current config, should be taken from parent
                expect(content[fields.EXTERNAL_TASKS]).to.include(parentContent[fields.EXTERNAL_TASKS][0]);

                // Parent property is deleted once configs are merged, so should not be present
                expect(content[fields.PARENTS]).to.be.undefined;
            });
        });

        it('returns merged content, where preference is given to current config over parent, if both configs contain the same property', function () {
            var relativeParentPath = 'node_modules/uisdk/appBuild.json';
            var parentPath = path.join(okDir, relativeParentPath);
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for parent configuration JSON
            var parentContent = {};
            parentContent[fields.DEFAULT_PHASE] = "test";
            parentContent[fields.PROPERTIES] = {};
            parentContent[fields.PROPERTIES]['info'] = "test";
            parentContent[fields.EXTERNAL_TASKS] = [path.resolve(path.dirname(relativeParentPath), 'parent/tasks')];

            // Prepare content for current configuration JSON
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PARENTS] = relativeParentPath;
            currentContent[fields.EXTERNAL_TASKS] = [path.resolve(okDir, 'local/tasks')];

            // Map content with their respective content
            fileResponder(parentPath, JSON.stringify(parentContent));
            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err, content) {
                expect(err).to.not.exist;

                expect(content[fields.DEFAULT_PHASE]).to.equal(currentContent[fields.DEFAULT_PHASE]);
                expect(content[fields.EXTERNAL_TASKS][0]).to.equal(parentContent[fields.EXTERNAL_TASKS][0]);
                expect(content[fields.EXTERNAL_TASKS][1]).to.equal(currentContent[fields.EXTERNAL_TASKS][0]);
                expect(content[fields.PROPERTIES]['info']).to.equal(currentContent[fields.PROPERTIES]['info']);
                expect(content[fields.PARENTS]).to.be.undefined;
            });
        });

        it('returns pathToSdk property even if no properties are provided, that points to root folder', function () {
            var file = 'file.json';
            var fileContent = _.clone(okFileContent, true);
            fileContent[fields.PROPERTIES] = {};

            var filePath = fileResponder(file, JSON.stringify(fileContent));

            // Build path to the root folder
            var buildRootFolder = path.resolve(__dirname, '../../..');

            loader.loadConfig(filePath, process.cwd(), function (err, content) {
                expect(err).to.not.exist;

                expect(content[fields.PROPERTIES][fields.PATH_TO_SDK]).to.exist;
                expect(content[fields.PROPERTIES][fields.PATH_TO_SDK]).to.equal(buildRootFolder);
            });
        });

        it('returns file content if has existing file provided, that has valid JSON and no parent', function () {
            var file = 'file.json';
            var fileContent = _.clone(okFileContent, true);

            var filePath = fileResponder(file, JSON.stringify(fileContent));

            loader.loadConfig(filePath, process.cwd(), function (err, content) {
                expect(err).to.not.exist;

                // As we know there is predefined property pathToSdk, so we remove it to have matching test result
                delete content[fields.PROPERTIES][fields.PATH_TO_SDK];

                expect(content).to.eql(fileContent);
            });
        });

        it('returns error if parent parents loading leads to circular reference', function () {
            var relativeParentPath = 'node_modules/uisdk/appBuild.json';
            var parentPath = path.join(okDir, relativeParentPath);
            var currentPath = path.resolve(okDir, 'current.json');

            // Prepare content for parent configuration JSON
            var parentContent = {};
            parentContent[fields.PARENTS] = currentPath;

            // Prepare content for current configuration JSON
            var currentContent = _.clone(okFileContent);
            currentContent[fields.PARENTS] = relativeParentPath;

            // Map content with their respective content
            fileResponder(parentPath, JSON.stringify(parentContent));
            fileResponder(currentPath, JSON.stringify(currentContent));

            loader.loadConfig(currentPath, process.cwd(), function (err, content) {
                var errTemplate = errors.regex(errors.L_PARENT_CIRCULAR_REFERENCE);
                expect(err).to.match(errTemplate);
            });
        });
    });

    describe('loadExternalTasks()', function () {
        before(function () {
            loader.__set__('path', {
                dirname: function () {
                    return okDir;
                },
                resolve: function () {
                    return path.resolve.apply(path.resolve, arguments);
                },
                extname: function () {
                    return path.extname.apply(path.extname, arguments);
                }
            });
        });

        it('Returns an error, if there is no external tasks directory', function () {
            loader.loadExternalTasks('/my/tasks', function (err, result) {
                var errTemplate = errors.regex(errors.L_EXTERNAL_TASKS_NO_DIRECTORY);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns an error, if task name is reserved word', function () {
            var tasksDir = path.resolve(okDir, '/my/tasks/' + fields.TASKS_RESERVED_NAMES[0] + '.js');

            fileResponder(tasksDir, true);
            fileResponder(path.dirname(tasksDir), true);

            loader.loadExternalTasks(tasksDir, function (err, result) {
                var errTemplate = errors.regex(errors.L_TASK_USES_RESERVED_NAME);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns an error, if task does not have run() method', function () {
            var tasksDir = path.resolve(okDir, '/my/tasks/hello.js');

            fileResponder(tasksDir, true);
            fileResponder(path.dirname(tasksDir), true);

            loader.__set__('require', function (i) {
                return {
                }
            });

            loader.loadExternalTasks(tasksDir, function (err, result) {
                var errTemplate = errors.regex(errors.L_TASK_RUN_METHOD_MISSING);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns an error, if task run() method does not have `options` attribute', function () {
            var tasksDir = path.resolve(okDir, '/my/tasks/hello.js');

            fileResponder(tasksDir, true);
            fileResponder(path.dirname(tasksDir), true);

            loader.__set__('require', function () {
                return {
                    run: function () {

                    }
                }
            });

            loader.loadExternalTasks(tasksDir, function (err, result) {
                var errTemplate = errors.regex(errors.L_TASK_RUN_NO_ATTRIBUTES);
                expect(err).to.match(errTemplate);
            });
        });

        it('Returns no error, if task is loaded and has `options` attribute for run() method', function () {
            var tasksDir = path.resolve(okDir, '/my/tasks/hello.js');

            // Filesystem mock for external tasks
            fileResponder(tasksDir, true);
            fileResponder(path.dirname(tasksDir), true);

            // File system for internal tasks
            fileResponder(path.resolve(okDir, '../tasks/concat.js'), true);
            fileResponder(path.resolve(okDir, '../tasks'), true);

            loader.__set__('require', function () {
                return {
                    run: function (options) {
                    }
                }
            });

            loader.loadExternalTasks(tasksDir, function (err, result) {
                expect(err).to.not.exist;
            });
        });

        it('Returns no error, if task is loaded and has `options`, `done` attributes for run() method', function () {
            var tasksDir = path.resolve(okDir, '/my/tasks/hello.js');

            // Filesystem mock for external tasks
            fileResponder(tasksDir, true);
            fileResponder(path.dirname(tasksDir), true);

            // File system for internal tasks
            fileResponder(path.resolve(okDir, '../tasks/concat.js'), true);
            fileResponder(path.resolve(okDir, '../tasks'), true);

            loader.__set__('require', function () {
                return {
                    run: function (options, done) {
                    }
                }
            });

            loader.loadExternalTasks(tasksDir, function (err, result) {
                expect(err).to.not.exist;
            });
        });
    });


});

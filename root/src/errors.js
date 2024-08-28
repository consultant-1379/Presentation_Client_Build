// Define and expose error messages

// Loader error messages
exports.L_NO_FILE = 'File %s not found';
exports.L_NO_PARENT_FILE = 'Parent configuration file %s not found';
exports.L_EMPTY_FILE_PATH = 'No file path provided';
exports.L_EMPTY_FILE = 'Build configuration file is empty, should contain json data (eg. { "phases": "clean" : {} })';
exports.L_UNABLE_READ = 'Unable to read file %s';
exports.L_UNABLE_PARSE = 'Unable to parse %s file as valid JSON';
exports.L_EXTERNAL_TASKS_WRONG_LOCATION = 'External tasks directory "%s" is located out of current configuration file root %s';
exports.L_EXTERNAL_TASKS_NO_DIRECTORY = 'External tasks directory "%s" doesn\'t exist';
exports.L_PARENT_CIRCULAR_REFERENCE = 'Parent circular reference in %s';
exports.L_TASK_USES_RESERVED_NAME = 'Task name shouldn\'t contain reserved names "%s"';
exports.L_TASK_RUN_METHOD_MISSING = 'Task "%s" should contain required run() method';
exports.L_TASK_RUN_NO_ATTRIBUTES = 'Task "%s" required run() method should have `options` and for async tasks also `callback` attribute';

// Properties handling error messages
exports.P_LIST_EMPTY = 'Properties are provided, but does not contain any defined property -(eg. "%s": { "where": "here" })';
exports.P_LIST_WRONG_TYPE = 'Properties are provided, but should be of type object - (eg. "%s": {...})';

exports.P_APPLY_WRONG_TYPE = 'Properties can be applied only to Strings';
exports.P_APPLY_REPLACEABLE_PROPERTY_NOT_FOUND = 'Replaceable property "%s" not found in list of properties';
exports.P_PARSE_MISSING_REPLACEABLE = 'Replaceable property "%s" not found in list of properties';
exports.P_PARSE_NO_CONDITIONS_MET = 'None of conditions for property "%s" matched';
exports.P_PARSE_WRONG_CONDITION_PREFIX = 'Prefix "%s" from "%s" not found in conditions list';
exports.P_PARSE_WRONG_CONDITION_POSTFIX = 'Postfix "%s" from "%s" not found in conditions list';
exports.P_PARSE_CIRCULAR_DEPENDENCY = 'We have a circular dependency for "%s" in "%s" property';
exports.P_WRONG_TYPE = 'Property "%s" should have type String (eg. "%s": "") or Object (eg. "%s": {...})';
exports.P_EMPTY_STRING = 'Property "%s" being a String should have content (eg. "%s":"my value")';
exports.P_EMPTY_OBJECT = 'Property "%s" being an Object should have content (eg. "%s":{ "?os.platform=unix": "1" })';
exports.P_CONDITION_WRONG_VALUE_TYPE = 'Property "%s" conditions should have value of type String';
exports.P_WRONG_CONDITION_FORMAT = 'Property "%s" condition should look like (eg. "%s":{ "?os.platform=unix": "1" }';

// Validator error messages
exports.V_CONFIG_WRONG_TYPE = 'Configuration should be of type object (eg. {})';

exports.V_TASKS_WRONG_LIST_TYPE = 'External tasks should be of type String or Array, (eg. "%s": [...])';
exports.V_TASKS_WRONG_ITEMS_TYPE = 'External tasks in Array should contain only Strings, (eg. "%s": ["/my/tasks"])';
exports.V_TASKS_LIST_EMPTY_STRING = 'External tasks in Array should not contain empty Strings';
exports.V_TASKS_LIST_EMPTY_ARRAY = 'External tasks in Array should have at least one tasks location defined';
exports.V_TASKS_ITEM_EMPTY_STRING = 'Empty external tasks string provided';

exports.V_TASK_NOT_FOUND = 'Task "%s" under "%s" phase not found in loaded task list';

exports.V_PARENTS_WRONG_TYPE = 'Path to parent configuration files should be of type String or Array, (eg. "%s": [...])';
exports.V_PARENTS_EMPTY_STRING = 'Path to parent configuration files is of type String and is empty';
exports.V_PARENTS_EMPTY_ARRAY = 'Path to parent configuration files is of type Array and is empty';
exports.V_PARENTS_ITEMS_WRONG_TYPE = 'Path to parent configuration files in Array should contain only Strings, like (eg. "%s": ["/other/config"]';
exports.V_PARENTS_ITEMS_EMPTY_STRING = 'Path to parent configuration files in Array should not contain empty Strings';

exports.V_PHASES_MISSING = 'Phases should be defined, (eg. "%s": {...})';
exports.V_PHASES_WRONG_TYPE = 'Phases should be of type object, (eg. "%s": {...})';
exports.V_PHASES_NO_ITEMS = 'Phases list should contain at least one phase, (eg. "%s": { "clean": {...} })';
exports.V_PHASE_NO_TASKS = 'Phase "%s" should contain at least one task (eg. "%s": { "concat": {...} })';
exports.V_PHASE_WRONG_TYPE = 'Phase "%s" should be of type object (eg. "%s": {...})';

exports.V_PHASE_MISSING_DEPENDENCY = 'Phase "%s" dependency "%s" not found in list of phases';

exports.V_PHASE_CIRCULAR_DEPENDENCY = 'We have a circular dependency for "%s" phase';

exports.V_DEFAULT_PHASE_MISSING = 'Default phases should be defined, (eg. "%s": "..." )';
exports.V_DEFAULT_PHASE_WRONG_TYPE = 'Default phase should be of type String (eg. "%s": "compile")';
exports.V_DEFAULT_PHASE_EMPTY = 'Default phase can not be empty (eg. "%s": "compile")';
exports.V_DEFAULT_PHASE_NOT_FOUND = 'Default phase "%s" not found in list of phases';

exports.V_JUNK = 'Configuration contains junk: %s';

exports.V_OPTIONS_WRONG_TYPE = 'Phase "%s" task "%s" options should be of type Object';
exports.V_OPTIONS_EMPTY = 'Phase "%s" task "%s" options is empty Object';
exports.V_OPTION_REQUIRED_MISSING = 'Phase "%s" task "%s" required option "%s" is missing';
exports.V_OPTION_REQUIRED_EMPTY = 'Phase "%s" task "%s" required option "%s" should not be empty';
exports.V_OPTION_REQUIRED_WRONG_TYPE = 'Phase "%s" task "%s" required option "%s" should be of type %s';
exports.V_OPTION_OPTIONAL_EMPTY = 'Phase "%s" task "%s" optional option "%s" should not be empty';
exports.V_OPTION_OPTIONAL_WRONG_TYPE = 'Phase "%s" task "%s" optional option "%s" should be of type %s';

// Runner error messages
exports.R_NO_PHASE = 'Provided phase "%s" does not exist in list of phases';
exports.R_TASK_TIMEOUT = 'Timeout for phase "%s" task "%s" reached';

/**
 * Return Regex version of error template
 * @param template Provided error template
 */
exports.regex = function (template) {
    var temp = template
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\?/g, '\\?')
        .replace(/%s/g, '(.*)');

    return new RegExp(temp);
};

var availableValues = {
    WINDOWS: 'windows',
    UNIX: 'unix'
};

module.exports = {
    // Targets used for CLI, to show possible variations of conditions
    availableValues: availableValues,

    // Should return boolean true or false if
    match: function (value) {
        return getPlatform() === value;
    }
};

function getPlatform() {
    var platform = process.platform;

    switch (platform) {
        case 'win32':
            return availableValues.WINDOWS;
            break;
        case 'darwin':
        case 'freebsd':
        case 'linux':
        case 'sunos':

        default:
            return availableValues.UNIX;
    }
}
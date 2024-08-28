var colorTypes = {
    bold: 1,
    error: 31,
    info: 32,
    warning: 33
};

// Good reference: http://roguejs.com/2011-11-30/console-colors-in-node-js/
// Good reference: http://en.wikipedia.org/wiki/ANSI_escape_code

module.exports = {
    // Enable colors by default - currently overriden in build.js
    useColors: true,
    phase: function(text) {
        return apply.call(this, text, colorTypes.bold);
    },
    task: function(text) {
        return apply.call(this, text, colorTypes.bold);
    },
    error: function (text) {
        return apply.call(this, text, colorTypes.error);
    },
    warn: function (text) {
        return apply.call(this, text, colorTypes.warning);
    },
    info: function (text) {
        return apply.call(this, text, colorTypes.info);
    }
};

function apply(text, color) {
    if (this.useColors) {
        return '\u001b[' + color + ';1m' + text + '\u001b[0m';
    } else {
        return text;
    }
}
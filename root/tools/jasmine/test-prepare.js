function loadTestDependencies(isPhantom, cb) {
    var count = 0;

    function fixPath(path) {
        if (isPhantom) {
            return path.replace(/^(\/)*/, '');
        } else {
            return path;
        }
    }

    function loadJSInclude(scriptPath, callback) {
        var scriptNode = document.createElement('SCRIPT');
        scriptNode.type = 'text/javascript';
        scriptNode.src = fixPath(scriptPath);

        var headNode = document.getElementsByTagName('HEAD');
        if (headNode[0] != null) {
            headNode[0].appendChild(scriptNode);
        }

        if (callback != null) {
            scriptNode.onreadystagechange = callback;
            scriptNode.onload = callback;
        }

        count++;
    }

    function loadCSSInclude(cssPath, callback) {
        var linkNode = document.createElement('LINK');
        linkNode.rel = 'stylesheet';
        linkNode.href = fixPath(cssPath);

        var headNode = document.getElementsByTagName('HEAD');
        if (headNode[0] != null) {
            headNode[0].appendChild(linkNode);
        }

        if (callback != null) {
            linkNode.onreadystagechange = callback;
            linkNode.onload = callback;
        }

        if (!isPhantom) {
            // For some reason in phantom this does not work - TODO: investigate
            count++;
        }
    }

    function callback() {
        count--;

        if (count === 0) {
            cb();
        }
    }

    loadCSSInclude("/_tools/jasmine/jasmine-1.2.0/jasmine.css", callback);

    loadJSInclude("/_tools/jasmine/jasmine-1.2.0/jasmine.js", function () {
        // Jasmine-html reporter & console reporter relies on the fact that we have jasmine already
        loadJSInclude("/_tools/jasmine/reporters/html.js", callback);
        loadJSInclude("/_tools/jasmine/reporters/console.js", callback);

        callback();
    });

    // Load sinon mocking library
    loadJSInclude("/_tools/sinon/sinon.js", callback);

    loadJSInclude("../../node_modules/titan/titan-dev.js", callback);
}
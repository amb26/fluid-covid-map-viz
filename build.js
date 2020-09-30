/* eslint-env node */
"use strict";

var readline = require("readline"),
    fs = require("fs-extra");

var fluid = require("infusion");
var UglifyJS = require("uglify-js");

var buildIndex = {
    excludes: [
        "index.html"
    ],
    localSource: [
    ],
    codeHeader: "",
    codeFooter: "", // "\njQuery.noConflict()",
    copy: [{
        src: "src/html/template.html",
        dest: "build/html/template.html"
    }, {
        src: "src/buildTest/index.html",
        dest: "build/index.html"
    }, {
        src: "data/assessment_centre_locations.csv",
        dest: "build/data/assessment_centre_locations.csv"
    }]
};


var readLines = function (filename) {
    var lines = [];
    var togo = fluid.promise();
    var rl = readline.createInterface({
        input: fs.createReadStream(filename),
        terminal: false
    });
    rl.on("line", function (line) {
        lines.push(line);
    });
    rl.on("close", function () {
        togo.resolve(lines);
    });
    rl.on("error", function (error) {
        togo.reject(error);
    });
    return togo;
};

var filesToContentHash = function (allFiles, extension) {
    var extFiles = allFiles.filter(function (file) {
        return file.endsWith(extension);
    });
    var hash = fluid.transform(fluid.arrayToHash(extFiles), function (troo, filename) {
        return fs.readFileSync(filename, "utf8");
    });
    return hash;
};

var computeAllFiles = function (buildIndex, nodeFiles) {
    var withExcludes = nodeFiles.filter(function (oneFile) {
        return !buildIndex.excludes.some(function (oneExclude) {
            return oneFile.indexOf(oneExclude) !== -1;
        });
    });
    return withExcludes.concat(buildIndex.localSource);
};

var buildFromFiles = function (buildIndex, nodeFiles) {
    var allFiles = computeAllFiles(buildIndex, nodeFiles);
    nodeFiles.concat(buildIndex.localSource);

    var jsHash = filesToContentHash(allFiles, ".js");
    var fullJsHash = fluid.extend({header: buildIndex.codeHeader}, jsHash, {footer: buildIndex.codeFooter});
    fluid.log("Minifying " + Object.keys(fullJsHash).length + " JS files ... ");
    console.log("Sizes", fluid.transform(fullJsHash, function (file) {
        return file.length
    }));
    var minified = UglifyJS.minify(fullJsHash, {
        mangle: false,
        sourceMap: {
            filename: "fluid-covid-map-viz.js",
            url: "fluid-covid-map-viz.js.map"
        }
    });
    fs.removeSync("build");
    fs.ensureDirSync("build/js");
    fs.writeFileSync("build/js/fluid-covid-map-viz.js", minified.code, "utf8");
    fs.writeFileSync("build/js/fluid-covid-map-viz.js.map", minified.map);

    var cssHash = filesToContentHash(allFiles, ".css");
    var cssConcat = String.prototype.concat.apply("", Object.values(cssHash));

    fs.ensureDirSync("build/css");
    fs.writeFileSync("build/css/fluid-covid-map-viz-all.css", cssConcat);
    buildIndex.copy.forEach(function (oneCopy) {
        fs.copySync(oneCopy.src, oneCopy.dest);
    });
    fluid.log("Copied " + (buildIndex.copy.length + 3) + " files to " + fs.realpathSync("build"));
};

fluid.setLogging(true);

var linesPromise = readLines("topublish.txt");

linesPromise.then(function (lines) {
    buildFromFiles(buildIndex, lines);
}, function (error) {
    console.log(error);
});
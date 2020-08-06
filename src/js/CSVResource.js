/* global Papa, fluid */

"use strict";

fluid.resourceLoader.parsers.csv = function (resourceText, options) {
    var defaultOptions = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    };
    var parseOptions = fluid.extend({}, defaultOptions, options.resourceSpec.csvOptions);
    
    var parsed = Papa.parse(resourceText, parseOptions);
    var togo = fluid.promise();
    if (parsed.errors.length > 0) {
        togo.reject(errors)
    } else togo.resolve({
        meta: parsed.meta,
        headers: parsed.meta.fields,
        data: parsed.data
    });
    return togo;
};

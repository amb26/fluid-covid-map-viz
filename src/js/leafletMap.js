/* global L, fluid */

"use strict";

var hortis = fluid.registerNamespace("hortis");

// Adapted from https://github.com/amb26/bagatelle/blob/master/src/client/js/leafletMap.js
// Needs to be consolidated to produce a core implementation

fluid.defaults("hortis.leafletMap", {
    gradeNames: "fluid.viewComponent",
    selectors: {
        map: ".fld-mapviz-map",
        tooltip: ".fld-mapviz-map-tooltip",
    },
    members: {
        map: "@expand:L.map({that}.dom.map.0, {that}.options.mapOptions)"
    },
    events: {
        buildMap: null
    },
    mapOptions: {
        zoomSnap: 0.1
    },
    tileOptions: {
        // tileUrl, tileAttribution
    },
    datasets: {},
    model: {
        mapBlockTooltipId: null
    },
    markup: {
        tooltip: "<div class=\"fld-mapviz-tooltip\"></div>",
        tooltipHeader: "<table>",
        tooltipRow: "<tr><td class=\"fl-tooltip-key\">%key: </td><td class=\"fl-tooltip-value\">%value</td>",
        tooltipFooter: "</table>"
    },
    fitBounds: [[41.6,-95.2],[56.9,-74.3]],
    listeners: {
        "buildMap.fitBounds": "hortis.leafletMap.fitBounds({that}.map, {that}.options.fitBounds)",
        "buildMap.createTooltip": "hortis.leafletMap.createTooltip({that}, {that}.options.markup)",
        "buildMap.addTiles": "hortis.leafletMap.addTileLayer({that}.map, {that}.options.tileOptions)"
    },
    modelListeners: {
         "": {
             namespace: "buildMap",
             includeSource: "init",
             func: "{that}.events.buildMap.fire",
             args: "{that}"
         }
    }
});


hortis.leafletMap.fitBounds = function (map, fitBounds) {
    if (fitBounds) {
        map.fitBounds(fitBounds);
    }
};

hortis.leafletMap.createTooltip = function (that, markup) {
    var tooltip = $(markup.tooltip).appendTo(that.container);
    tooltip.hide();
    that.map.createPane("hortis-tooltip", tooltip[0]);
    var container = that.map.getContainer();
    $(container).on("click", function (event) {
        if (event.target === container) {
            that.applier.change("mapBlockTooltipId", null);
        }
    });
};


fluid.defaults("hortis.CSVLeafletMap", {
    gradeNames: ["hortis.leafletMap", "fluid.resourceLoader"],
    dataUrl: "http://thing",
    resources: {
        data: {
            url: "{that}.options.dataUrl",
            dataType: "csv"
        }
    },
    model: {
        // Light dependency for timing since crufty ChangeApplier will clone all the data on every model change
        headers: "{that}.resources.data.parsed.headers"
    }
});

fluid.defaults("hortis.streetmapTiles", {
    tileOptions: {
        tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        tileAttribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors" 
    }
});

hortis.leafletMap.addTileLayer = function (map, tileOptions) {
    if (tileOptions.tileUrl) {
        L.tileLayer(tileOptions.tileUrl, {
            attribution: tileOptions.tileAttribution
        }).addTo(map);
    }
};

hortis.parseColours = function (colours) {
    var togo = {};
    fluid.each(colours, function (colour, key) {
        togo[key] = colour;
        var parsed = fluid.colour.hexToArray(colour);
        var lighter = fluid.colour.interpolate(0.5, parsed, [255, 255, 255]);
        togo[key + "Lighter"] = fluid.colour.arrayToString(lighter);
    });
    return togo;
};


fluid.defaults("hortis.datasetControlBase", {
    gradeNames: "fluid.containerRenderingView",
    parentContainer: "{leafletMap}.dom.datasetControls"
});

fluid.defaults("hortis.datasetControlHeader", {
    gradeNames: "hortis.datasetControlBase",
    markup: {
        container: "<tr class=\"fld-bagatelle-dataset-control\">" +
                 "<td fl-bagatelle-dataset-legend-column></td>" +
                 "<td fl-bagatelle-dataset-checkbox-column></td>" +
                 "<td fl-bagatelle-dataset-name-column></td>" +
                 "%extraColumns</tr>",
        cell: "<td class=\"%columnClass\">%text</td>"
    },
    invokers: {
        renderMarkup: "hortis.datasetControl.renderMarkup({that}.options.markup, true)"
    }
});

fluid.defaults("hortis.datasetControl", {
    gradeNames: "hortis.datasetControlBase",
    selectors: {
        legend: ".fld-bagatelle-dataset-legend",
        enable: ".fld-bagatelle-dataset-checkbox",
        name: ".fld-bagatelle-dataset-name"
    },
    model: {
        datasetEnabled: true
    },
    modelRelay: {
        datasetEnabled: {
            target: "datasetEnabled",
            source: {
                context: "hortis.leafletMap",
                segs: ["datasetEnabled", "{that}.options.datasetId"]
            },
            singleTransform: {
                type: "fluid.transforms.identity"
            }
        }
    },
    invokers: {
        renderMarkup: "hortis.datasetControl.renderMarkup({that}.options.markup, false, {that}.options.dataset, {that}.options.quantiserDataset)"
    },
    // dataset, datasetId, quantiserDataset
    markup: {
        container: "<tr class=\"fld-bagatelle-dataset-control\">" +
                 "<td fl-bagatelle-dataset-legend-column><span class=\"fld-bagatelle-dataset-legend\"></span></td>" +
                 "<td fl-bagatelle-dataset-checkbox-column><input class=\"fld-bagatelle-dataset-checkbox\" type=\"checkbox\"/></td>" +
                 "<td fl-bagatelle-dataset-name-column><span class=\"fld-bagatelle-dataset-name\"></span></td>" +
                 "%extraColumns</tr>",
        cell: "<td class=\"%columnClass\">%text</td>"
    },
    listeners: {
        "onCreate.renderDom": "hortis.datasetControl.renderDom"
    }
});

fluid.defaults("hortis.datasetControlFooter", {
    gradeNames: "hortis.datasetControlBase",
    markup: {
        container: "<tr><td></td><td></td><td class=\"fld-bagatelle-dataset-footer\">%text</td><td></td><td>%taxaCount</td><td>%area</td></tr>"
    },
    // text
    invokers: {
        renderMarkup: {
            funcName: "fluid.stringTemplate",
            args: ["{that}.options.markup.container", {
                text: "{that}.options.text",
                taxaCount: "{that}.options.taxaCount",
                area: "{that}.options.area"
            }]
        }
    }
});


hortis.datasetControl.columnNames = {
    totalCount: {
        name: "Obs count",
        clazz: "fl-bagatelle-obs-count-column"
    },
    taxaCount: {
        name: "Richness",
        clazz: "fl-bagatelle-taxa-count-column"
    },
    area: {
        name: "Area (km²)",
        clazz: "fl-bagatelle-area-column"
    }
};

hortis.datasetControl.renderExtraColumns = function (markup, isHeader, dataset, quantiserDataset) {
    var extraColumns = fluid.transform(hortis.datasetControl.columnNames, function (columnInfo, key) {
        return fluid.stringTemplate(markup, {
            columnClass: columnInfo.clazz,
            text: isHeader ? columnInfo.name : quantiserDataset[key]
        });
    });
    return Object.values(extraColumns).join("\n");
};

hortis.datasetControl.renderMarkup = function (markup, isHeader, dataset, quantiserDataset) {
    var extraColumns = hortis.datasetControl.renderExtraColumns(markup.cell, isHeader, dataset, quantiserDataset);
    return fluid.stringTemplate(markup.container, {
        extraColumns: extraColumns
    });
};

hortis.datasetControl.renderDom = function (that) {
    that.locate("legend").css("background-color", that.options.dataset.colour);
    that.locate("name").text(that.options.dataset.name);
    var checkbox = that.locate("enable");
    checkbox.prop("checked", that.model.datasetEnabled);
    checkbox.change(function () {
        var newState = checkbox.prop("checked");
        that.applier.change("datasetEnabled", newState);
    });
};

hortis.leafletMap.tooltipRow = function (markup, key, value) {
    return fluid.stringTemplate(markup.tooltipRow, {key: key, value: value});
};


hortis.leafletMap.updateTooltip = function (map, key) {
    var tooltip = map.locate("tooltip");
    var bucket = map.toPlot[key];
    if (bucket) {
        var text = map.options.markup.tooltipHeader;
        var dumpRow = function (key, value) {
            text += hortis.leafletMap.tooltipRow(map, key, value);
        };
        var c = function (value) {
            return value.toFixed(3);
        };
        dumpRow("Observation Count", bucket.count);
        dumpRow("Species Richness", Object.values(bucket.byTaxonId).length);
        var p = bucket.polygon;
        var lat0 = p[0][0], lat1 = p[2][0];
        var lng0 = p[0][1], lng1 = p[1][1];
        dumpRow("Latitude", c(lat0) + " to " + c(lat1));
        dumpRow("Longitude", c(lng0) + " to " + c(lng1));
        dumpRow("Dimensions", ((lat1 - lat0) * hortis.latitudeLength(lat0)).toFixed(0) + "m x " +
            ((lng1 - lng0) * hortis.longitudeLength(lat0)).toFixed(0) + "m");
        if (bucket.count < 5) {
            var obs = fluid.flatten(Object.values(bucket.byTaxonId));
            var obsString = fluid.transform(obs, hortis.leafletMap.renderObsId).join("<br/>");
            dumpRow("Observations", obsString);
        }
        text += map.options.markup.tooltipFooter;
        tooltip[0].innerHTML = text;
        tooltip.show();
        var element = bucket.Lpolygon.getElement();
        element.classList.add("fl-bagatelle-highlightBlock");
        var parent = element.parentNode;
        parent.insertBefore(element, null);
    } else {
        tooltip.hide();
    }
};


// From https://en.wikipedia.org/wiki/Longitude#Length_of_a_degree_of_longitude
hortis.WGS84a = 6378137;
hortis.WGS84b = 6356752.3142;
hortis.WGS84e2 = (hortis.WGS84a * hortis.WGS84a - hortis.WGS84b * hortis.WGS84b) / (hortis.WGS84a * hortis.WGS84a);

/** Length in metres for a degree of longitude at given latitude **/

hortis.longitudeLength = function (latitude) {
    var latrad = Math.PI * latitude / 180;
    var sinrad = Math.sin(latrad);
    return Math.PI * hortis.WGS84a * Math.cos(latrad) / (180 * Math.sqrt(1 - hortis.WGS84e2 * sinrad * sinrad));
};

/** Length in metres for a degree of latitude at given latitude **/

hortis.latitudeLength = function (latitude) {
    var latrad = Math.PI * latitude / 180;
    var sinrad = Math.sin(latrad);
    return Math.PI * hortis.WGS84a * (1 - hortis.WGS84e2) / (180 * Math.pow(1 - hortis.WGS84e2 * sinrad * sinrad, 1.5));
};

hortis.longToLat = function (lng, lat) {
    var longLength = hortis.longitudeLength(lat);
    var latLength = hortis.latitudeLength(lat);
    return lng * longLength / latLength;
};


hortis.quickDistance = function (c1, c2) {
    var baselat = c1[0];
    var latd = (c1[0] - c2[0]) * hortis.latitudeLength(baselat);
    var longd = (c1[1] - c2[1]) * hortis.longitudeLength(baselat);
    return Math.sqrt(latd * latd + longd + longd);
};

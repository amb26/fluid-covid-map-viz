/* global fluid, L */

"use strict";

fluid.setLogging(true);

fluid.registerNamespace("fluid.mapviz.covid");

fluid.mapviz.covid.metresInMile = 1609.34;

fluid.defaults("fluid.mapviz.covid.pagerBar", {
    gradeNames: "fluid.pager.pagerBar",
    components: {
        pageList: {
            type: "fluid.emptySubcomponent"
        }
    },
    selectors: {
        previous: ".fld-mapviz-page-left",
        next: ".fld-mapviz-page-right"
    }
});

fluid.defaults("fluid.mapviz.covid.pager", {
    gradeNames: "fluid.pager",
    dynamicComponents: {
        pagerBar: {
            type: "fluid.mapviz.covid.pagerBar"
        },
        summary: {
            options: {
                strings: {
                    message: "Showing results %first-%last of %total"
                }
            }
        }
    },
    modelRelay: {
        // These definitions taken from Pager's summary subcomponent, should go into its definition
        firstIndex: {
            target: "firstIndex",
            func: (pageIndex, pageSize) => pageIndex * pageSize + 1,
            args: ["{that}.model.pageIndex", "{that}.model.pageSize"]
        },
        lastIndex: {
            target: "lastIndex",
            source: "",
            func: "fluid.pager.computePageLimit"
        }
    },
    selectors: {
        summary: ".fld-mapviz-pagination-summary",
        // Note that we just about get away with the Pager's notion of a "pager bar" since we created a container for its
        // buttons - but how would we accommodate, e.g., a model where the user wanted the summary duplicated etc.?
        // Note that the pager has an interesting model of "duplicated but not repeating" components. This can't be accommodated
        // in the renderer's current idiom which assumes that a selector which matches multiple nodes implies a contiguous area of repetition.
        // Well - it sort of can - since it depends on the "sources" idiom which is model-driven rather than markup driven. We could upgrade it
        // so that a boolean lensed component or unlensed component could duplicate itself into multiple containers - but still, this would
        // imply a mismatch in cardinality of the model source and the number of instantiated components. We would better turn these into
        // distinct subcomponents with distinct DOM binder selectors and linked models.
        pagerBar: ".fld-mapviz-pagination-buttons"
    },
    invokers: {
        acquireDefaultRange: { // TODO: Totally absurd integration model for Pager
            func: function () {
                return undefined;
            }
        }
    }
});

fluid.defaults("fluid.mapviz.covid.hospitalRenderer", {
    gradeNames: "fluid.modelComponent",
    selectors: {
        hospitalTitle: ".fld-mapviz-hospital-title",
        hospitalHours: ".fld-mapviz-hospital-hours",
        hospitalAddress: ".fld-mapviz-hospital-address",
        hospitalPhone:  ".fld-mapviz-hospital-phone"
    },
    modelRelay: {
        hospitalTitle: {
            source: {
                segs: ["row", "{map}.options.fields.name"]
            },
            target: "dom.hospitalTitle.text"
        },
        hospitalHours: {
            source: "row",
            target: "dom.hospitalHours.text",
            func: "fluid.mapviz.covid.renderHours"
        },
        hospitalAddress: {
            source: "row",
            target: "dom.hospitalAddress.text",
            func: "fluid.mapviz.covid.renderAddress"
        },
        hospitalPhone: {
            source: {
                segs: ["mwp", "{map}.options.fields.phone"]
            },
            target: "dom.hospitalPhone.text"
        }
    }
});


fluid.defaults("fluid.mapviz.covid.map", {
    gradeNames: ["hortis.leafletMap", "hortis.streetmapTiles", "hortis.CSVLeafletMap", "hortis.conditionalTemplateRenderer"],
    colours: {
        accessible: "#0f0",
        inaccessible: "#f00"
    },
    fields: {
        name: "location_name",
        website: "website",
        phone: "phone"
    },
    accessibleChecks: {
        entrances: {
            selector: ".fld-mapviz-filter-entrances",
            column: "Wheelchair-accessible entrance"
        },
        washroom: {
            selector: ".fld-mapviz-filter-washrooms",
            column: "Wheelchair-accessible bathrooms"
        },
        parking: {
            selector: ".fld-mapviz-filter-parking",
            column: "Accessible parking"
        },
        individual: {
            selector: ".fld-mapviz-filter-individual",
            column: "Personalized or individual service is offered"
        },
        wait: {
            selector: ".fld-mapviz-filter-wait",
            column: "Queue accomodations"
        }
    },
    unselectedChecks: "@expand:fluid.mapviz.covid.unselectedChecks({that}.options.accessibleChecks)",
    parsedColours: "@expand:hortis.parseColours({that}.options.colours)",
    listeners: {
        "buildMap.addMarkers": "fluid.mapviz.covid.addMarkers({that}, {that}.options.parsedColours, {that}.options.markup)"
    },
    model: {
        query: "",
        pageSize: 5,
        activeChecks: "{that}.options.unselectedChecks",
        uiChecks: "{that}.options.unselectedChecks",
        matchedRows: [], // Map of row indices to boolean
        matchedRowIndices: [], // The indices of the matched rows
        visiblePageIndices: [], // The indices, selected from matchedRowIndices, which are visible
        selectedRows: [], // Map of row indices to boolean
        hoveredRows: [], // Map of row indices to boolean
        selectedIndex: null,
        hoveredIndex: null
        // selectedHospital: null
    },
    // TODO: Allow resources to be defaulted in a civilized manner
    templateUrl: null,
    searchResultTemplateUrl: null,
    resources: {
        template: {
            url: "{that}.options.templateUrl"
        }
    },
    markers: {
        standard: {
            iconUrl: "src/img/Marker.svg",
            iconSize: [51, 65],
            iconAnchor: [25.5, 65]
        },
        hover: {
            iconUrl: "src/img/Marker-hover.svg",
            iconSize: [61, 76],
            iconAnchor: [30.5, 70]
        },
        selected: {
            iconUrl: "src/img/Marker-selected.svg",
            iconSize: [108, 108],
            iconAnchor: [54, 90]
        }
    },
    modelListeners: {
        "selectedIndexMarkers": {
            path: "selectedIndex",
            funcName: "fluid.mapviz.covid.updateMarkers",
            args: ["{that}", "{change}.value", "{change}.oldValue"]
        },
        "hoveredIndexMarkers": {
            path: "hoveredIndex",
            funcName: "fluid.mapviz.covid.updateMarkers",
            args: ["{that}", "{change}.value", "{change}.oldValue"]
        },
        "selectedIndexPage": {
            path: "selectedIndex",
            funcName: "fluid.mapviz.covid.showPageForIndex",
            args: ["{that}", "{change}.value"]
        },
        "hoveredIndexPage": {
            path: "hoveredIndex",
            funcName: "fluid.mapviz.covid.showPageForIndex",
            args: ["{that}", "{change}.value"]
        }
    },
    components: {
        pager: {
            type: "fluid.mapviz.covid.pager",
            container: "{that}.dom.pager",
            options: {
                model: {
                    totalRange: "{map}.model.matchedRowIndices.length",
                    pageSize: "{map}.model.pageSize"
                }
            }
        },
        resultsPage: {
            type: "fluid.mapviz.covid.map.resultsPage",
            container: "{that}.dom.resultsPage",
            options: {
                model: {
                    visiblePageIndices: "{map}.model.visiblePageIndices"
                }
            }
        },
        selectedHospitalPane: {
            type: "fluid.mapviz.covid.hospitalRenderer",
            container: "{that}.dom.hospitalPanel",
            options: {
                gradeNames: "fluid.viewComponent",
                model: {
                    row: "{map}.model.selectedHospital"
                },
                selectors: {
                    hospitalWebsite: ".fld-mapviz-hospital-website" // This field left over from fluid.mapviz.covid.hospitalRenderer
                },
                modelRelay: {
                    hospitalWebsite: {
                        source: {
                            segs: ["row", "{map}.options.fields.website"]
                        },
                        target: "dom.hospitalWebsite.text"
                    }
                }
            }
        }
    },
    selectors: {
        query: ".fld-mapviz-query",
        pager: ".fld-mapviz-search-result-pagination",
        resultsPage: ".fld-mapviz-search-results",
        hospitalPanel: ".fld-mapviz-hospital-panel"
    },
    modelRelay: {
        // Selection and hover state
        isHospitalSelected: {
            target: "dom.hospitalPanel.visible",
            source: "selectedIndex",
            func: "fluid.isValue"
        },
        selectedHospital: {
            target: "selectedHospital",
            args: ["{that}.model.selectedIndex", "{that}.model.rows"],
            func: (index, rows) => rows[index]
        },
        selectedRows: {
            target: "selectedRows",
            args: ["{that}.model.rows", "{that}.model.selectedIndex"],
            func: "fluid.transforms.indexToBooleans"
        },
        hoveredRows: {
            target: "hoveredRows",
            args: ["{that}.model.rows", "{that}.model.hoveredIndex"],
            func: "fluid.transforms.indexToBooleans"
        },
        // Query state
        matchedRows: {
            target: "matchedRows",
            func: "fluid.mapviz.covid.doQuery",
            args: ["{that}.model.rows", "{that}.model.query", "{that}.model.activeChecks", "{that}.options.accessibleChecks"]
        },
        matchedRowIndices: {
            target: "matchedRowIndices",
            source: "matchedRows",
            func: "fluid.transforms.setMembershipToArray"
        },
        // Paging state
        visiblePageIndices: {
            target: "visiblePageIndices",
            func: function (matchedRowIndices, firstIndex, lastIndex) {
                return matchedRowIndices.slice(firstIndex - 1, lastIndex);
            },
            args: ["{that}.model.matchedRowIndices", "{pager}.model.firstIndex", "{pager}.model.lastIndex"]
        }
    }
});

fluid.transforms.indexToBooleans = function (rows, selectedIndex) {
    return rows.map(function (row, index) {
        return index === selectedIndex;
    });
};

fluid.defaults("fluid.mapviz.covid.map.resultsPage", {
    gradeNames: "fluid.viewComponent",
    model: {
        // visiblePageIndices: []
    },
    selectors: {
        resultList: ".fld-mapviz-search-result-list"
    },
    listeners: {
         // TODO: eliminate this workflow when we move to real renderer
/*         "onCreate.clear": {
              "this": "{resultsPage}.dom.resultList",
              method: "empty"
         }
*/
    },
    dynamicComponents: {
        searchResults: {
            sources: "{resultsPage}.model.visiblePageIndices",
            type: "fluid.mapviz.covid.map.searchResult",
            options: {
                parentContainer: "{resultsPage}.dom.resultList"
            }
        }
    }
});

fluid.defaults("fluid.mapviz.covid.map.searchResult", {
    gradeNames: ["fluid.mapviz.covid.hospitalRenderer", "fluid.templateRenderingView"],
    templateUrl: "{map}.options.searchResultTemplateUrl",
    model: {
        hospitalIndex: "{source}"
    },
    styles: {
        selected: "fl-mapviz-search-result-selected",
        hover: "fl-mapviz-search-result-hover"
    },
    modelRelay: {
        fetchRow: {
            target: "row",
            func: (index, rows) => rows[index],
            args: ["{that}.model.hospitalIndex", "{map}.model.rows"]
        },
        isSelected: {
            target: "isSelected",
            func: (index, selectedRows) => selectedRows[index],
            args: ["{that}.model.hospitalIndex", "{map}.model.selectedRows"]
        },
        isHovered: {
            target: "isHovered",
            func: (index, hoveredRows) => hoveredRows[index],
            args: ["{that}.model.hospitalIndex", "{map}.model.hoveredRows"]
        },
        // Rendering directives
        showSelected: {
            source: "isSelected",
            target: {
                segs: ["dom", "container", "class", "{that}.options.styles.selected"]
            }
        },
        showHovered: {
            source: "isHovered",
            target: {
                segs: ["dom", "container", "class", "{that}.options.styles.hover"]
            }
        }
    },
    modelListeners: {
        clickToSelect: {
            path: "dom.container.click",
            changePath: "{map}.model.selectedIndex",
            value: "{that}.model.hospitalIndex"
        },
        hoverToHover: {
            path: "dom.container.hover",
            changePath: "{map}.model.hoveredIndex",
            value: "{that}.model.hospitalIndex"
        }
    }
});

fluid.mapviz.covid.unselectedChecks = function (checks) {
    return fluid.transform(checks, () => false);
};

fluid.capitalize = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

fluid.mapviz.covid.renderHours = function (row) {
    return ["monday", "tuesday", "wednesday", "thursday", "friday"].map(function (day) {
        return fluid.capitalize(day) + ": " + (row[day] || "closed");
    }).join(", ");
};

fluid.mapviz.covid.renderAddress = function (row) {
    return row.address + ", " + row.city + ", " + row.province + " " + row.postal_code;
};

fluid.mapviz.covid.doQuery = function (rows, query, activeChecks, checks) {
    var tokens = query.split(" ").map(s => s.trim()).filter(t => t);
    var noChecks = fluid.hashToArray(activeChecks).every(a => !a);
    // var checksActive = activeChecks.some(a => a) && activeChecks.some(a => !a);
    var selected = rows.map(function (row) {
        var address = fluid.mapviz.covid.renderAddress(row);
        var matchTokens = tokens.length ? tokens.some(t => address.contains(t)) : true;
        var checkMatches = fluid.transform(checks, function (record, key) {
            var value = row[record.column];
            return !activeChecks[key] || value.contains("Yes");
        });
        var matchChecks = noChecks || fluid.hashToArray(checkMatches).every(a => a);
        return matchTokens && matchChecks;
    });
    return selected;
};

fluid.mapviz.covid.updateMarker = function (that, index) {
    if (Number.isInteger(index)) {
        var marker = that.model.selectedRows[index] ? that.markers.selected : (that.model.hoveredRows[index] ?
             that.markers.hover : that.markers.standard);
        that.rowMarkers[index].setIcon(marker);
    }
};

fluid.mapviz.covid.updateMarkers = function (that, index1, index2) {
    fluid.mapviz.covid.updateMarker(that, index1);
    fluid.mapviz.covid.updateMarker(that, index2);
};

fluid.mapviz.covid.showPageForIndex = function (that, newIndex) {
    if (Number.isInteger(newIndex)) {
        var filterIndex = that.model.matchedRowIndices.indexOf(newIndex);
        if (filterIndex !== -1) {
            var pageIndex = Math.floor(filterIndex / that.model.pageSize);
            that.pager.applier.change("pageIndex", pageIndex);
        }
    }
};

fluid.mapviz.covid.addMarkers = function (that) {
    that.markers = fluid.transform(that.options.markers, function (marker) {
        return L.icon(marker);
    });

    $(that.container).on("click", function (event) {
        if (event.target === that.locate("map")[0]) {
            that.applier.change("selectedIndex", null);
        }
    });
    var data = that.resources.data.parsed.data;
    that.rowMarkers = data.map(function (row, index) {
        if (!row.latitude || !row.longitude) {
            fluid.log("Warning, ignoring row ", row, " which does not have valid coordinates");
        } else {
            var marker = L.marker([row.latitude, row.longitude], {
                icon: that.markers.standard
            }).addTo(that.map);
            marker.on("mouseover", function () {
                that.applier.change("hoveredIndex", index);
            });
            marker.on("mouseout", function () {
                that.applier.change("hoveredIndex", null);
            });
            marker.on("click", function () {
                that.applier.change("selectedIndex", index);
            });
            return marker;
        }
    });
};

// Generated: 2026-07-20 22h37 PDT

    "use strict";

    let openul = true,
    openul2 = true,
    search_opt = {
        a: ["America", "Asia", "Africa", "America", "Asia", "Africa"]
    },
    data = {
        countries:["Canada", "US"],
        /*style:[
            "m729/cjipjz6au358b2sukzcojfkae",
            "m729/cjipkyug036382rrpvvrig36o"
        ], 
        coords: [[-112.9425,37.2686]], 
        zoom: [14],
        north_coords: [85.0499608289278, 84.70033991534467],*/
        // rg fix
        map_styles:[
            "m729/ck76vyenb0te31it2qhgt4fha",
            "m729/ckmcrofbj2jt217ofjk1jeckr",
            "m729/ck76vz69b0hw51ir9m3i4t3h4",
            "m729/ck762zfe7057o1iqqr9o2nr8z",
            "m729/ck917uugk0xq61ilcs8znogur",
            "m729/cln2mxute003y01pweq5b8k0g",
            "m729/ckk6jq9o70rk317o232u6loug",
            "m729/cmotlmtja000301spcuy2dzmg",
            "mapbox/satellite-v9",
        ]
        // rg fix end
    },
    location_move = false,
    d = window.location.href.split("#");
  
    if (d.length > 1) {
        let d2 = d[1].split("/");
        data.coords = [[parseFloat(d2[1]), parseFloat(d2[2])]];
        data.zoom = [parseInt(d2[0])];
    }
    
    let check_for_north = false,
    preInitDataConfig = [
        {
            styleNumber: 2,
            zoomLevel: 11.85,
            center: [-122.347, 47.599]
        },
        {
            styleNumber: 0,
            zoomLevel: 10.34,
            center: [-84.404, 33.755]
        },
        {
            styleNumber: 4,
            zoomLevel: 12.82,
            center: [-71.076, 42.348]
        }
    ];

    function getRandomValueFromArray ( array ) {
        return array[Math.floor(Math.random() * array.length)]
    }

    function escapeHtml ( text ) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function linkifyText ( text ) {
        if (!text) return "";
        var urlRe = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
        var parts = text.split(urlRe);
        var out = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
                var href = /^https?:\/\//i.test(part) ? part : "https://" + part;
                out.push("<a href=\"" + escapeHtml(href) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(part) + "</a>");
            } else {
                out.push(escapeHtml(part).replace(/\n/g, "<br>"));
            }
        }
        return out.join("");
    }

    /** Step 13: Build popup HTML from layer data fields. Per-map config in HOVER_POPUP_CONFIG. */
    var POPUP_FIELD_KEYS = ["rr_full", "classic_full", "rg_name", "sub_title", "rg_desc"];

    /**
     * Per-map config for hover and popup. Style index 0=Current, 1=Attractions, 2=Classic Owners, 3=Current/Classic, 4=Early Owners, 5=Points of Interest, 6=Abandoned, 7=Satellite.
     *   hoverFields, popupFields: property keys for hover/popup.
     *   hoverMaxChars, hoverMaxLines, popupMaxCharsPerField: optional limits.
     *   popupFieldStyles: optional object mapping field key to CSS class for styling (e.g. rg_name: "popup-field-title").
     *   hoverFieldStyles: optional object mapping field key to CSS class for hover tooltip (e.g. rg_name: "hover-field-title").
     *   linkDisplayText: optional object mapping field key to alternate link text (e.g. sub_title: "Open article") when the field value is a URL.
     */
    /*var HOVER_POPUP_CONFIG = {
        0: { hoverFields: ["rr_full", "rg_name"], popupFields: ["rr_full", "rg_name", "sub_title", "rg_desc"], popupFieldStyles: { rg_name: "popup-field-title", sub_title: "popup-field-sub" }, hoverFieldStyles: { rr_full: "hover-field-title" } },
        1: { hoverFields: ["rg_name", "sub_title"], popupFields: ["rg_name", "sub_title", "rg_desc"], popupFieldStyles: { rg_name: "popup-field-title", sub_title: "popup-field-sub" }, hoverFieldStyles: { rg_name: "hover-field-title", sub_title: "hover-field-sub" }, linkDisplayText: { rg_desc: "Open article" } },
        2: { hoverFields: ["classic_full", "rg_name", "sub_title", "rg_desc"], popupFields: ["classic_full", "rg_name", "sub_title", "rg_desc"], popupFieldStyles: { classic_full: "popup-field-title", sub_title: "popup-field-sub" }, hoverFieldStyles: { classic_full: "hover-field-title", sub_title: "hover-field-sub" } },
        3: { hoverFields: ["rr_full", "classic_full", "rg_name", "rg_desc"], popupFields: ["rr_full", "classic_full", "rg_name", "sub_title", "rg_desc"], popupFieldStyles: { rg_name: "popup-field-title", sub_title: "popup-field-sub" }, hoverFieldStyles: { rg_name: "hover-field-title" } },
        4: { hoverFields: ["rr_full", "classic_full", "rg_name", "sub_title"], popupFields: ["rr_full", "classic_full", "rg_name", "sub_title", "rg_desc"], popupFieldStyles: { rg_name: "popup-field-title", sub_title: "popup-field-sub" }, hoverFieldStyles: { rg_name: "hover-field-title" } },
        5: { hoverFields: ["rr_full", "classic_full", "rg_name", "sub_title"], popupFields: ["name", "title", "label", "Name", "Title", "description", "url", "website", "link"] },
        6: { hoverFields: ["rr_full", "classic_full", "rg_name", "sub_title"], popupFields: ["name", "title", "label", "Name", "Title", "description", "url", "website", "link"] },
        7: { hoverFields: ["rr_full", "classic_full", "rg_name", "sub_title"], popupFields: ["name", "title", "label", "Name", "Title", "description", "url", "website", "link"] }
    };
    var DEFAULT_HOVER_MAX_CHARS = 0;
    var DEFAULT_HOVER_MAX_LINES = 0;
    var DEFAULT_POPUP_MAX_CHARS_PER_FIELD = 0;*/

    function buildPopupHtml ( properties, options ) {
        if (!properties) return "";
        options = options || {};
        var fieldKeys = options.fieldKeys || options.popupFields || POPUP_FIELD_KEYS;
        var maxCharsPerField = options.maxCharsPerField || options.popupMaxCharsPerField || DEFAULT_POPUP_MAX_CHARS_PER_FIELD;
        var fieldStyles = options.popupFieldStyles || {};
        var linkDisplayText = options.linkDisplayText || {};
        var lines = [];
        var seen = {};
        for (var i = 0; i < fieldKeys.length; i++) {
            var key = fieldKeys[i];
            var val = properties[key];
            if (val == null || val === "" || seen[key]) continue;
            var s = String(val).trim();
            if (!s) continue;
            if (maxCharsPerField > 0 && s.length > maxCharsPerField) s = s.substring(0, maxCharsPerField) + "\u2026";
            seen[key] = true;
            var isUrl = /^https?:\/\//i.test(s) || /^www\./i.test(s);
            var inner = "";
            if (isUrl) {
                var href = /^https?:\/\//i.test(s) ? s : "https://" + s;
                var displayText = linkDisplayText[key] || s;
                inner = "<a href=\"" + escapeHtml(href) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(displayText) + "</a>";
            } else {
                inner = linkifyText(s);
            }
            var cssClass = "popup-field popup-field-" + key.replace(/[^a-z0-9_]/gi, "-");
            if (fieldStyles[key]) cssClass += " " + fieldStyles[key];
            lines.push("<span class=\"" + cssClass + "\">" + inner + "</span>");
        }
        return lines.join("<br>") || "";
    }

    function buildHoverContent ( properties, options ) {
        if (!properties) return "";
        options = options || {};
        var fieldKeys = options.fieldKeys || options.hoverFields || POPUP_FIELD_KEYS;
        var maxLines = options.maxLines || options.hoverMaxLines || DEFAULT_HOVER_MAX_LINES;
        var maxTotalChars = options.maxChars || options.hoverMaxChars || DEFAULT_HOVER_MAX_CHARS;
        var maxCharsPerField = options.maxCharsPerField || 0;
        var parts = [];
        var seen = {};
        for (var i = 0; i < fieldKeys.length; i++) {
            if (maxLines > 0 && parts.length >= maxLines) break;
            var key = fieldKeys[i];
            var val = properties[key];
            if (val == null || val === "" || seen[key]) continue;
            var s = String(val).trim();
            if (!s) continue;
            if (maxCharsPerField > 0 && s.length > maxCharsPerField) s = s.substring(0, maxCharsPerField) + "\u2026";
            seen[key] = true;
            parts.push(s);
        }
        var text = parts.join("\n");
        if (maxTotalChars > 0 && text.length > maxTotalChars) text = text.substring(0, maxTotalChars) + "\u2026";
        return text;
    }

    function buildHoverHtml ( properties, options ) {
        if (!properties) return "";
        options = options || {};
        var fieldKeys = options.fieldKeys || options.hoverFields || POPUP_FIELD_KEYS;
        var maxLines = options.maxLines || options.hoverMaxLines || DEFAULT_HOVER_MAX_LINES;
        var maxTotalChars = options.maxChars || options.hoverMaxChars || DEFAULT_HOVER_MAX_CHARS;
        var maxCharsPerField = options.maxCharsPerField || 0;
        var fieldStyles = options.hoverFieldStyles || {};
        var parts = [];
        var seen = {};
        var totalChars = 0;
        for (var i = 0; i < fieldKeys.length; i++) {
            if (maxLines > 0 && parts.length >= maxLines) break;
            if (maxTotalChars > 0 && totalChars >= maxTotalChars) break;
            var key = fieldKeys[i];
            var val = properties[key];
            if (val == null || val === "" || seen[key]) continue;
            var s = String(val).trim();
            if (!s) continue;
            if (maxCharsPerField > 0 && s.length > maxCharsPerField) s = s.substring(0, maxCharsPerField) + "\u2026";
            if (maxTotalChars > 0 && totalChars + s.length > maxTotalChars) s = s.substring(0, maxTotalChars - totalChars) + "\u2026";
            totalChars += s.length;
            seen[key] = true;
            var inner = linkifyText(s);
            var cssClass = "hover-field hover-field-" + key.replace(/[^a-z0-9_]/gi, "-");
            if (fieldStyles[key]) cssClass += " " + fieldStyles[key];
            parts.push("<div class=\"hover-line\"><span class=\"" + cssClass + "\">" + inner + "</span></div>");
        }
        return parts.join("") || "";
    }

    /** 
     * Given a query in the form "lng, lat" or "lat, lng"
     * returns the matching geographic coordinate(s)
     */
    function coordinatesGeocoder (query) {
        // Match anything which looks like
        // decimal degrees coordinate pair.
        const matches = query.match(/^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i);
        if ( !matches ) {
            return null;
        }
         
        function coordinateFeature(lng, lat) {
            return {
                center: [lng, lat],
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },
                place_name: "Lat: " + lat + " Lng: " + lng,
                place_type: ["coordinate"],
                properties: {},
                type: "Feature"
            };
        }
         
        const coord1 = Number(matches[1]),
        coord2 = Number(matches[2]),
        geocodes = [];
     
        if ( coord1 < -90 || coord1 > 90 ) {
            // must be lng, lat
            geocodes.push(coordinateFeature(coord1, coord2));
        }
         
        if  (coord2 < -90 || coord2 > 90 ) {
            // must be lat, lng
            geocodes.push(coordinateFeature(coord2, coord1));
        }
     
        if ( geocodes.length === 0 ) {
            // else could be either lng, lat or lat, lng
            // rg fix
            geocodes.push(coordinateFeature(coord2, coord1));
            geocodes.push(coordinateFeature(coord1, coord2));
            // rg fix end
        }
         
        return geocodes;
    };

    window.mapboxgl.accessToken = "pk.eyJ1IjoibTcyOSIsImEiOiJjbXFoNjJtajMwODJuMnJvZHJ0a3N4MWd4In0.N2rPinfQONzkySZk-TZh6Q";

    class handleMapPrcoessCreation {
        constructor ( options ) {
            void 0 === options && ( options = {} );
            this.currentStyleIndex = options.styleNumber !== undefined ? options.styleNumber : 0;
            this.map = new window.mapboxgl.Map({
                container: "map",
                style: "mapbox://styles/" + data.map_styles[options.styleNumber],
                center: options.center,
                zoom: options.zoomLevel,
                pitchWithRotate: false,
                attributionControl: false,
                reverseGeocode: true,
                hash: true
            });
            window._rgSteamMap = this.map;

            this.mapgeocoder = new window.MapboxGeocoder({
                accessToken: window.mapboxgl.accessToken,
                localGeocoder: coordinatesGeocoder,
                mapboxgl: window.mapboxgl,
                limit: 8,
                minLength: 4,  /* autocomplete starts only after 4 characters */
                countries: "us,ca,mx",  /* limit results to US, Canada, Mexico */
                placeholder: "Search/Coordinates"
            });

            this.mapScale = new mapboxgl.ScaleControl({
                maxWidth: 80,
                unit: "imperial"
            });
            this.map.addControl(this.mapScale);

            // Hide native scale; replaced by custom dual-unit bar below
            (function hideMbScale() {
                function tryHide() {
                    var s = document.querySelector(".mapboxgl-ctrl-scale");
                    if (s) { s.style.display = "none"; }
                    else { setTimeout(tryHide, 50); }
                }
                tryHide();
            })();

            // Build dual-unit scale bar
            var rgScale = document.createElement("div");
            rgScale.id = "rg-dual-scale";
            rgScale.innerHTML =
                '<div class="rg-scale-row rg-scale-imp">' +
                    '<span class="rg-scale-label"></span>' +
                    '<div class="rg-scale-bar"></div>' +
                '</div>' +
                '<div class="rg-scale-row rg-scale-met">' +
                    '<span class="rg-scale-label"></span>' +
                    '<div class="rg-scale-bar"></div>' +
                '</div>';
            document.body.appendChild(rgScale);

            var _rgBase = this;
            function updateRgScale() {
                var map = _rgBase.map;
                var lat = map.getCenter().lat;
                var zoom = map.getZoom();
                var mPerPx = (40075016.686 * Math.cos(lat * Math.PI / 180)) / (512 * Math.pow(2, zoom));
                var maxPx = 125;
                var maxM = mPerPx * maxPx;

                // Metric - nice round numbers
                var mSteps = [1,2,5,10,20,50,100,200,500];
                function niceMetric(val) {
                    var mag = Math.pow(10, Math.floor(Math.log10(val)));
                    var best = mSteps[0] * mag;
                    for (var i = 0; i < mSteps.length; i++) {
                        if (mSteps[i] * mag <= val) best = mSteps[i] * mag;
                    }
                    return best;
                }
                var mVal, mLabel;
                if (maxM >= 1000) {
                    mVal = niceMetric(maxM / 1000) * 1000;
                    mLabel = (mVal / 1000) + " km";
                } else {
                    mVal = niceMetric(maxM);
                    mLabel = mVal + " m";
                }
                var mPx = Math.round(mVal / mPerPx);

                // Imperial - flat candidate list avoids ft/mi boundary errors
                var maxFt = maxM * 3.28084;
                var ftCandidates = [
                    50, 100, 200, 500, 1000, 2000,
                    5280, 5280*2, 5280*5, 5280*10, 5280*20,
                    5280*50, 5280*100, 5280*200, 5280*500
                ];
                var iVal = ftCandidates[0];
                for (var fi = 0; fi < ftCandidates.length; fi++) {
                    if (ftCandidates[fi] <= maxFt) iVal = ftCandidates[fi];
                }
                var iLabel = iVal >= 5280 ? (iVal / 5280) + " mi" : iVal + " ft";
                var iPx = Math.round((iVal / 3.28084) / mPerPx);

                var impRow = rgScale.querySelector(".rg-scale-imp");
                var metRow = rgScale.querySelector(".rg-scale-met");
                impRow.querySelector(".rg-scale-label").textContent = iLabel;
                impRow.querySelector(".rg-scale-bar").style.width = iPx + "px";
                metRow.querySelector(".rg-scale-label").textContent = mLabel;
                metRow.querySelector(".rg-scale-bar").style.width = mPx + "px";
                rgScale.style.width = Math.max(iPx, mPx) + "px";
            }

            _rgBase.map.on("move", updateRgScale);
            _rgBase.map.on("zoom", updateRgScale);
            _rgBase.map.on("load", updateRgScale);
            setTimeout(updateRgScale, 200);
            setTimeout(updateRgScale, 600);

            this.addControl();
            this.addEvents();
            this.addSearchBox();
            this.fitContentByDevice(true);

            let base = this,
            t = true;

            this.showLatitudeAndLongitudeAndZoomLevel(options.center);

            this.toggleSearch =  function (){
                location_move = true;
                let a = document.getElementsByClassName("mapboxgl-ctrl-geolocate");
                if ( t ) {
                    t = false;
                    a[0].click();
                }
                else{
                    t = true;
                    a[0].click();
                    base.map.center = data.coords[0];
                
                    // add it to the map
                    base.map.panTo(data.coords[0]);
                }
                
                window.setTimeout(function(){
                    location_move = false;
                }, 5000);
            };

            this.getVisibleMarkers = function () {
                let cc = base.map.getContainer(),
                els = cc.getElementsByClassName("mapboxgl-marker mapboxgl-marker-anchor-center");
                for (let index = els.length - 1; index >= 0; index-- ) {
                    els[index].remove();
                }
            };

            this.moveToNorth = function () {
                base.map.panTo(data.north_coords);
                // document.querySelector(".my-custom-controls-mob-north").classList.add("hide");  /* mobile view commented out */
                window.setTimeout(function () {
                    check_for_north = true;
                }, 2000);
            };

            this.setStyle = function (layer){
                base.currentStyleIndex = layer;
                let layerId = data.map_styles[layer];
                base.map.setStyle("mapbox://styles/" + layerId);
            };
        }

        addControl () {
             // //center: [-37.2686, -112.9425], // starting position
            // Add zoom and rotation controls to the map.
            this.mapGeolocate  = new window.mapboxgl.GeolocateControl(
                {
                    positionOptions: {
                        enableHighAccuracy: true
                    },
                    // When active the map will receive updates to the device's location as it changes.
                    trackUserLocation: true,
                    // Draw an arrow next to the location dot to indicate which direction the device is heading.
                    showUserHeading: true
                }
            );
            this.map.addControl(this.mapGeolocate);
                
            document.getElementById("custom-map-zoom-placeholder").appendChild((new window.mapboxgl.NavigationControl({showCompass: false, showZoom: true})).onAdd(this.map));

            document.getElementById("custom-map-compass-placeholder").appendChild((new window.mapboxgl.NavigationControl({showCompass: true, showZoom: false})).onAdd(this.map));

            /* Mobile/tablet compass placeholders - commented out */
            // document.getElementById("custom-map-compass-placeholder-mb").appendChild((new window.mapboxgl.NavigationControl({showCompass: true, showZoom: false})).onAdd(this.map));
            // document.getElementById("custom-map-compass-placeholder-mb-sm").appendChild((new window.mapboxgl.NavigationControl({showCompass: true, showZoom: false})).onAdd(this.map));

            /* Attribution: always expanded so it’s visible (no compact icon only) */
            this.map.addControl(new window.mapboxgl.AttributionControl({
                customAttribution: '<a href="index.html">© Rail Guide</a>',
                compact: false
            }), "bottom-left");

            /*const scale = new mapboxgl.ScaleControl({
            maxWidth: 80,
            unit: 'imperial'
            });
            map.addControl(scale);*/
        }

        removeControl () {}

        addEvents () {
            let base = this;

            function runBottomLayout () {
                if (typeof ensureBottomLeftControlsAboveBar === "function") ensureBottomLeftControlsAboveBar();
                if (typeof positionScaleBar === "function") positionScaleBar();
                if (typeof positionDesktopMapList === "function") positionDesktopMapList();
            }
            this.map.once("load", function () {
                runBottomLayout();
                setTimeout(runBottomLayout, 100);
                setTimeout(runBottomLayout, 400);
                setTimeout(runBottomLayout, 800);
                initSteamTrainTracker(false);
            });
            this.map.on("style.load", function () {
                if (typeof positionScaleBarAfterStyleLoad === "function") positionScaleBarAfterStyleLoad();
                // Re-add tracker layer after style change
                if (typeof initSteamTrainTracker === "function") initSteamTrainTracker(true);
            });

            window.addEventListener("resize", function () {
                base.addSearchBox();
                base.fitContentByDevice(void 0)
            });

            this.map.on("move", function (e) {
                let btn = document.getElementsByClassName("btn-close");
                for ( let index = 0; index < btn.length; index++){
                    btn[index].click();
                }

                window.setTimeout(function(){
                    base.getVisibleMarkers();
                }, 5000);

                btn = document.getElementsByClassName("mapboxgl-ctrl-geocoder--input");
                for ( let index = 0; index < btn.length; index++ ) {
                    btn[index].value = "";
                }

                if ( ! location_move ) {
                    //please change useragent
                    /*base.updateUrlPath();*/
                    
                    // if(data.north_coords[1]>e2[0] && data.north_coords[0]>e2[1]){
                    //   document.querySelector(".my-custom-controls-mob-north").classList.remove("hide");
                    //   check_for_north = false;
                    // }
                    // else if(data.north_coords[1]<=e2[0] && data.north_coords[1]<=e2[1]){
                    //   document.querySelector(".my-custom-controls-mob-north").classList.add("hide");
                    // }
                }

                base.showLatitudeAndLongitudeAndZoomLevel();
            });

            this.mapgeocoder && this.mapgeocoder.on("result", function( response ) {
                base.showLatitudeAndLongitudeAndZoomLevel(response.result.center);
                /*base.updateUrlPath();*/
            });

            this.mapGeolocate && this.mapGeolocate.on("geolocate", function( response ) {
                base.showLatitudeAndLongitudeAndZoomLevel([response.coords.longitude, response.coords.latitude]);
                /*base.updateUrlPath();*/
            });

            this.map.on("zoom", function (response) {
                base.showLatitudeAndLongitudeAndZoomLevel();
                /*base.updateUrlPath();*/
            });

            /* Hover tooltip + pointer cursor; uses per-map HOVER_POPUP_CONFIG */
            var hoverTooltip = document.getElementById("map-hover-tooltip");
            if (hoverTooltip) {
                this.map.on("mousemove", function (e) {
                    var features = base.map.queryRenderedFeatures(e.point);
                    var label = "";
                    var cfg = HOVER_POPUP_CONFIG[base.currentStyleIndex] || {};
                    var useHoverStyles = cfg.hoverFieldStyles && Object.keys(cfg.hoverFieldStyles).length > 0;
                    for (var i = 0; i < features.length; i++) {
                        var p = features[i].properties;
                        if (!p) continue;
                        if (useHoverStyles) {
                            label = buildHoverHtml(p, { hoverFields: cfg.hoverFields, hoverMaxChars: cfg.hoverMaxChars, hoverMaxLines: cfg.hoverMaxLines, hoverFieldStyles: cfg.hoverFieldStyles });
                            if (label && label.replace(/<[^>]+>/g, "").trim()) break;
                        } else {
                            label = buildHoverContent(p, { hoverFields: cfg.hoverFields, hoverMaxChars: cfg.hoverMaxChars, hoverMaxLines: cfg.hoverMaxLines });
                            if (label && String(label).trim()) break;
                        }
                    }
                    if (
                        (useHoverStyles && label && label.replace(/<[^>]+>/g, "").trim()) ||
                        (!useHoverStyles && label && String(label).trim())
                    ) {
                        base.map.getCanvas().style.cursor = "pointer";
                        if (useHoverStyles) {
                            hoverTooltip.innerHTML = label;
                        } else {
                            hoverTooltip.textContent = String(label).trim();
                        }
                        hoverTooltip.classList.add("is-visible");
                        var mapRect = base.map.getContainer().getBoundingClientRect();
                        hoverTooltip.style.left = (mapRect.left + e.point.x + 10) + "px";
                        hoverTooltip.style.top = (mapRect.top + e.point.y + 10) + "px";
                        hoverTooltip.setAttribute("aria-hidden", "false");
                    } else {
                        base.map.getCanvas().style.cursor = "";
                        hoverTooltip.classList.remove("is-visible");
                        hoverTooltip.setAttribute("aria-hidden", "true");
                    }
                });
                this.map.on("mouseleave", function () {
                    base.map.getCanvas().style.cursor = "";
                    hoverTooltip.classList.remove("is-visible");
                    hoverTooltip.setAttribute("aria-hidden", "true");
                });
            }

            /* Click/tap: popup above feature; uses per-map HOVER_POPUP_CONFIG */
            var featurePopup = null;
            this.map.on("click", function (e) {
                var features = base.map.queryRenderedFeatures(e.point);
                var label = "";
                var feature = null;
                for (var i = 0; i < features.length; i++) {
                    var p = features[i].properties;
                    if (!p) continue;
                    label = p.rr_full || p.classic_full || p.rg_name || p.sub_title || p.rg_desc || "";
                    if (label && String(label).trim()) {
                        feature = features[i];
                        break;
                    }
                }
                if (feature && label && String(label).trim()) {
                    if (featurePopup) featurePopup.remove();
                    var cfg = HOVER_POPUP_CONFIG[base.currentStyleIndex] || {};
                    var popupBody = buildPopupHtml(feature.properties, {
                        fieldKeys: cfg.popupFields,
                        maxCharsPerField: cfg.popupMaxCharsPerField,
                        popupFieldStyles: cfg.popupFieldStyles,
                        linkDisplayText: cfg.linkDisplayText
                    });
                    if (!popupBody) popupBody = escapeHtml(String(label).trim());
                    featurePopup = new window.mapboxgl.Popup({
                        closeButton: true,
                        closeOnClick: true,
                        offset: 12,
                        maxWidth: "none"
                    })
                        .setLngLat(e.lngLat)
                        .setHTML("<div class=\"map-feature-popup-content\">" + popupBody + "</div>")
                        .addTo(base.map);
                    featurePopup.on("close", function () {
                        featurePopup = null;
                    });
                    /* Step 12: pan map if popup would be cut off at top (like Railview) */
                    (function checkPopupPosition () {
                        var popupEl = featurePopup && featurePopup.getElement && featurePopup.getElement();
                        if (!popupEl) {
                            window.setTimeout(checkPopupPosition, 50);
                            return;
                        }
                        var rect = popupEl.getBoundingClientRect();
                        var minTop = 55;
                        if (rect.top < minTop) {
                            base.map.panBy([0, rect.top - minTop], { duration: 200 });
                        }
                    })();
                }
            });
        }

        removeEvents () {}

        /*updateUrlPath () {
            let e2 = [this.map.getCenter().lng, this.map.getCenter().lat],
            z = this.map.getZoom();
            
            if ( window.history.pushState ) {
                let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + "#" + Math.round(z * 100) / 100 + "/" + Number(e2[0]).toFixed(3) + "/" + Number(e2[1]).toFixed(3);
                window.history.pushState({
                    path: newurl
                }, "" ,newurl);
            }
        }*/

        addSearchBox () {
            /* Mobile view commented out - always use desktop search bar */
            // if ( document.body.clientWidth <= 915 ) {
            //     document.getElementById("dtmob").innerHTML = "";
            //     document.getElementById("dt").innerHTML = "";
            //     document.getElementById("dtmob").appendChild(this.mapgeocoder.onAdd(this.map));
            // }
            // else if ( document.body.clientWidth > 915 ) {
            document.getElementById("dt").innerHTML = "";
            document.getElementById("dt").appendChild(this.mapgeocoder.onAdd(this.map));
            // }
        }

        fitContentByDevice ( checkTabletView ) {
            return;
            let mWidth = $(document).width(),
            mHeight = $(document).height();
          
            if( mWidth <= 568 && mWidth >= 429 && mHeight <= 400 ) {
                document.body.classList.add("mobile_landscape");
            }
            
            else if( checkTabletView && mWidth >= 768 && mWidth <= 834 && mHeight >= 935 && mHeight <= 1280 ) {
                document.body.classList.add("tablet_portrait");
            }

            else if ( mWidth <= 915 && mHeight <= 400 ) {
                document.body.classList.add("mobile_landscape");
            }
            
            else {
                document.body.classList = [];
            }

            /*let a = document.getElementsByClassName("main-ctrl")[0],
            mWidthbtn2 = $(a).width(),
            marginSet = document.getElementsByClassName("my-custom-controls")[0],
            mWidthbtn3 = $(marginSet).width(),
            mWidthFinal = (mWidthbtn2 - mWidthbtn3) / 2;

            console.log(mWidthFinal, mWidthbtn2);
            
            $(marginSet).css({
                "margin": "0px " + mWidthFinal+"px"
            });*/
        }

        showLatitudeAndLongitudeAndZoomLevel ( center ) {
            void 0 === center && ( center =  [ this.map.getCenter().lng, this.map.getCenter().lat ]);
            let showCoordinatesDisplay = document.querySelector("#show-latitude-and-longitude #show-coordinates-display"),
            showZoomLevelLabelElement = document.querySelector("#show-latitude-and-longitude #show-zoom-level-label");
            if (showCoordinatesDisplay) {
                var c = this.map.getCenter();
                showCoordinatesDisplay.textContent = Number(c.lat).toFixed(3) + ", " + Number(c.lng).toFixed(3);
            }
            null === showZoomLevelLabelElement || ( showZoomLevelLabelElement.innerHTML = " z" + (Math.round(this.map.getZoom() * 100) / 100) );
        };

    } 

    var STEAM_DEFAULT_ZOOM = 11.52;   // Default zoom for steam train tracking - change this value to adjust
    var STEAM_DEFAULT_CENTER = [-75.6717, 41.4085]; // Default center for steam train tracking - change this value to adjust
    let selectedPreConfigData = 1 === window.location.href.split("#").length ? { styleNumber: 0, zoomLevel: STEAM_DEFAULT_ZOOM, center: STEAM_DEFAULT_CENTER } : {
            styleNumber: 0,
            zoomLevel: data.zoom,
            center: data.coords[0]
        },
    currentActiveMap = new handleMapPrcoessCreation( selectedPreConfigData );

    /* Copy coordinates button: custom tooltip (instant), copy lat, long, show "Coordinates copied" */
    (function setupCopyCoordinates () {
        var btn = document.getElementById("copy-coordinates-btn");
        var bubble = document.getElementById("coordinates-copied-bubble");
        var tooltip = document.getElementById("copy-coordinates-tooltip");
        if (!btn || !bubble) return;
        if (tooltip) {
            btn.addEventListener("mouseenter", function () {
                var r = btn.getBoundingClientRect();
                tooltip.style.left = (r.left + r.width / 2) + "px";
                tooltip.style.top = (r.top - 4) + "px";
                tooltip.style.visibility = "visible";
                tooltip.style.opacity = "1";
                tooltip.classList.add("is-visible");
                tooltip.setAttribute("aria-hidden", "false");
            });
            btn.addEventListener("mouseleave", function () {
                tooltip.style.visibility = "";
                tooltip.style.opacity = "";
                tooltip.classList.remove("is-visible");
                tooltip.setAttribute("aria-hidden", "true");
            });
        }
        btn.addEventListener("click", function () {
            if (tooltip) {
                tooltip.style.visibility = "";
                tooltip.style.opacity = "";
                tooltip.classList.remove("is-visible");
                tooltip.setAttribute("aria-hidden", "true");
            }
            var center = currentActiveMap.map.getCenter();
            var lat = Number(center.lat).toFixed(3);
            var lng = Number(center.lng).toFixed(3);
            var text = lat + "," + lng;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    bubble.classList.add("is-visible");
                    window.clearTimeout(window._copyBubbleTimeout);
                    window._copyBubbleTimeout = window.setTimeout(function () {
                        bubble.classList.remove("is-visible");
                    }, 1200);
                });
            } else {
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand("copy");
                    bubble.classList.add("is-visible");
                    window.clearTimeout(window._copyBubbleTimeout);
                    window._copyBubbleTimeout = window.setTimeout(function () {
                        bubble.classList.remove("is-visible");
                    }, 1200);
                } catch (e) {}
                document.body.removeChild(ta);
            }
        });
    })();

    function updateDesktopHighlightedMapMenu ( styleNumber ) {
        if ( void 0 === styleNumber )
            return;

        let elements = document.querySelectorAll("#ul li");
        null === elements || elements.forEach(function ( element ) {
            let styleId = element.getAttribute("style-id");
            styleNumber == styleId ? element.classList.add("liactive") : element.classList.remove("liactive")
        });
    }

    /* Mobile map menu - commented out */
    // function updateMobileHighlightedMapMenu ( styleNumber ) {
    //     if ( void 0 === styleNumber )
    //         return;
    //     let elements = document.querySelectorAll("#ul2 li");
    //     null === elements || elements.forEach(function ( element ) {
    //         let styleId = element.getAttribute("style-id");
    //         styleNumber == styleId ? element.classList.add("liactive") : element.classList.remove("liactive")
    //     });
    // }

    
    function onUpdateDesktopHighlightedMapMenu () {
        updateDesktopHighlightedMapMenu(selectedPreConfigData.styleNumber);
    }

    window.addEventListener("DOMContentLoaded", onUpdateDesktopHighlightedMapMenu);
    window.addEventListener("load", onUpdateDesktopHighlightedMapMenu);
    onUpdateDesktopHighlightedMapMenu();

    // function onUpdateMobileHighlightedMapMenu () {
    //     updateMobileHighlightedMapMenu(selectedPreConfigData.styleNumber);
    // }
    // window.addEventListener("DOMContentLoaded", onUpdateMobileHighlightedMapMenu);
    // window.addEventListener("load", onUpdateMobileHighlightedMapMenu);
    // onUpdateMobileHighlightedMapMenu();

    // class MyCustomControl {
    //   onAdd(map){
    //     this.map = map;
    //     this.container = document.getElementsByClassName('mapboxgl-ctrl-bottom-left')[0];
    //     var child = document.createElement("div");
    //     child.className = 'my-custom-control';
    //     child.id = 'guide';
    //     child.textContent = 'My custom control';
    //     this.container.appendChild(child);
    //     return this.container;
    //   }
    //   onRemove(){
    //     this.container.parentNode.removeChild(this.container);
    //     this.map = undefined;
    //   }
    // }
    //const myCustomControl = new MyCustomControl();

    //map.addControl(myCustomControl);
    //const layerList = document.getElementById('menu');
    //const inputs = layerList.getElementsByTagName('input');
     
    // for (const input of inputs) {
    // input.onclick = (layer) => {
    // const layerId = layer.target.id;
    // map.setStyle('mapbox://styles/mapbox/' + layerId);
    // };
    // }
    function mapUl(id){
      //
      if(openul){
        $(id).css({"display":"block"});
        openul = false;
      }
      else if(!openul){
        $(id).css({"display":"none"});
        openul = true;
      }
    }

    function mapUl2(id){
      //
      if(openul2){
        $(id).css({"display":"block"});
        openul2 = false;
      }
      else if(!openul2){
        $(id).css({"display":"none"});
        openul2 = true;
      }
    }


    $(document).ready(function (){
        $("#ul li").on("click", function(e){
            $(".liactive").each(function( index ) {
                this.classList.remove("liactive");
            });
            this.classList.add("liactive");
        });

        /* Mobile ul2 - commented out */
        // $("#ul2 li").on("click", function(e){
        //     $(".liactive").each(function( index ) {
        //         this.classList.remove("liactive");
        //     });
        //     this.classList.add("liactive");
        // });

        $(document).on("click", function(e){
            let target = $(e.target)[0],
            target2 = $(target).parent()[0],
            target3 = $(target2).parent()[0],
            id = $(target).attr("id") || $(target2).attr("id") || $(target3).attr("id");
            
            if(id == "map2"){
                return true;
            }
            
            openul = true;
            openul2 = true;

            $("#ul").css({"display": "none"});
            // $("#ul2").css({"display": "none"});  /* mobile commented out */
        });
    });


    function getSearch(v){
      //
        let searchUL = document.getElementById("searchul2");
        searchUL.innerHTML = "";
        if ( search_opt[v.value] != undefined ) {
            for(let index = 0; index < search_opt[v.value].length; index++ ){
                let li = document.createElement("li");
                li.value = search_opt[v.value][index];
                li.innerText = search_opt[v.value][index];
                searchUL.appendChild(li);
            }
        }
        
        else {
            //fetch limit 6
            window.fetch("https://api.mapbox.com/search/v1/suggest/" + v.value + "?language=en&limit=8&session_token=[GENERATED-UUID]&country=[CA,US]&access_token=" +  window.mapboxgl.accessToken).then( function ( response ) {
                console.log(response);

                search_opt[v.value] = [];
                for( let index = 0; index < search_opt[v.value].length; index++ ){
                    let li = document.createElement("li");
                    li.value = search_opt[v.value][index];
                    li.innerText = search_opt[v.value][index];
                    searchUL.appendChild(li);
                }
            });
        }
    }

    function hideUl(){
        //
        let searchUL = document.getElementById("searchul");
        searchUL.innerHTML = "";
        
        searchUL = document.getElementById("searchul2");
        searchUL.innerHTML = "";
    }

    //Position Maps list: sit just above the Maps button
    function positionDesktopMapList (argument) {
        try {

            let containerList = document.getElementById("ul"),
            positionTarget = document.querySelector(".my-custom-controls #map2 button"),
            positionTargetRect = positionTarget.getBoundingClientRect(),
            bodyRect = document.body.getBoundingClientRect(),
            leftOfBodyTarget = positionTargetRect.left < bodyRect.left ? bodyRect.left - positionTargetRect.left : positionTargetRect.left - bodyRect.left,
            containerListMaxNumber = 0 < window.innerHeight - 32 * containerList.children.length - 30 - 90 ? containerList.children.length : Math.round( (window.innerHeight - 30 - 90) / 32 ) ;

            containerListMaxNumber = containerList.children.length < containerListMaxNumber ? containerList.children.length : containerListMaxNumber;

            containerList.style.position = "fixed";
            containerList.style.top = "auto";
            containerList.style.bottom = (window.innerHeight - positionTargetRect.top + 4) + "px";
            containerList.style.left = ( leftOfBodyTarget - ( ( positionTargetRect.width - 13 ) / 2 ) ) + "px";
            containerList.style.marginBottom = "0px";
            containerList.style.height = "auto";
            containerList.style.maxHeight = "calc( 32px * " + containerListMaxNumber + " + 2px )";
            containerList.style.overflow = "auto";
            containerList.style.right = "auto";
        } catch( error ) {
            console.log(error);
        }
    }

    window.addEventListener("load", positionDesktopMapList);
    window.addEventListener("resize", positionDesktopMapList);
    window.addEventListener("DOMContentLoaded", positionDesktopMapList);

    //Position Maps list (mobile) - commented out; mobile view disabled
    /*
    function positionMobileMapList () {
        try {

            let containerList = document.getElementById("ul2"),
            positionTarget = document.querySelector(".my-custom-controls-mob #map2 button"),
            myCustomControls = document.querySelector(".my-custom-controls-mob"),
            leftPosition = positionTarget.getBoundingClientRect().left,
            containerListMaxNumber = 0 < window.innerHeight - 32 * containerList.children.length - 15 - 45 ? containerList.children.length : Math.round( (window.innerHeight - 15 - 45) / 32 ) ;

            containerListMaxNumber = containerList.children.length < containerListMaxNumber ? containerList.children.length : containerListMaxNumber;

            if ( 0 > window.innerHeight - containerListMaxNumber * 32 - 45 - 35 )
                containerListMaxNumber -= 2 < containerListMaxNumber ? 2 : 1;

            containerList.style.position = "fixed";
            containerList.style.top = "auto";
            containerList.style.bottom = 0 < leftPosition ? "calc( " + getComputedStyle(myCustomControls).getPropertyValue("bottom") + " + " + getComputedStyle(myCustomControls).getPropertyValue("height") + " + 5px )" : positionTarget.getBoundingClientRect().bottom + "px";
            containerList.style.left =  ( 0 < leftPosition ? leftPosition : ( myCustomControls.getBoundingClientRect().width ) ) + "px";
            containerList.style.right = "auto";
            containerList.style.height = "100%";
            containerList.style.maxHeight = "calc( 32px * " + containerListMaxNumber + " + 2px )";
            containerList.style.overflow = "auto";
            containerList.style.marginBottom = "0px";

        } catch( error ) {
            console.log(error);
        }
    }

    window.addEventListener("load", positionMobileMapList);
    window.addEventListener("resize", positionMobileMapList);
    window.addEventListener("DOMContentLoaded", positionMobileMapList);
    */

    // Initialize deferredPrompt for use later to show browser install prompt.
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", function (event) {
        // Prevent the mini-infobar from appearing on mobile
        event.preventDefault();
        
        // Stash the event so it can be triggered later.
        deferredPrompt = event;
    });

    window.addEventListener("appinstalled", function () {
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
    });

    function requestPWAInstallationPrompt () {
        if ( void 0 === deferredPrompt )
            return void 0;

        // Show the install prompt
        deferredPrompt.prompt();

        deferredPrompt.userChoice.then(function ( response ) {
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
        });
    }

    //Center topbar Ads
    function centerTopbarAds ( event ) {
        let topAds = document.getElementById("add-top"),
        leftAds = document.getElementById("add-left"),
        width,
        fullBelly;
        null === topAds || ( fullBelly = document.body.clientWidth,
            topAds.style.width = "none" === getComputedStyle(leftAds).getPropertyValue("display") ? fullBelly + "px" : "calc(" + fullBelly + "px - " + getComputedStyle(leftAds).getPropertyValue("width") + " * 2 )",
            width = topAds.getBoundingClientRect().width,
            topAds.style.left = ( (fullBelly - width) / 2 ) + "px",
            topAds.style.right = "auto"
         );
    }

    window.addEventListener("resize", centerTopbarAds);
    window.addEventListener("load", centerTopbarAds);
    window.addEventListener("DOMContentLoaded", centerTopbarAds);

    /**
     * Mapbox attribution lives inside #map (z-index 0). The fixed bottom bar (.main-ctrl, z-index 100)
     * paints above the entire map layer, so attribution is hidden on iPad/Safari. Move the bottom-left
     * control group to document.body and fix z-index so attribution + scale stay visible above the bar.
     */
    function ensureBottomLeftControlsAboveBar () {
        var bl = document.querySelector(".mapboxgl-ctrl-bottom-left");
        if (!bl) return;
        if (bl.parentNode !== document.body) {
            document.body.appendChild(bl);
        }
        bl.style.position = "fixed";
        bl.style.zIndex = "110";
        bl.style.pointerEvents = "auto";
    }

    // Compact attribution: collapse to icon on narrow screens, expand on wide
    var COMPACT_BREAKPOINT = 640;

    // Custom compact attribution: hide text behind an info button on narrow screens
    (function setupCompactAttribution() {
        function init() {
            var attrib = document.querySelector(".mapboxgl-ctrl-attrib");
            if (!attrib) { setTimeout(init, 100); return; }

            // Create info button
            var btn = document.createElement("button");
            btn.className = "rg-attrib-btn";
            btn.setAttribute("aria-label", "Attribution");
            btn.innerHTML = "ⓘ"; // circled i
            attrib.insertBefore(btn, attrib.firstChild);

            // Create a close button inside attrib for narrow mode
            var closeBtn = document.createElement("button");
            closeBtn.className = "rg-attrib-close";
            closeBtn.setAttribute("aria-label", "Close attribution");
            closeBtn.innerHTML = "×";
            attrib.appendChild(closeBtn);

            var links = attrib.querySelector(".mapboxgl-ctrl-attrib-inner");

            function updateLayout() {
                if (window.innerWidth < COMPACT_BREAKPOINT) {
                    attrib.classList.add("rg-attrib-compact");
                    attrib.classList.remove("rg-attrib-open");
                } else {
                    attrib.classList.remove("rg-attrib-compact");
                    attrib.classList.remove("rg-attrib-open");
                }
            }

            btn.addEventListener("click", function(e) {
                e.stopPropagation();
                attrib.classList.toggle("rg-attrib-open");
            });

            closeBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                attrib.classList.remove("rg-attrib-open");
            });

            document.addEventListener("click", function(e) {
                if (!attrib.contains(e.target)) {
                    attrib.classList.remove("rg-attrib-open");
                }
            });

            window.addEventListener("resize", updateLayout);
            updateLayout();
        }
        setTimeout(init, 400);
    })();

    function positionScaleBar () {
        var scale = document.getElementById("rg-dual-scale");
        var bottomLeft = document.querySelector(".mapboxgl-ctrl-bottom-left");
        var coords = document.getElementById("show-latitude-and-longitude");

        if (!scale || !bottomLeft) return;

        var bottom = getComputedStyle(bottomLeft).getPropertyValue("bottom");
        scale.style.position = "fixed";
        scale.style.top = "auto";
        scale.style.bottom = bottom;
        scale.style.right = "auto";
        scale.style.marginRight = "0";

        // Place scale bar to the right of the coordinates bar
        var leftEdge = window.innerWidth / 2; // fallback: center of page
        if (coords) {
            var cr = coords.getBoundingClientRect();
            if (cr.right > 0) leftEdge = cr.right;
        }
        scale.style.left = (leftEdge + 12) + "px";
    }

    function positionScaleBarAfterStyleLoad () {
        ensureBottomLeftControlsAboveBar();
        positionScaleBar();
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 80);
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 250);
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 700);
    }

    function runPositionScaleBarWhenReady () {
        ensureBottomLeftControlsAboveBar();
        positionScaleBar();
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                ensureBottomLeftControlsAboveBar();
                positionScaleBar();
            });
        });
    }

    window.addEventListener("resize", function () {
        ensureBottomLeftControlsAboveBar();
        positionScaleBar();
    });
    window.addEventListener("load", function () {
        runPositionScaleBarWhenReady();
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 150);
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 500);
        setTimeout(function () {
            ensureBottomLeftControlsAboveBar();
            positionScaleBar();
        }, 1200);
    });
    window.addEventListener("DOMContentLoaded", function () {
        runPositionScaleBarWhenReady();
    });





    function positionDesktopSuggestionsBox () {
        let suggestions = document.querySelector("#dt .mapboxgl-ctrl-geocoder .suggestions"),
        searchBox = document.querySelector(".my-custom-controls #search");

        if ( null === suggestions || null === searchBox )
            return void 0;

        suggestions.style.top = "auto";
        suggestions.style.bottom = ( searchBox.getBoundingClientRect().height + 8 ) + "px";
        suggestions.classList.add("remove-default");
    }

    window.addEventListener("resize", positionDesktopSuggestionsBox);
    window.addEventListener("load", positionDesktopSuggestionsBox);
    window.addEventListener("DOMContentLoaded", positionDesktopSuggestionsBox);


    // ── UP Steam Train Tracker ───────────────────────────────────────────────
    // Polls Union Pacific's position API every 5 seconds and shows a colored
    // circle on the map. Handles style changes by re-adding the layer.

    var _steamTrainInterval = null;

    function initSteamTrainTracker(isStyleReload) {
        var map = window._rgSteamMap;
        if (!map) return;

        var SOURCE_ID = "steam-train-source";
        var LAYER_ID  = "steam-train-layer";

        // Add source if not present
        if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: []
                }
            });
        }

        // Load shield image and add symbol layer
        var IMAGE_ID = "steam-train-shield";
        function addShieldLayer() {
            if (!map.getLayer(LAYER_ID)) {
                map.addLayer({
                    id: LAYER_ID,
                    type: "symbol",
                    source: SOURCE_ID,
                    layout: {
                        "icon-image": IMAGE_ID,
                        "icon-size": 0.2,
                        "icon-allow-overlap": true,
                        "icon-ignore-placement": true
                    }
                });
            }
        }
        if (!map.hasImage(IMAGE_ID)) {
            map.loadImage("4014_shield_yellow.webp", function(err, img) {
                if (!err && img) {
                    if (!map.hasImage(IMAGE_ID)) map.addImage(IMAGE_ID, img);
                    addShieldLayer();
                }
            });
        } else {
            addShieldLayer();
        }

        // Add info label panel if not already present
        if (!document.getElementById("steam-train-info")) {
            var infoEl = document.createElement("div");
            infoEl.id = "steam-train-info";
            infoEl.style.cssText = [
                "position:absolute",
                "z-index:10",
                "background:rgba(0,0,0,0.65)",
                "color:#fff",
                "font-size:13px",
                "line-height:1.5",
                "padding:6px 10px",
                "border-radius:6px",
                "pointer-events:auto",
                "white-space:nowrap",
                "transform:translate(-50%, calc(-100% - 16px))",
                "display:none"
            ].join(";");
            map.getContainer().appendChild(infoEl);
        }

        // Start polling if not already running
        if (!isStyleReload) {
            if (_steamTrainInterval) clearInterval(_steamTrainInterval);
            fetchSteamTrainPosition();
            _steamTrainInterval = setInterval(fetchSteamTrainPosition, 60000);
        }
    }

    function formatSteamTrainTime(isoString) {
        // API returns time in US Central time (America/Chicago), convert to user's local timezone
        if (!isoString) return { time: "", date: "", tz: "" };

        // Find the UTC equivalent by asking the browser what Chicago's offset is at this moment.
        // We treat the ISO string as Chicago local time, then back-calculate UTC.
        var naive = new Date(isoString + "Z"); // parse as UTC first (wrong clock, right structure)
        var chicagoStr = naive.toLocaleString("en-US", {
            timeZone: "America/Chicago",
            hour12: false,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
        // chicagoStr is like "06/05/2026, 12:16:42"
        var p = chicagoStr.match(/(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+):(\d+)/);
        var chicagoHour = p ? parseInt(p[4], 10) : 0;
        var apiHour = parseInt(isoString.substr(11, 2), 10);
        // Offset difference tells us how far off our naive parse was
        var diffHours = apiHour - chicagoHour;
        var utcMs = naive.getTime() + diffHours * 3600000;
        var localDate = new Date(utcMs);

        // Format time in user's local timezone
        var timeStr = localDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        // Get timezone abbreviation (e.g. "PDT", "EDT", "MDT")
        var tzAbbr = localDate.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop();

        // Format date in user's local timezone
        var monthNames = ["Jan.","Feb.","March","April","May","June","July","Aug.","Sep.","Oct.","Nov.","Dec."];
        var localMonth = localDate.getMonth() + 1;
        var localDay   = localDate.getDate();
        var localYear  = localDate.getFullYear();
        var suffix = (localDay === 1 || localDay === 21 || localDay === 31) ? "st" :
                     (localDay === 2 || localDay === 22) ? "nd" :
                     (localDay === 3 || localDay === 23) ? "rd" : "th";
        var dateStr = monthNames[localMonth - 1] + " " + localDay + suffix + ", " + localYear;

        return { time: timeStr, date: dateStr, tz: tzAbbr };
    }

    // 9:00 AM EDT on July 1, 2026 = 13:00 UTC
    var TRACKING_START_UTC = Date.UTC(2026, 6, 1, 13, 0, 0);

    function fetchSteamTrainPosition() {
        var map = window._rgSteamMap;
        if (!map) return;

        // Before tracking starts, show static message and fixed location
        if (Date.now() < TRACKING_START_UTC) {
            var FIXED_COORDS = STEAM_DEFAULT_CENTER;

            // Put the shield icon at the fixed location
            var fixedSource = map.getSource("steam-train-source");
            if (fixedSource) {
                fixedSource.setData({
                    type: "FeatureCollection",
                    features: [{
                        type: "Feature",
                        geometry: { type: "Point", coordinates: FIXED_COORDS },
                        properties: {}
                    }]
                });
            }

            // Position info box and keep it tracking map moves
            var infoEl = document.getElementById("steam-train-info");
            if (infoEl) {
                infoEl.innerHTML =
                    "<strong>UP 4014</strong><br>" +
                    "<a href='https://www.up.com/about-us/history/steam/schedule' target='_blank' style='color:#fff;text-decoration:underline;'>Schedule</a><br>" +
                    "Next update: July 1, 2026";
                var startPt = map.project(FIXED_COORDS);
                infoEl.style.left = startPt.x + "px";
                infoEl.style.top  = startPt.y + "px";
                infoEl.style.display = "block";

                // Keep label synced when map moves/zooms
                if (!map._steamInfoMoveHandler) {
                    map._steamInfoMoveHandler = function() {
                        var p = map.project(FIXED_COORDS);
                        infoEl.style.left = p.x + "px";
                        infoEl.style.top  = p.y + "px";

                    };
                    map.on("move", map._steamInfoMoveHandler);
                }
            }

            // Hide loader since we're intentionally not fetching yet
            var loader = document.getElementById("tracking-loader");
            if (loader) loader.style.display = "none";
            return;
        }

        var proxyUrl = "https://throbbing-silence-c4a4.railguidemaps.workers.dev/";

        function attemptFetch(retriesLeft) {
            fetch(proxyUrl)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.latitude || !data.longitude) return;
                    var source = map.getSource("steam-train-source");
                    if (!source) return;
                    source.setData({
                        type: "FeatureCollection",
                        features: [{
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [data.longitude, data.latitude]
                            },
                            properties: {
                                speed: data.speed,
                                time: data.time,
                                elevation: data.elevation
                            }
                        }]
                    });

                    // Update info label content and position over the dot
                    var infoEl = document.getElementById("steam-train-info");
                    if (infoEl) {
                        var speedMph = Math.round(data.speed);
                        var timeParts = formatSteamTrainTime(data.time);
                        var timeStr  = timeParts.time;
                        var dateStr  = timeParts.date;
                        var newHtml  =
                            "<strong>UP 4014</strong><br>" +
                            "<a href='https://www.up.com/about-us/history/steam/schedule' target='_blank' style='color:#fff;text-decoration:underline;'>Schedule</a><br>" +
                            "Speed: " + speedMph + " mph<br>" +
                            "Last update: " + timeStr + " " + timeParts.tz + "<br>" +
                            "on " + dateStr;

                        // Center map on first load or whenever the time string changes
                        var prevTime = infoEl.getAttribute("data-last-time");
                        if (!prevTime || prevTime !== timeStr) {
                            var flyToOptions = { center: [data.longitude, data.latitude] };
                            if (map.getZoom() < STEAM_DEFAULT_ZOOM) { flyToOptions.zoom = STEAM_DEFAULT_ZOOM; }
                            map.flyTo(flyToOptions);
                            infoEl.setAttribute("data-last-time", timeStr);
                        }

                        infoEl.innerHTML = newHtml;

                        // Position the panel over the dot on the map
                        var pt = map.project([data.longitude, data.latitude]);
                        infoEl.style.left = pt.x + "px";
                        infoEl.style.top  = pt.y + "px";
                        infoEl.style.display = "block";

                        // Keep label in sync when map moves/zooms
                        if (!map._steamInfoMoveHandler) {
                            map._steamInfoMoveHandler = function() {
                                var src = map.getSource("steam-train-source");
                                if (!src) return;
                                var gj = src._data;
                                if (!gj || !gj.features || !gj.features[0]) return;
                                var coords = gj.features[0].geometry.coordinates;
                                var p = map.project(coords);
                                infoEl.style.left = p.x + "px";
                                infoEl.style.top  = p.y + "px";
                            };
                            map.on("move", map._steamInfoMoveHandler);
                        }
                    }
                })
                .catch(function(err) {
                    if (retriesLeft > 0) {
                        setTimeout(function() { attemptFetch(retriesLeft - 1); }, 3000);
                    } else {
                        console.warn("Steam train position fetch failed:", err);
                    }
                });
        }

        attemptFetch(2); // up to 3 attempts total
    }

    // ── Mediavine adhesion ad offset ─────────────────────────────────────────
    // Detects #adhesion_desktop_wrapper height and sets --ad-bottom on :root
    // so bottom-positioned controls shift up above the banner automatically.
    (function setupAdOffset() {
        function applyAdOffset() {
            var el = document.getElementById("adhesion_desktop_wrapper");
            var h = 0;
            if (el) {
                var rect = el.getBoundingClientRect();
                if (rect.height > 0 && rect.bottom > 0) {
                    h = rect.height;
                }
            }
            document.documentElement.style.setProperty("--ad-bottom", h + "px");
        }

        // Poll at increasing intervals since Mediavine loads asynchronously
        [500, 1000, 2000, 3000, 5000, 8000, 12000].forEach(function(ms) {
            setTimeout(function() {
                applyAdOffset();
                // Reposition map list menu after ad shifts buttons up
                if (typeof positionDesktopMapList === "function") positionDesktopMapList();
            }, ms);
        });

        window.addEventListener("resize", applyAdOffset);
        window.addEventListener("scroll", applyAdOffset);
    })();

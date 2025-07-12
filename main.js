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

    window.mapboxgl.accessToken = "pk.eyJ1IjoibTcyOSIsImEiOiJjbDVxYW5sY2ExdmJvM2tsdjV4aDh2dmlsIn0.GchUU72Y5qS9UIITZSjnzA";

    class handleMapPrcoessCreation {
        constructor ( options ) {
            void 0 === options && ( options = {} );
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

            this.mapgeocoder = new window.MapboxGeocoder({
                accessToken: window.mapboxgl.accessToken,
                localGeocoder: coordinatesGeocoder,
                mapboxgl: window.mapboxgl,
                limit: 8,
                // rg fix
                placeholder: "Search/Coordinates"
                // rg fix end
            });

            this.mapScale = new mapboxgl.ScaleControl({
                maxWidth: 80,
                unit: "imperial"
            });
            
            this.map.addControl(this.mapScale);

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
                document.querySelector(".my-custom-controls-mob-north").classList.add("hide");
                window.setTimeout(function () {
                    check_for_north = true;
                }, 2000);
            };

            this.setStyle = function (layer){
                //open listview and send id
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

            document.getElementById("custom-map-compass-placeholder-mb").appendChild((new window.mapboxgl.NavigationControl({showCompass: true, showZoom: false})).onAdd(this.map));

            document.getElementById("custom-map-compass-placeholder-mb-sm").appendChild((new window.mapboxgl.NavigationControl({showCompass: true, showZoom: false})).onAdd(this.map));

            this.map.addControl(new window.mapboxgl.AttributionControl(), "bottom-left");

            /*const scale = new mapboxgl.ScaleControl({
            maxWidth: 80,
            unit: 'imperial'
            });
            map.addControl(scale);*/
        }

        removeControl () {}

        addEvents () {
            let base = this;

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
            if ( document.body.clientWidth <= 915 ) {
                document.getElementById("dtmob").innerHTML = "";
                document.getElementById("dt").innerHTML = "";
                document.getElementById("dtmob").appendChild(this.mapgeocoder.onAdd(this.map));
                //var parenNode = $(".mapboxgl-ctrl-attrib");
                //$(".mapboxgl-ctrl-attrib").insertAfter($(parenNode).next());
            }

            else if ( document.body.clientWidth > 915 ) {
                document.getElementById("dtmob").innerHTML = "";
                document.getElementById("dt").innerHTML = "";
                document.getElementById("dt").appendChild(this.mapgeocoder.onAdd(this.map));
            }
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

        showLatitudeAndLongitudeAndZoomLevel(center) {
      void 0 === center && (center = [this.map.getCenter().lng, this.map.getCenter().lat]);
      // Desktop
      let showLongitudeLabelElement = document.querySelector("#show-latitude-and-longitude #show-longitude-label"),
          showLatitudeLabelElement = document.querySelector("#show-latitude-and-longitude #show-latitude-label"),
          showZoomLevelLabelElement = document.querySelector("#show-latitude-and-longitude #show-zoom-level-label");

      if (showLongitudeLabelElement)
          showLongitudeLabelElement.innerHTML = Array.isArray(center) ? " " + Number(center[0]).toFixed(3) + " " : "";
      if (showLatitudeLabelElement)
          showLatitudeLabelElement.innerHTML = Array.isArray(center) ? " " + Number(center[1]).toFixed(3) + " " : "";
      if (showZoomLevelLabelElement)
          showZoomLevelLabelElement.innerHTML = " z" + (Math.round(this.map.getZoom() * 100) / 100);

      // Mobile
      if (document.body.clientWidth <= 915) {
          let showLongitudeLabelMob = document.querySelector("#show-latitude-and-longitude-mob #show-longitude-label-mob"),
              showLatitudeLabelMob = document.querySelector("#show-latitude-and-longitude-mob #show-latitude-label-mob"),
              showZoomLevelLabelMob = document.querySelector("#show-latitude-and-longitude-mob #show-zoom-level-label-mob");

          if (showLongitudeLabelMob)
              showLongitudeLabelMob.innerHTML = Array.isArray(center) ? " " + Number(center[0]).toFixed(3) + " " : "";
          if (showLatitudeLabelMob)
              showLatitudeLabelMob.innerHTML = Array.isArray(center) ? " " + Number(center[1]).toFixed(3) + " " : "";
          if (showZoomLevelLabelMob)
              showZoomLevelLabelMob.innerHTML = " z" + (Math.round(this.map.getZoom() * 100) / 100);
      }
  }

    let selectedPreConfigData = 1 === window.location.href.split("#").length ? getRandomValueFromArray(preInitDataConfig) : {
            styleNumber: 0,
            zoomLevel: data.zoom,
            center: data.coords[0]
        },
    currentActiveMap = new handleMapPrcoessCreation( selectedPreConfigData );

    function updateDesktopHighlightedMapMenu ( styleNumber ) {
        if ( void 0 === styleNumber )
            return;

        let elements = document.querySelectorAll("#ul li");
        null === elements || elements.forEach(function ( element ) {
            let styleId = element.getAttribute("style-id");
            styleNumber == styleId ? element.classList.add("liactive") : element.classList.remove("liactive")
        });
    }

    function updateMobileHighlightedMapMenu ( styleNumber ) {
        if ( void 0 === styleNumber )
            return;

        let elements = document.querySelectorAll("#ul2 li");
        null === elements || elements.forEach(function ( element ) {
            let styleId = element.getAttribute("style-id");
            styleNumber == styleId ? element.classList.add("liactive") : element.classList.remove("liactive")
        });
    }

    
    function onUpdateDesktopHighlightedMapMenu () {
        updateDesktopHighlightedMapMenu(selectedPreConfigData.styleNumber);
    }

    window.addEventListener("DOMContentLoaded", onUpdateDesktopHighlightedMapMenu);
    window.addEventListener("load", onUpdateDesktopHighlightedMapMenu);
    onUpdateDesktopHighlightedMapMenu();

    function onUpdateMobileHighlightedMapMenu () {
        updateMobileHighlightedMapMenu(selectedPreConfigData.styleNumber);
    }

    window.addEventListener("DOMContentLoaded", onUpdateMobileHighlightedMapMenu);
    window.addEventListener("load", onUpdateMobileHighlightedMapMenu);
    onUpdateMobileHighlightedMapMenu();

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

        $("#ul2 li").on("click", function(e){
            $(".liactive").each(function( index ) {
                this.classList.remove("liactive");
            });
            this.classList.add("liactive");
        });

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
            $("#ul2").css({"display": "none"});
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

    //Position Maps list
    function positionDesktopMapList (argument) {
        try {

            let containerList = document.getElementById("ul"),
            positionTarget = document.querySelector(".my-custom-controls #map2 button"),
            positionTargetRect = positionTarget.getBoundingClientRect(),
            myCustomControls = document.querySelector(".main-ctrl"),
            bodyRect = document.body.getBoundingClientRect(),
            leftOfBodyTarget = positionTargetRect.left < bodyRect.left ? bodyRect.left - positionTargetRect.left : positionTargetRect.left - bodyRect.left,
            containerListMaxNumber = 0 < window.innerHeight - 32 * containerList.children.length - 30 - 90 ? containerList.children.length : Math.round( (window.innerHeight - 30 - 90) / 32 ) ;

            containerListMaxNumber = containerList.children.length < containerListMaxNumber ? containerList.children.length : containerListMaxNumber;

            containerList.style.position = "absolute";
            containerList.style.top = "auto";

            containerList.style.bottom = "calc( " + getComputedStyle(myCustomControls).getPropertyValue("height") + " + " +  getComputedStyle(myCustomControls).getPropertyValue("bottom") + " + 8px )";
            containerList.style.left = ( leftOfBodyTarget - ( ( positionTargetRect.width - 13 ) / 2 ) ) + "px";
            containerList.style.marginBottom = "0px";
            containerList.style.height = "100%";
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

    //Position Maps list
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

    function positionScaleBar () {
        let scale = document.querySelector(".mapboxgl-ctrl-scale"),
        latitudeAndLongitude = document.getElementById("show-latitude-and-longitude");

        if ( null === scale || null === latitudeAndLongitude )
            return void 0;

        scale.style.position = "fixed";
        scale.style.top = "auto";
        scale.style.left = "auto";
        scale.style.bottom = getComputedStyle(latitudeAndLongitude).getPropertyValue("bottom");
        scale.style.right = "calc(" + getComputedStyle(latitudeAndLongitude).getPropertyValue("right") + " + " + latitudeAndLongitude.getBoundingClientRect().width + "px )";
        scale.style.marginRight = "6px";
    }

    window.addEventListener("resize", positionScaleBar);
    window.addEventListener("load", positionScaleBar);
    window.addEventListener("DOMContentLoaded", positionScaleBar);





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

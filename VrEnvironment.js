
var FinishedLoading  = false;
var varFacebookLoaded = false;
var CustomMarkerLoaded = false;
var GlobMarkersList=[];

var WorldCenter = {lat: 0, lon: 0};
//var ScenePtr = null;
//comp_ptr: null,
var CustomMarkersArray = null;
var CustomMarkersArray = null;
var last_plr_pos = null;//last



//Function initilize Virtual environment
function InitVR()
{
    document.querySelector('.title').style.opacity = 0;
    document.querySelector('.title').style.pointerEvents = 'none';
    window.addEventListener('gps-coord-set', coordSetListener);
}


//Function sets the VR objects
function coordSetListener (e) {

    //Load facebook places:
    //LoadPlacesFromNEt(GlobCenter);
    //GetPlacesFromFourSquares(GlobCenter);
    FinishedLoading = true;

    //Setup listeners:
    window.removeEventListener('gps-coord-set', coordSetListener);
    console.log('VRenv module is Loaded end entities deployed');
    window.addEventListener('gps-position-update', UpdateLabelOnMarker);//Add listener for text change
}





//Function places an object in VR environment based on its coordinates lat lon //TBD  - @@ rewrite with 3DCSS
function PlaceInVR (PosCoord, WorldCenterPos, name) {

    //If the globcenter is not initialized:
    if(PosCoord.lat==0 && PosCoord.lon==0) return;
    const z = -8;

    //Get the relative position to world center:
    //@@let result = GetDirection(PosCoord, WorldCenterPos);
    let result = GetDirection(WorldCenterPos, PosCoord);//distance in [km]

    let vrpos = new THREE.Vector3(result.x * Scale, z, result.y * Scale);
    let dist = CameraWrapper.position.distanceTo(vrpos);//[km*Scale]

    //In [meters]
    //If far than 5 [km] don't display
    if(Math.floor(dist/Scale*1000) > 5000 && (InvokeAppOrigin=='PLAIN') )
    {
        document.getElementById("ERRMSG").innerHTML = `${name} out of range ${Math.floor(dist/Scale*1000)}[m]`;
        return;
    }

    //Create CSS2D object:
    var element1 = document.createElement( 'div' );
    //element1.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="55" viewBox="0 0 24 24" width="55" onclick="this.classList.toggle(\'open\')" fill="white" class="compass"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';
    //element1.innerHTML = '<a class="label">Some text</a><svg xmlns="http://www.w3.org/2000/svg" height="110" viewBox="0 0 24 24" width="110" onclick="this.classList.toggle(\'open\')" fill="white" class="compass"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';

    //Add text label with name and distance from player:
    let name_=name;
    name_ = '<span class="name">'+name_+`</span><span>${(((dist/Scale)/3)*60).toFixed(0)} min walk</span>`; //assuming speed of walking 3km/h =(km/Scale*Scale)/(5km/h)*60 in minutes

    //element1.innerHTML = '<a class="label">'+name_+'</a><svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 0 24 24" width="30" onclick="this.classList.toggle(\'open\')" fill="white" class="icon"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';
    element1.innerHTML = '<a class="label">'+name_+'</a><div class="icon"></div>';
    element1.classList = 'marker';

    //Create css element for the place:
    var vricon = new CSS2DObject( element1 );
    // add it to the special css scene

    //If already vricon exist then exit:
    let Isduplicate=false;
    GlobMarkersList.forEach((item, i) => {
      if(result.x * Scale == item.position.x &&
        result.y * Scale == item.position.z )
         Isduplicate=true;
    });
    if(Isduplicate)return;

    scene2.add(vricon);
    vricon.position.x = result.x * Scale;
    vricon.position.y = (CameraWrapper.position.y)+Math.floor(5*(Math.random()));
    vricon.position.z = result.y * Scale;

    //Update the global target with the last created icon:
    TargetObjectGlob = vricon;
    //Add the marker to glob list
    GlobMarkersList.push(vricon);
    //vricon.lookAt(CameraWrapper.position);
}


//Places the sign to a request:
function PlaceSign (delta_lat, delta_lng, PlrLoc, Name) {
    //Place an obj and panel to the north:
    let pnl_loc = {lat: 0, lon: 0};
    pnl_loc.lat = PlrLoc.lat + delta_lat;
    pnl_loc.lon = PlrLoc.lon + delta_lng;
    PlaceInVR(pnl_loc, GlobCenter, Name);
}


//Function updates the text label on markers:
function UpdateLabelOnMarker()
{
    //Run on all labels (assuming that no labels were deleted)
    document.querySelectorAll('.label').forEach(function (label, index) {
        let threeMarkerPos = new THREE.Vector3(GlobMarkersList[index].position.x, GlobMarkersList[index].position.y,GlobMarkersList[index].position.z);
        let distance = CameraWrapper.position.distanceTo(threeMarkerPos);
        label.children[1].innerHTML = `${(((distance/Scale) / 3) * 60).toFixed(0)}` + ' min walk';//3km/h
    });
}


//Function clears all markers from VR:
function ClearAllMarkersVr()
{
    //Run on all labels (assuming that no labels were deleted)
    document.querySelectorAll('.label').forEach(function (label, index) {
        scene2.remove(GlobMarkersList[index]);
    });
}

//Calculate the distance to object from camera and put it to string [meters or km]
function GetDistanceToObject(el)
{
    let cam_wrap = document.getElementById("wrapper");
    let dist = cam_wrap.object3D.position.distanceTo(el.object3D.position)/this.data.Scale*1000;//[km*Scale]
    let d_units = dist> 1000? `${(dist/1000).toFixed(0)}(km)`:`${dist.toFixed(0)}(m)`;
    return d_units;
}


//Gets places from foursquares:
function GetPlacesFromFourSquares(player_pos)
{
    const params = {
        radius: 100,    //3000 search places not farther than this value (in meters)
        clientId: 'A3YUBJ0DWI2P34DXA5SKS4XZ24OYJIRJXRH3BR4SF32CDG3G',
        clientSecret: 'BRJVCYRK1B3C2DZWXHANFRU1D0Z5L1E20MJDWNIK0MVAFPP3&v=20180323',
        version: '20180323',//'20300101',
    };

    const endpoint = `https://api.foursquare.com/v2/venues/explore?client_id=
        A3YUBJ0DWI2P34DXA5SKS4XZ24OYJIRJXRH3BR4SF32CDG3G
        &client_secret=BRJVCYRK1B3C2DZWXHANFRU1D0Z5L1E20MJDWNIK0MVAFPP3&v=20180323
        &limit=100&radius=3000&ll=${player_pos.lat},${player_pos.lon}&sort=nearby`;
    //&query=//+"&limit=100";
    //const endpoint = `https://api.foursquare.com/v2/venues/search?intent=checkin
    //&ll=${player_pos.lat},${player_pos.lon}&radius=${params.radius}&client_id=${params.clientId}&client_secret=${params.clientSecret}&limit=10&v=${params.version}&sort=nearby`;

    //Call foursquares for places:
    httpRequest('GET', endpoint, (resp)=>{
        //resp.response.venues
        let places = resp.response.groups[0].items;//resp.response.venues;
        places.forEach((place) => {
            place.venue.location.lat
            let pls_pos = {lat: place.venue.location.lat, lon: place.venue.location.lng};
            this.PlaceInVR(pls_pos, this.WorldCenter, place.venue.name);
            //this.PlaceObjectOnMap(pls_pos,place.venue.name);
        });
    });
}

//Function places a Place on Mapbox: pos is{lat,lon}
function PlaceObjectOnMap(pos,name) {
    //let qmarker
    let gmarker = {
        lat: parseFloat(pos.lat),
        lon: parseFloat(pos.lon),
        desc: name
    };
    //Send message to mapbox to draw entity
    window.dispatchEvent(new CustomEvent('new-custom-marker-added',
        {detail: gmarker}));
}




//HTTP support implements GET and POST :
function httpRequest(type, url, callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var response = JSON.parse(this.responseText);
            callback(response);
        }
    };
    xmlhttp.open(type, url, true);
    xmlhttp.send();
}




//Debug Places in VR:
/*
//texture.wrapS = THREE.RepeatWrapping;
    //texture.wrapT = THREE.RepeatWrapping;
    //texture.magFilter = THREE.NearestFilter;


   //Create floating cube :
   var geometry = new THREE.BoxGeometry(3,3,3);
   var material = new THREE.MeshBasicMaterial(
       {
            color:'red'
           //map: loader.load('./border.png')//,{ color:'blue' }
       }
   );//'33C3F0'//loader.load('./border.png');
   var cube = new THREE.Mesh( geometry, material );
   scene.add( cube );
   cube.position.y = -7;
   cube.position.z = -50;
   cube.position.x = -50;
    */
//Create CSS2D object:
//const element1 = document.createElement( 'div' );
//element1.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="55" viewBox="0 0 24 24" width="55" onclick="this.classList.toggle(\'open\')" fill="white" class="compass"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';
//element1.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="110" viewBox="0 0 24 24" width="110" onclick="this.classList.toggle(\'open\')" fill="white" class="compass"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';
//element1.innerHTML = '<a class="label">St. James Place</a><svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 0 24 24" width="30" onclick="this.classList.toggle(\'open\')" fill="white" class="icon"><path d="M0 0h24v24H0z" fill="none"></path><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path></svg>';
//element1.innerHTML = '<a class="label">St. James Place</a><div class="icon"></div>';
//create the object2d for this element
//var cssObject = new CSS2DObject( element1 );
// add it to the special css scene
//scene2.add(cssObject);
//cssObject.position.x = -7-100;
//cssObject.position.y = 0;
//cssObject.position.z= -10-100;

//setupControllerEventHandlers( controls );
//DevControls.disconnect();

/*
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
       */
/*
    let place_pos = {lat: 31.3365254, lon: 34.8968868};
    PlaceInVR(place_pos, GlobCenter, "End of Givton");
    //PlaceObjectOnMap(place_pos,"End of Givton");

    let place_pos2 = {lat: 31.3363421, lon: 34.8966806};//Location(31.3363421f, 34.8966806f);;
    PlaceInVR(place_pos2, GlobCenter, "Home");
    PlaceObjectOnMap(place_pos2,"Home");

    let place_pos3 = {lat: 31.333996, lon: 34.918030};//Cramim:Location(31.333996f, 34.918030f);
    PlaceInVR(place_pos3, GlobCenter, "Cramim ");
    //PlaceObjectOnMap(place_pos3,"Cramim");

    let place_pos4 = {lat: 31.361980, lon: 34.901337};//Sansana: 31.361980f; tmp_loc.lng = 34.901337f;
    PlaceInVR(place_pos4, GlobCenter, "Sansana ");
    //PlaceObjectOnMap(place_pos4,"Sansana");

    let place_pos5 = {lat: 31.292518, lon: 34.943687};//Misgad hura : 31.292518f; tmp_loc.lng = 34.943687f;
    PlaceInVR(place_pos5, GlobCenter, "Misgad Hura ");
    //PlaceObjectOnMap(place_pos5,"Misgad Hura");

    let place_pos6 = {lat: 31.327042, lon: 34.864652};//Misgad Lakia: tmp_loc.lat = 31.327042f; tmp_loc.lng = 34.864652f;
    PlaceInVR(place_pos6, GlobCenter, "Misgad Lakia");
    //PlaceObjectOnMap(place_pos6,"Misgad Lakia");

    let place_pos7 = {lat: 31.327815, lon: 34.928765};////Meitar: Bus station: tmp_loc.lat = 31.327815f; tmp_loc.lng = 34.928765f;
    PlaceInVR(place_pos7, GlobCenter, "Meitar bus");
    //PlaceObjectOnMap(place_pos7,"Meitar bus Station");
*/
//TEST ROTATION SIGNES:
//Place an obj and panel to the north:
//let lscale=1;//0.001;//5
/*
PlaceSign(+0.0004 * lscale, 0, GlobCenter, "North Sign");//*5
//Place an panel to the south:
PlaceSign(-0.0004 * lscale, 0, GlobCenter, "South Sign");
//Place an panel to the east:
PlaceSign(0, +0.0004 * lscale, GlobCenter, "East");//East Sign
//Place an panel to the west:
PlaceSign(0, -0.0004 * lscale, GlobCenter, "WEST SIGN");//West Sign
*/
//--------------------------

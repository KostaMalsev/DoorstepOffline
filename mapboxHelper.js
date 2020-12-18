//self location
var Location_source = null;
//Pointer to map
var gmap = null;
//Self location Marker
var SelfPOsMarker = null;

var map = null;

//Global markers on map
var Gmarkers = [];

//const server = "https://jsonblob.com/api/var/d1d0be40-90ff-11ea-bb21-f9b978970334";
const server = "https://jsonblob.com/0669996a-0d5f-11eb-adc9-75888b8384ce";
const json = "application/json; charset=UTF-8";
//var comp_ptr = null;


//Inititalize the mapbox:
function MapboxInit() {
  mapboxgl.prewarm();//TBD
  //Mapbox support:
  mapboxgl.accessToken = 'pk.eyJ1Ijoia29zdHlhbWFsc2V2IiwiYSI6ImNrZzdzeWNyaDAxb2cyc21xNGQ4M3V1cmYifQ.4sI-RLSFRwMmVmKkM76R_A';
  map = new mapboxgl.Map({
    container: 'map',
    //style: 'mapbox://styles/mapbox/streets-v11?optimize=true',
    style: 'mapbox://styles/mapbox/streets-v11?optimize=true',
    //style: 'mapbox://styles/mapbox/outdoors-v10?optimize=true'
    minzoom: 5,//12.25,
    maxzoom: 20,
    zoom: 6,
    //MinZoom: 12.25,
  });
  //Add event listener to see if there is self location:
  window.addEventListener('gps-coord-set', SetUpListeners);
}


let ePos;

function SetUpListeners() {
  window.addEventListener('gps-position-update', MoveSelfMarker);
  window.addEventListener('new-custom-marker-added', PlaceMarker);
  //Set update rotation to sync with true north
  //window.addEventListener('rotation-is-set',UpdateMapRot);
  window.removeEventListener('gps-coord-set', SetUpListeners);
  //window.removeEventListener('rotation-is-set',UpdateMapRot);

  //Set click event handler for map:
  map.on('click', function (e) {
    document.querySelector('.prompt-wrapper').classList.add('open');
    document.querySelector('.rename').focus();
    ePos = e;
  });
  //Position self marker on zero axis:
  MoveSelfMarker({lat: 0, lon: 0});

  //Handle URL Input - Create Marker from URL call:
  HandleURLInputs();

  console.log('Mabpox Loaded and ready');
}




//Function adds marker to map and to DB (firebase/local storage)
function renameMarker() {
  let newName = document.querySelector('.rename').innerHTML;
  document.querySelector('.rename').innerHTML = '';

  let desc_ = `A${Math.floor(Math.random() * 10)}`;
  if (newName) {
    desc_ = newName;
  }

  var d = new Date();
  let dtime_ = d.getTime();
  let details = {lat: ePos.lngLat.lat, lon: ePos.lngLat.lng, desc_,
    id: hashCode(desc_ + dtime_.toString()), time_: dtime_.toLocaleString()};
  let pos = {lat: ePos.lngLat.lat, lon: ePos.lngLat.lng};
  let marker_ = addMarker(pos, desc_);

  //let key_ = WriteToFirebaseDB(details);
  //Gmarkers.push({handle: marker_, uid:details.id, key: key_});
  AddToStorage(details);
  CreateGeolink(pos,desc_);//Create geolink
  Gmarkers.push({handle: marker_, uid:details.id, key: 0});
  let pls_pos = {
    lat: details.lat,
    lon: details.lon
  };
  //Add in VR:
  PlaceInVR(pls_pos, GlobCenter, desc_);
}


//Function adds marker to map and to DB (firebase)
function CreateMarker(pos, desc_) {

  var d = new Date();
  let dtime_ = d.getTime();
  let details = {lat: pos.lat, lon: pos.lon, desc_,
    id: hashCode(desc_ + dtime_.toString()), time_: dtime_.toLocaleString()};
  let marker_ = addMarker(pos, desc_);

  //let key_ = WriteToFirebaseDB(details);
  //Gmarkers.push({handle: marker_, uid:details.id, key: key_});
  AddToStorage(details);
  Gmarkers.push({handle: marker_, uid:details.id, key: 0});
}

//Add selfposition marker:
function addMarkerSelf(pos)
{
  var popup = new mapboxgl.Popup({closeButton:false,closeOnClick:false,closeOnMove:false, className: 'my_location'})
    .setText('Me')
    .addTo(map);

  //let icon = document.createElement('div');
  //icon.className = 'you';//document.getElementById('icon_self_pos');
  //var marker = new mapboxgl.Marker({element: icon})

  var el = document.createElement('div');
  el.className = 'myLocM';

  el.addEventListener('click', function () {
    console.log('clicked on currentPos')
  });

  var marker = new mapboxgl.Marker(el)
    .setLngLat([pos.lon, pos.lat])
    .addTo(map)
    .setPopup(popup);
  return marker;
}


//function moves self location marker on map:
function MoveSelfMarker(pos) {

  let accuracy = (data.crd_accuracy < 3) ? 3 : data.crd_accuracy;

  let Location_target = {lat: data.crd_lat, lon: data.crd_lon};
  //If this is the first time, set source to zero:
  if (Location_source == null) {
    Location_source = {lat: 0, lon: 0};
  }
  let direction = GetDirection_(Location_source, Location_target);

  //pos.coords.accuracy
  pos = {
    lat: Location_target.lat,
    lon: Location_target.lon
  };
  //let cramim = {lat: 31.333996, lon: 34.918030};
  if (SelfPOsMarker == null) {
    SelfPOsMarker = addMarkerSelf(pos);
    map.flyTo({center: [pos.lon, pos.lat]});
    map.setMinZoom(12.25);
  }
  //If distance in [km] is bigger than 3 meters:
  if (direction.distance_ > 0.010)//0.010
  {
    Location_source = Location_target;
    SelfPOsMarker.setLngLat([
      pos.lon,
      pos.lat
    ]);
    //map.flyTo({center: [pos.lon, pos.lat]});
  }
}



//Implements hashcode for string
function hashCode(s) {
  var h = 0, l = s.length, i = 0;
  if (l > 0)
    while (i < l)
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
  return h;
}



//Function clears all maps markers
function ClearAllMapMarkers()
{
  Gmarkers.forEach((mark)=>{
    mark.handle.mrk.remove();
    mark.handle.pop_.remove();
  });
}



//Handle link string from HERE: //not used
function HandleSearchRequest(str)
{
  //let str = "Rothschild‌‌ 17: https://share.here.com/l/32.09386736,34.88047952?ref=iOS";
  let pos_name = "";
  let latlon = str.split('/')[4].split("?")[0].split(',');
  let pos = {lat: latlon[0], lon:latlon[1]};
  pos_name = str.split(":")[0];
  if(pos_name!="")
    CreateMarker(pos, pos_name);
  map.flyTo({center: [pos.lon, pos.lat]});
  map.setMinZoom(12.25);
}



//Search Support:
//Add event listener on using search in mapbox
var search = document.querySelector('.search');
search.addEventListener('keyup', ({key}) => {
  if (key === "Enter") {
    searchLocation(search.value);
    search.value = '';
    search.blur();
  }
});

//Function searches location using openstreetmap api:
//Supports copy from waze and from google maps:
//If not waze, then check if whatsapp, and if not whatsapp then googlemaps
async function searchLocation(query) {

  if(query =="" || query==null){
    console.log('Search place - empty query');
    return;
  }


  //https://maps.google.com/maps/search/Israel/@31.329565048217773,34.89474868774414,17z?hl=en
  let whatsapp = (query.search('https://maps.google.com/') != -1)?true:false;
  if(whatsapp)
  {
    let succ = CreateMarkerFromWhatsApp(query);
    return;
  }

  //If  its not a whatsapp, try decode the deeplink :
  let deeplink="";
  let waze=false;
  try
  {
    deeplink = query.split(' https://')[1];

    let label = ""
    if(query.split(' https://').length > 1){
      label = query.split(' https://')[0].split('Waze')[1];
    };
    //If waze:  ex. https://waze.com/ul/hsv8f61gft
    let waze = (query.search('waze.com')!= -1)?true:false;

    let google_m =  (query.search('goo.gl/maps') != -1)?true:false;
    //If theere is a deep link detected:
    if(deeplink.length>1)
    {
      if(waze){
        CreateMarkerOnDeeplink(deeplink,label);
        console.error('waze: invalid link');
      }
      return;
    }
    if(google_m)
    {
      CreateMarkerFromGoogleMaps(deeplink);
      return;
    }
  }catch(error)
  {
    console.error(error);
  }

  // If not predefined link, Try to find the adress in openstreetmap:
  let query_ = query.split(' https://')[0].replace(/[\n\r]/g, '').replace('St ', '').replace(':', '').replace('Use Waze to drive to ', '');
  let data_ = await axios.get('https://nominatim.openstreetmap.org/search.php?q='+encodeURI(query_)+'&polygon_geojson=1&format=jsonv2');

  if (data_!=null && data_.length>0) {
    var pos = {lat: data_[0].lat, lon: data_[0].lon};
    CreateMarker(pos, query_);
    //Place in VR also //TBD - consider to consolidate sources
    PlaceInVR(pos, GlobCenter, query_);
    map.flyTo({center: [pos.lon, pos.lat]});
  }
}



//Function parses url and determines if origin is waze and returns deeplink
function IsWaze(query)
{
  let deeplink="";
  let waze=false;
  try
  {
    deeplink = query.split(' https://')[1];
    let label = ""
    if(query.split(' https://').length > 1){
      label = query.split(' https://')[0].split('Waze')[1];
    };
    //If waze:  ex. https://waze.com/ul/hsv8f61gft
    let waze = (query.search('waze.com')!= -1)?true:false;
    //let google_m =  (query.search('goo.gl/maps') != -1)?true:false;
    //If theere is a deep link detected:
    if(waze && deeplink.length>1)
    {
      return {answ: true, deeplink: deeplink, label: label};
    }else{
      return { answ: false, deeplink: "", label: ""};
    }
  }catch(error)
  {
    console.error(error);
    return {answ: false, deeplink:"", label:""};
  }
}



function CreateMarkerFromWhatsApp(link_)
{
  //Dropped pin Near Air https://maps.google.com/maps/search/Israel/@31.329565048217773,34.89474868774414,17z?hl=en
  //https://maps.google.com/maps?q=31.336240768432617%2C34.8965950012207&z=17&hl=en"
  let data_ = link_.replace('%2C',',').split('?')[1].replace("q=","").split("=")[0].split("&")[0].split(",");
  if (data_!=null && data_.length>0) {
    var pos = {lat: parseFloat(data_[0]), lon: parseFloat(data_[1])};
    let d = new Date();
    let str_d = d.toLocaleTimeString();
    CreateMarker(pos, 'WhatsApp:'+str_d);
    //Place in VR also //TBD - consider to consolidate sources
    PlaceInVR(pos, GlobCenter, 'WhatsApp:'+str_d);
    map.flyTo({center: [pos.lon, pos.lat]});
    return 1;
  }else return 0;
}



//For links from pinpoints:
function CreateMarkerFromGoogleMaps(deeplink)
{

  //TBD: google denied access for https://goo.gl/maps although postman can access it
  return 0;
  //https://goo.gl/maps/GSiZdRE9aLXAtbzW7
  //https://goo.gl/maps/7mHPQ4eS8rtF9E3s8
  //responce: content="//geo0.ggpht.com/cbk?cb_client=maps_sv.tactile&amp;output=thumbnail&amp;thumb=2&amp;panoid=_w9ljwxhAyzfDhpvkrBk3Q&amp;w=256&amp;h=256&amp;yaw=28&amp;pitch=0&amp;thumbfov=75&amp;ll=32.063227,34.771516"
  //  var data_ = await axios.get(query);
/*
  doCORSRequest({
    method: 'GET',
    url: deeplink,
    data: ''},
     (result)=>{
    let data_ = result.split(`content="//geo0.ggpht.com/`)[1].split('?')[1].split(`;`)[9].split('\n')[0].replace('ll=','').split(`"`)[0].split(','); //[lat=9],[lon=10]
    //str[1].split('?')[1].split(`;`)[9].split('\n')[0].replace('ll=','').split(`"`)[0].split(',')

    let data_=null;
    if(data_[9]!=null && data_[10]!=null )
    {
      data_[0] = data_[9];//lat
      data_[1] = data_[10];//lon
    }

    if (data_!=null && data_.length>0){
      var pos = {lat: parseFloat(data_[0]), lon: parseFloat(data_[1])};
      CreateMarker(pos, 'GMarker');
      //Place in VR also //TBD - consider to consolidate sources
      map.flyTo({center: [pos.lon, pos.lat]});
      PlaceInVR(pos, GlobCenter, 'WhatsApp:'+str_d);
      return 1;
    }else {
      return 0;
    }
  });
  */
}



//Returns lat lon from deep link waze:
//Require waze deeplink - like this: "https://waze.com/ul/hsv8f61gft"
function CreateMarkerOnDeeplink(deeplink,name_)
{
//  var data_ = await axios.get(query);
  doCORSRequest({
    method: 'GET',
    url: deeplink,
    data: ''
  }, function SetMarker(result) {
    try{
    //<link rel="canonical" href="https://www.waze.com/live-map/directions?latlng=31.259687%2C35.220215">
    let latlonstr = result.split('href="https://www.waze.com/live-map/directions');
    let latlon_arr = latlonstr[1].split('<link rel="canonical" href="https://www.waze.com/live-map/directions?')[0].split('">')[0].replace('%2C',",").replace('latlng=','').replace(`"`,'').replace(`?`,'').split(',');
    var data_ = null;
    data_ = {lat:parseFloat(latlon_arr[0]), lon:parseFloat(latlon_arr[1])};
    if (data_!=null) {
      var pos = {lat: data_.lat, lon: data_.lon};
      let str_ = name_!=""?name_:deeplink;
      CreateMarker(pos, str_);
      //Place in VR also //TBD - consider to consolidate sources
      PlaceInVR(pos, GlobCenter, str_);
      map.flyTo({center: [pos.lon, pos.lat]});
    }
  }catch(error){
    console.log(error);
    //Place 20 chars from responce
    document.getElementById('STATS').innerHTML = result.substr(1, 20);
  }
  });
}


//Function handles url inputs:
//ex.: https://loocat.netlify.app/?lat=31.336240768432617&lon=34.8965950012207&name=Test
var called_once=true;
function HandleURLInputs()
{
  //Call this function only once:

  if(called_once){
    called_once=false;
  }else{
    return;
  }


  //Parse url:
  var url = new URL(window.location.href);

  //IF Webapp is called from pwa:
  if(url.searchParams.get('app')!=null)
  {
    //document.getElementById('STATS').innerHTML = url.searchParams.get('app');;
    HandlePWA_url();
    return;
  }

  let lat = url.searchParams.get('lat');
  let lon = url.searchParams.get('lon');
  let name_ = url.searchParams.get('name');

  let pos = null;
  if(lat==null || lon==null)return;
  //Check if both latitude and longitude are defined and name is no malicios:
  if(lat.length>0 && lon.length>0)
  {
    //If no lat lon:
    if(Math.abs(parseFloat(lat))> 90 || Math.abs(parseFloat(lon))>90)
    {
      return;
    }
    pos = {lat: parseFloat(lat), lon: parseFloat(lon)};
  }
  else
  {
    return;
  }

  //Check name is no malicios:
  if(name_!=null)
  {
    if(name_.length > 20)
    {
      return;
    }
  }

  //Create default name if absent:
  let d = new Date();
  let str_d = d.toLocaleTimeString();
  name_ = (name_!=null) ? name_ : `Site:str_d`;
  CreateMarker(pos, name_);
  //Place in VR also //TBD - consider to conssolidate sources
  PlaceInVR(pos, GlobCenter, name_);
  //map.flyTo({center: [pos.lon, pos.lat]});
}


//Create geolink:
//ex.: https://loocat.netlify.app/?lat=31.336240768432617&lon=34.8965950012207&name=Test
function CreateGeolink(pos,name)
{

  if(pos!=null && name!=null)
  {
    let glink = `https://loocat.netlify.app/?lat=${pos.lat.toFixed(15)}&lon=${pos.lon.toFixed(15)}&name=${name}`;
    document.getElementById('GEOLINK').innerHTML = glink;
  }

}


//URL decode string:
function decode_url(str) {
     //return decodeURIComponent(str.replace('/\+/g'," "));
     return decodeURIComponent(str);
}


//Function handles pwa_url (progressive web app)
function HandlePWA_url(url_)
{
  //wpa is called in android waze:
  //https://loocat.netlify.app/?app=wazeandroid&adress=MyAdress&deeplink=deeplink;
  var url = new URL(window.location.href);
  let app = url.searchParams.get('app');

  //document.getElementById('STATS').innerHTML = decode_url(url);
  //return;

  //if request came from ios pwa wrapper
  if(app == "ios")
  {
    //return;
    let res = IsWaze(decode_url(url));
    //If it's waze:
    if(res.answ)
    {
      CreateMarkerOnDeeplink("https://" + res.deeplink,res.label);
      document.getElementById('STATS').innerHTML = "Called by Waze@"+res.deeplink+res.label;
    }else{
      //Try with HERE encoder:
      if(!CreateFromHERE(decode_url(url)))
      {
          if(!CreateFromSnapChat(decode_url(url)))
          {
            console.log("Simple activation, no marker needed")
          }
      }
    }
  }


  //If called from waze android:
  if(app=="wazeandroid"){
    //TODO
    //Create vricon from waze deeplink: ex: https://waze.com/ul/hsv8f606rf
    //https://loocat.netlify.app/?app=wazeandroid&adress=WazeTest&deeplink=hsv8f606rf - maglan street
    let deeplink = url.searchParams.get('deeplink');
    CreateMarkerOnDeeplink("https://waze.com/ul/" + deeplink,url.searchParams.get('adress'));
  }else{
    //https://loocat.netlify.app/?app=herewegoandroid&adress=Adress&coordinates=31.3363421,34.8966806
    // {lat: 31.3363421, lon: 34.8966806}
    if(app=="herewegoandroid") //If it's HERE we GO app
    {
      let coordinates = url.searchParams.get('coordinates');
      let place_name = url.searchParams.get('adress');
      let split_str= coordinates.split(',');
      let pos = {lat: split_str[0], lon: split_str[1]}

      //Create default name if absent:
      let d = new Date();
      let str_d = d.toLocaleTimeString();
      let name_ = (place_name!=null) ? place_name : `Site:str_d`;
      CreateMarker(pos, name_);
      //Place in VR also //TBD - consider to conssolidate sources
      PlaceInVR(pos, GlobCenter, name_);
    }
  }
  //wpa is called in android HERE:
  //https://loocat.netlify.app/?app=herewegoandroid&adress=Adress&deeplink=coordinates;
}

//Creates marker from HERE WE GO app:
//Receives decoded url string
function CreateFromHERE(query)
{
  //1) https://share.here.com/l/31.33694588,34.89660177?ref=iOS
  //2) Drorit‌‌ 28: https://share.here.com/l/31.32995152,34.89302999?ref=iOS
  //let waze = (query.search('waze.com')!= -1)?true:false;
  let here_f = (query.search('share.here.com')!= -1)?true:false;
  try{
    //If foudn HERE url:
    if(here_f)
    {
      let latlon = query.split('https://share.here.com/l/')[1].split('?')[0].split(',');
      let adress = query.split('https://share.here.com/l/')[0].split("&")[1];

      let pos = {lat: latlon[0], lon: latlon[1]};

      let d = new Date();
      let str_d = d.toLocaleTimeString();

      adress = (adress!="") ? adress : "HERE:"+str_d;
      CreateMarker(pos, adress);
      //Place in VR also //TBD - consider to conssolidate sources
      PlaceInVR(pos, GlobCenter, adress);
      document.getElementById('STATS').innerHTML = "Called by HERE:"+adress;
      return true;
    }else{
      return false;
    }
  }catch(error)
  {
    console.error(error);
    return false;
  }
}

//Creates marker from Snapchat  app:
//Receives decoded url string
function CreateFromSnapChat(query)
{
  // https://map.snapchat.com/@31.283592,34.858748,12.473058z
  let snap_f = (query.search('map.snapchat.com')!= -1)?true:false;
  try{
    //If foudn HERE url:
    if(snap_f)
    {
      let latlon = query.split('@')[1].replace('z',"").split(',');

      let pos = {lat: latlon[0], lon: latlon[1]};

      let d = new Date();
      let str_d = d.toLocaleTimeString();

      let adress = "Snap map:"+str_d;
      CreateMarker(pos, adress);
      //Place in VR also //TBD - consider to conssolidate sources
      PlaceInVR(pos, GlobCenter, adress);
      document.getElementById('STATS').innerHTML = "Called by Snap:"+adress;
      return true;
    }else{
      return false;
    }
  }catch(error)
  {
    console.error(error);
    return false;
  }
}








//Http request support:
const axios = {
  'get': (url) => {
    return new Promise((resolve, reject) => {
      try {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
          if (this.readyState == 4 && this.status == 200) {
            resolve(JSON.parse(this.responseText));
          }
        };
        xmlhttp.open('GET', url, true);
        xmlhttp.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xmlhttp.send();
      } catch(e) { reject(e) }
    });
  },
  'post': (url, data) => {
    return new Promise((resolve, reject) => {
      try {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
          if (this.readyState == 4 && this.status == 201) {
            resolve(JSON.parse(this.responseText));
          }
        };
        xmlhttp.open('POST', url, true);
        xmlhttp.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xmlhttp.send(JSON.stringify(data));
      } catch(e) { reject(e) }
    });
  }
};



function create(htmlStr) {
  var frag = document.createDocumentFragment(),
    temp = document.createElement('div');
  temp.innerHTML = htmlStr;
  while (temp.firstChild) {
    frag.appendChild(temp.firstChild);
  }
  return frag;
}

//Function implements add marker with mapbox api:
function addMarker(pos, label) {
   var popup = new mapboxgl.Popup({closeButton:false,closeOnClick:false,closeOnMove:false})
    .setText(label)
    .addTo(map);

  var marker = new mapboxgl.Marker()
    .setLngLat([pos.lon, pos.lat])
    .addTo(map)
    .setPopup(popup);

  //Add event listener for each marker created:
  //popup.addEventListener('click', HandleMarkerClick);

  //map.flyTo({center: [cramim.lon, cramim.lat]});
  return {mrk: marker, pop_: popup};
}


//Firebase support ------------:

//From external source (firebase)
function PlaceMarker() {
  //e.detail.position.lon;
  let pos = {lat: this.event.detail.lat, lon: this.event.detail.lon};
  addMarker(pos, this.event.detail.desc);
}

//Function writes messages and data to Firebase db
function WriteToFirebaseDB(details) {

  let out = {
    Centerloc: {
      lat: details.lat,
      lng: details.lon
    },
    x: 0,
    y: 0,
    desc: details.desc_,
    id: details.id,
    user_id: 'map',
    dtime: details.time_
  };
  let marker_key=null;

  if (msgRef != null) {
    marker_key = msgRef.push(out).getKey();
    msgRef.push(out);
  }
  return marker_key;
}


//Remove marker
/*
function RemoveMarker(Marker)
{
  //Find the marker key in the object array:
  var result = Gmarkers.filter(obj => {
    return obj.marker_ === Marker;
  });

  //Delete the marker from db:
  DeleteFromFirebase(result.key);
  //Remove it from map:
  Marker.remove();
}
*/

//Function removes item from firebase
function DeleteFromFirebase(key)
{
  //removing the key:
  msgRef.child(`${key}`).remove();
}

//Change name of the marker (element):
function RenameElAtFirebase(key,new_name)
{
  msgRef.child(`${key}`).update({'desc': new_name});

}

//Clear database
function DeleteFirebaseMarkers()
{
  //removing the key:
  msgRef.remove();
  let out = {
    Centerloc: {
      lat: 0,
      lng: 0
    },
    x: 0,
    y: 0,
    desc: 'init',
    id: 0,
    user_id: 'map',
    dtime: 0
  };
  msgRef = db.ref("/POIS");
  msgRef.push(out);
}



//Get direction from pt. of origin to target :
//distance[km],[x,y]-in [km] and bearing[deg from north]
//from pt of origin to target location:
function GetDirection_(Location_source, Location_target) {

  let lat2 = Location_target.lat;
  let lat1 = Location_source.lat;
  let lon2 = Location_target.lon;
  let lon1 = Location_source.lon;


  let R = 6371; // [km]
  let phi1 = degToRad(lat1);// * THREE.Math.Deg2Rad;
  let phi2 = degToRad(lat2);// * THREE.Math.Deg2Rad;
  let lambda1 = degToRad(lon1);// * THREE.Math.Deg2Rad;
  let lambda2 = degToRad(lon2);// * THREE.Math.Deg2Rad;

  let delta_phi = degToRad(lat2 - lat1);// * THREE.Math.Deg2Rad;
  let delta_lambda = degToRad(lon2 - lon1);// * THREE.Math.Deg2Rad;

  let a = Math.sin(delta_phi / 2) * Math.sin(delta_phi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(delta_lambda / 2) * Math.sin(delta_lambda / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let d = R * c;
  let distance = d;//distance in km

  //Calculate the bearing:
  //where phi1, lambda1 is the start point, phi2,lambda2 the end point(delta_lambda is the difference in longitude)

  let y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  let x = Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  let brng = radToDeg(Math.atan2(y, x));// * THREE.Math.Rad2Deg;

  let bearing = brng;//bearing in [deg]

  //Fix the non-relevant degrees:
  bearing = (bearing + 360) % 360;

  let brng_tmp = (brng + 360) % 360;
  let x_ = distance * Math.cos(degToRad(brng_tmp));// * THREE.Math.Deg2Rad);//km*Scale
  let y_ = distance * Math.sin(degToRad(brng_tmp));// * THREE.Math.Deg2Rad);//km*Scale

  let result = {
    distance_: distance,
    bearing_: bearing,
    x: x_,
    y: y_,
  };
  return result;
}

//Function deg to rad:
function degToRad(deg) {
  return deg * Math.PI / 180;
}

//Function deg to rad:
function radToDeg(rad) {
  return rad * 180 / Math.PI;
}





//Handle device orientation pitch event:
//Update map rotation
function UpdateMapRot() {
  let cmpss_heading = this.event.detail.compass_reading.compass_heading;//deg
  // rotate the map to 90 degrees
  map.setBearing(-cmpss_heading);
  ListenToOrientation();//Set to listen to orientation events
}

//For android devices:
function ListenToOrientation() {

  //For IOS devices:[all in deg]
  window.addEventListener("deviceorientation", function (event) {
    {
      //let compass_ = event.webkitCompassHeading;
      let txt_ = `alpha=${event.alpha.toFixed(1)}
                        beta=${event.beta.toFixed(1)}
                        gamma=${event.gamma.toFixed(1)}`;
      //gamma is pitch., alpha is azimuth, beta is roll
      //let compass_ = GetCompassHeading(event.webkitCompassHeading,event.beta, event.gamma);
      map.setPitch(gamma);// [0-60]
    }
  });

  //For Android devices:all in [deg]
  window.addEventListener("deviceorientationabsolute", function (event) {
    let rotateDegrees = event.alpha;//azimuth
    let rotateDegreesIOS = event.absolute;
    // gamma: left to right
    let leftToRight = event.gamma;//pitch
    // beta: front back motion
    let frontToBack = event.beta;//roll
    map.setPitch(leftToRight);
  });
}


/* CORS*/ //Enable cross domain acess:

var cors_api_url = 'https://cors-anywhere.herokuapp.com/';

function doCORSRequest(options, call_back) {
  var x = new XMLHttpRequest();
  x.open(options.method, cors_api_url + options.url);
  x.onload = x.onerror = function() {
    call_back(
      (x.responseText || '')
    );
  };
  if (/^POST/i.test(options.method)) {
    x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  }
  x.send(options.data);
}

/*
doCORSRequest({
  method: 'GET',
  url: 'https://goo.gl/maps/YnFrnNwsu2xPyFBV9',
  data: ''
}, function printResult(result) {
  var split = result.split('https://maps.google.com/maps/api/staticmap?center=')[1].split('&amp;')[0].replace('%2C', ',');
  console.log(split);
});
*/


//OLD support for http:
//Funciton to find element by it's field in firebase:
/*
ref.child('users').orderByChild('name').equalTo('John Doe').on("value", function(snapshot) {
    console.log(snapshot.val());
    snapshot.forEach(function(data) {
        console.log(data.key);
    });
});
 */



//Function handles click on marker
/*
function HandleMarkerClick() {

  //marker.desc_
  //let edit_box = document.createElement('<input type="text" name="marker_text">');
  //edit_box.value = marker.desc_;
  //marker.appendChild(edit_box);
}
 */


//Error handler for geolocation error:
//function nav_geo_error() {

//}

/*

//Place markers on map:

//Get current location and put in on the map:
//navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, this.options);


//Perform polling from json server:
//setInterval(function () {getRequest(renderMarkers) }, 2000);

//Global array of markers:

var markersArray = {
    "POintList": []
};

function PlaceMarkers() {
    GlobMarkers.forEach(el => {
        let pos = {lat: el.lat, lon: el.lon};
        addMarker(pos, el.desc);
    })
}

//Draw markers on the map:
function renderMarkers(response) {
    prevmarkers = markers;
    try {
        obj = JSON.parse(response);
    } catch (e) {
        //handleError(e);
    }
    obj.POintList.forEach(function(marker, index) {
        if (!markersArray.POintList[index]) {
            try {
                console.log(markersArray.POintList[index].id);
            } catch(e) {
                pos = {
                    lat: marker.Centerloc.lat,
                    lng: marker.Centerloc.lng
                };
                addMarker(pos, marker.desc);
            }
        }
    });
    markersArray = obj;
}


//Perform http fetch from json server:
function getRequest(callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            callback(this.responseText);
        }
    };
    xmlhttp.open("GET", server, true);
    xmlhttp.send();
}




 */

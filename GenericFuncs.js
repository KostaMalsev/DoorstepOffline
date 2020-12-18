//Globals:
var GlobCenter = {lat:0,lon:0};
var GlobMarkers=[];
var GlobDebugFlag=false;

var InvokeAppOrigin = "none";//define app invocation method


//Function returns invocation method for loocat which was used
function GetInvocationMethod()
{
  //Read url and determine which is the case:
  var url = new URL(window.location.href);
  //If it's called using pwa app
  if(url.searchParams.get('app')!=null)
  {
    return 'PWA';
  }
  //Is called through link with coordinates:
  if(url.searchParams.get('lat')!=null &&
  url.searchParams.get('lon')!=null)
  {
    return 'LINK';
  }
  return 'PLAIN';//simple call with domain name
}

//Clears local storage with map markers and VR markers
function ClearAllMarkers()
{
    ClearAllMapMarkers();
    DeleteMarkersInStorage();
    ClearAllMarkersVr();
    TargetObjectGlob=null;//delete target object
    //delete arrows:
    changeArrow(0);
    //Update debug:
    try{
      document.getElementById('PlacesLoaded').innerHTML = `Got ${StorageMarkers.length} markers`;
    }catch(error){
      console.error(error);
    }
}





//Calculate compass heading from orientation event data:
//returns true north:
function GetCompassHeading(alpha, beta, gamma) {

    // Convert degrees to radians
    var alphaRad = alpha * (Math.PI / 180);
    var betaRad = beta * (Math.PI / 180);
    var gammaRad = gamma * (Math.PI / 180);

    // Calculate equation components
    var cA = Math.cos(alphaRad);
    var sA = Math.sin(alphaRad);
    var sB = Math.sin(betaRad);
    var cG = Math.cos(gammaRad);
    var sG = Math.sin(gammaRad);

    // Calculate A, B, C rotation components
    var rA = -cA * sG - sA * sB * cG;
    var rB = -sA * sG + cA * sB * cG;

    // Calculate compass heading
    var compassHeading = Math.atan(rA / rB);

    // Convert from half unit circle to whole unit circle
    if (rB < 0) {
        compassHeading += Math.PI;
    } else if (rA < 0) {
        compassHeading += 2 * Math.PI;
    }
    // Convert radians to degrees
    compassHeading *= 180 / Math.PI;

    return compassHeading;
}






// Error. Params: message (required), source (optional)
function error(message, source) {
    document.querySelector('.title').classList.add('error');
    document.querySelector('.title a').innerHTML = message;
    if (source) {
        document.querySelector('.title a').innerHTML +=
        '<br><span style="opacity:0.5">' +
        source +
        '</span>';

    }
}



//Utility function for navigator.geolocation.getCurrentPosition
function showPosition(position)
{
    document.getElementById("GPSloc").innerHTML = "ERR Getting location last location:" +
        "Latitude: " + position.coords.latitude +
        "<br>Longitude: " + position.coords.longitude;
    console.warn(`LST COORD(${position.coords.latitude}), ${position.coords.longitude}`);
}

//Get direction from pt. of origin to target :
//distance[km],[x,y]-in [km] and bearing[deg from north]
//from pt of origin to target location:
function GetDirection(Location_source, Location_target) {

    let lat2 = Location_target.lat;
    let lat1 = Location_source.lat;
    let lon2 = Location_target.lon;
    let lon1 = Location_source.lon;


    let R = 6371; // [km]
    let phi1 = THREE.Math.degToRad(lat1);// * THREE.Math.Deg2Rad;
    let phi2 = THREE.Math.degToRad(lat2);// * THREE.Math.Deg2Rad;
    let lambda1 = THREE.Math.degToRad(lon1);// * THREE.Math.Deg2Rad;
    let lambda2 = THREE.Math.degToRad(lon2);// * THREE.Math.Deg2Rad;

    let delta_phi = THREE.Math.degToRad(lat2 - lat1);// * THREE.Math.Deg2Rad;
    let delta_lambda = THREE.Math.degToRad(lon2 - lon1);// * THREE.Math.Deg2Rad;

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
    let brng = THREE.Math.radToDeg(Math.atan2(y, x));// * THREE.Math.Rad2Deg;

    let bearing = brng;//bearing in [deg]

    //Fix the non-relevant degrees:
    bearing = (bearing + 360) % 360;

    let brng_tmp = (brng + 360) % 360;
    let x_ = distance * Math.cos(THREE.Math.degToRad(brng_tmp));// * THREE.Math.Deg2Rad);//km*Scale
    let y_ = distance * Math.sin(THREE.Math.degToRad(brng_tmp));// * THREE.Math.Deg2Rad);//km*Scale

    let result = {
        distance_: distance,
        bearing_: bearing,
        x: x_,
        y: y_,
    };
    return result;
}

// Error
window.onerror = function(message, source) {
    try {
        document.querySelector('.title').classList.add('error');
        document.querySelector('.title a').innerHTML =
            message +
            '<br><span style="opacity:0.5">' +
            source.replace('https://getaround.berryscript.com/', '') +
            '</span>';
    }
    catch {
        document.querySelector('.title a').innerHTML = 'Unknown error<br><span style="opacity:0.5">' +
        source.replace('https://getaround.berryscript.com/', '') + '</span>';
    }
};


//Calculates difference between angle1 to angle2:
function delta_angle(angle1,angle2)
{
    let angle1q = new THREE.Quaternion();
    let angle2q = new THREE.Quaternion();
    //this.cam_ptr.object3D.getWorldQuaternion(cam_rotq);
    angle1q.setFromEuler(new THREE.Euler(0, angle1, 0));
    angle2q.setFromEuler(new THREE.Euler(0, angle2, 0));
    return angle1q.angleTo(angle2q);
}

//Function returns delta bearing between two bearings in a range of [-pi,pi]
function relativeBearing(b1Rad, b2Rad)
{
    let b1y = Math.cos(b1Rad);
    let b1x = Math.sin(b1Rad);
    let b2y = Math.cos(b2Rad);
    let b2x = Math.sin(b2Rad);
    let crossp = b1y * b2x - b2y * b1x;
    let dotp = b1x * b2x + b1y * b2y;
    if(crossp > 0.)
        return Math.acos(dotp);
    return -Math.acos(dotp);
}

//Convert degrees [-180, 180) to [0..360]
function Convert180to360(deg)
{
    //var x = Math.random()*360-180;  // Generate random angle in range [-180, 180)
    let deg_r = (deg + 360) % 360;        // Normalize to be in the range [0, 360)
    return deg_r;
}

//Convert degrees [-180, 180) to [0..360]
function Convert360to180(deg)
{
    let deg_r = ((deg - 180) % 180);        // Normalize to be in the range [-180, 180)
    return deg_r;
}

//Function reverse string:
function ReverseString(str)
{
    var newString = "";
    for (var i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

//Function reverses sentence for hebrew places:
function ReverseSentence(sentence)
{
    let words = sentence.split(" ");
    let ReversedSentence = [];
    //Run on all words and check if they are in hebrew
    for(let i=words.length-1; i>=0; i--)
    {
        if(!IsEnglish(words[i]))
        {
            ReversedSentence.push(ReverseString(words[i]));
        }
        else {
            ReversedSentence.push(words[i]);
        }
    }
    return ReversedSentence;
}

//function checks the language:
function IsEnglish(name) {
    let english = new RegExp('^[abcdefghigklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ: ()1234567890.,&@?!-]+$');
    if (english.test(name)) {
        return true;
    } else {
        return false;
    }
}


//Implementing Stack class:
class Stack{
    constructor() {
        this.data = [];
        this.top = 0;
    }
    push(element) {
        this.data[this.top] = element;
        this.top = this.top + 1;
    }
    length() {
        return this.top;
    }
    peek() {
        return this.data[this.top-1];
    }
    isEmpty() {
        return this.top === 0;
    }
    pop() {
        if( this.isEmpty() === false ) {
            this.top = this.top -1;
            return this.data.pop(); // removes the last element
        }
    }
}

//Function handles url params for invoking the service from third party:
function HandleURLParams(url)
{
    var params = {};
    var parser = document.createElement('a');
    parser.href = url;
    var query = parser.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;

    //Usage:
    //getParams(window.location.href);
    //https://ul.waze.com/ul?ll=32.09575621%2C34.81553435&navigate=yes&zoom=17
}


//Check if object in your FOV: and returns if it's on the
//Returns direction of arrow one of the following [right, left, up] and position on screen [0,2] left to right
//left(-1) on the right (+1) or inside POV
function CheckInFOV(camera,object,el) {

    //Check if object exist
    if(object==null) return 0;

    camera.updateMatrix();
    camera.updateMatrixWorld();
    //Create POV frustum:
    var frustum = new THREE.Frustum();
    frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    // 3D point to check
    var pos = new THREE.Vector3(object.position.x, object.position.y, object.position.z);

    //Create laser to the object to measure the delta angle:
    laser.lookAt(pos);
    let laser_rot = new THREE.Vector3(laser.rotation.x,laser.rotation.y,laser.rotation.z);

    let dangle_y = laser_rot.y*180/3.14;
    let dangle_x = laser_rot.x*180/3.14;//pitch: [-90,..,-180,180,..,90]
    let dangle_z = laser_rot.z*180/3.14;
    laser.rotation.x=0;
    laser.rotation.y=0;
    laser.rotation.z=0;

    const FOVcamera = 75;//is defined in perspecive camera at index.html
    //Check if outside of frustum:
    if (!frustum.containsPoint(pos)) {

      //If screen is loock downwards:
      if(Math.sign(dangle_x) == -1){
        if((dangle_x > (-180 + FOVcamera/2)) && (dangle_x< -95 )){
          let pos_ = dangle_y/(FOVcamera/2)+1;//dangle_y is [-FOVcamera/2,FOVcamera/2]
          el.innerHTML = `Outside of FOV dy=${dangle_y.toFixed(1)}, dx=${dangle_x.toFixed(1)}, dz=${dangle_z.toFixed(1)}, pos=${pos_.toFixed(1)}`;
          return {direction: 'up', position:pos_ };//put arrow up, position is [0,2] where 0 is most left and 2 most right
        }
      }
      el.innerHTML = `Outside of FOV dy=${dangle_y.toFixed(1)}, dx=${dangle_x.toFixed(1)}, dz=${dangle_z.toFixed(1)}`;
      //If the marker is not higher than frustum,check if on his left or right:
      if(Math.sign(dangle_y) == -1) return {direction: 'right',position: 0};//object is on the right put arrow right
      if(Math.sign(dangle_y) == 1) return {direction: 'left',position: 2};//object is on the left, put arrow left
      //return Math.sign(dangle_y); //y: right +1 left -1, x: up: -1
    }else{
      //el.innerHTML = "Inside of FOV"
      el.innerHTML = `Inside of FOV dy=${dangle_y.toFixed(1)}, dx=${dangle_x.toFixed(1)}, dz=${dangle_z.toFixed(1)}`;
      return {direction: 'inside',position:0};
    }
  }


//Create arrow to point to marker which outside the POV
var arrow = document.querySelector('.arrow-wrapper');
var arrowTop = document.querySelector('.arrow.top');
var w_width = window.innerWidth - arrowTop.clientWidth - 10;
function changeArrow(dir) {

  if(dir.direction == 'up'){
    arrowTop.style.display = '';
    arrowTop.style.transform = '';
    arrowTop.style.right = '';

    //If the marker is inside the box but higher than furstrum:
    if(dir.position>0 && dir.position<=2){
      let pos_left = (dir.position/2)*w_width;//position from high left corner of screen (position is [0,2])
      arrowTop.style.left = pos_left + 'px';
    }
    else { //Marker is way outside -  use diagonal arrow and put it on the left / right corner
      if (dir.position < 0) { //Place left
        arrowTop.style.left = '10px';
        arrowTop.style.transform = 'rotate(50deg)';
      }
      if (dir.position > 2) { //Place right
        arrowTop.style.left = 'auto';
        arrowTop.style.right = '10px';
        arrowTop.style.transform = 'rotate(140deg)';
      }
    }
    arrow.style.display = 'none';
    return;
  }
  else {
    if (dir.direction == 'left') {
      arrow.style.display = '';
      arrow.style.transform = 'scale(-1, 1)';
    }
    else if (dir.direction == 'right') {
      arrow.style.display = '';
      arrow.style.transform = 'scale(1, 1)';
    }
    else {
      arrow.style.display = 'none';
    }

    arrowTop.style.display = 'none';
  }
}

function copy(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

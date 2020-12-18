//Globals:
const Scale = 1000;//scale km to pixel
var velocity = {curr: 0, prev: 0, prev_prev: 0};
var position = {x: 0, y: 0, z: 0};
var bearing = {curr: 0, prev: 0};
var acceleration = 0;
var delta_dist = 0;
var d_err = 0;
var invalid_motion_type_time = 0;

var positionGPS = {lat: 0, lon: 0, last_lat: 0, last_lon: 0};
var next_pos=null;//ist Vector3 represents next position we got from gps in [km*Scale] metrics

var data = {crd_lat: 0, crd_lon: 0, crd_accuracy: 0}; //TBD refactoring
var crd = {latitude: 0, longitude: 0, accuracy: 0};//return from callback
var LastDeviceGPS = {lat: 0, lon: 0, accuracy: 0};

var CenterPos = {lat: 0, lon: 0}; //new Location(31.3365254f, 34.8968868f)
var time_since_last_update = 0;
var scene_time = 0;//in seconds since start of scene
var State = -1;
//comp_ptr: null,
var dbg = {Pos: null, STATS: null, camera_wrapper: null};//dbg ptrs
var dbg_delta_time_frame = 0;
/*options : { //location options
enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
},
*/

var init_bearing = null; //array used for initial gps test
var init_vel = null;//array used for initial gps test
var init_iteration = 0;//number of iterations for init location
var init_time_interval = 0; //time in seconds between gps location signals
var id_watch = null;

var last_time = 0; //last time in [seconds] from 1970

//GPS simulation:
var GPS_sim = {
  sign_x: [0, -1, 0, 1],
  sign_y: [1, 0, -1, 0],
  LWdlt_time: 0, //[sec]hold last time since last request from linear walk
  leg_cnt: 1,
  s_ind: 0,
  IsOn: true,
  SIM_D_SEC: 1
};


//Function initializes movement params
function InitMovement() {
  LastDeviceGPS.lat = 0;
  LastDeviceGPS.lon = 0;

  //Update the world center position and setup params:
  CenterPos.lat = 32.159106367661465;
  CenterPos.lon = 34.80578701716976;
  GPS_sim.IsOn = false;


  //If there is gps simulation:
  if (this.GPS_sim.IsOn) {
    positionGPS.last_lat = CenterPos.lat;
    positionGPS.last_lon = CenterPos.lon;
    positionGPS.lat = CenterPos.lat;
    positionGPS.lon = CenterPos.lon;
    //Set interval calling
    setInterval(UpdatePos, GPS_sim.SIM_D_SEC * 1000);
  } else { //If not simulation:
    //Bind location handling functions:
    //Pass global function to handle the event of geoposition:
    id_watch = navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, this.options);
  }

  //Debug ptrs:
  //dbg.Pos = document.getElementById("Pos");
  //dbg.STATS = document.getElementById("STATS");
  //dbg.camera_wrapper = document.getElementById("camera_wrapper");
  window.addEventListener('gps-coord-set', () => {
    console.log('Location initialized and stable')
  });
}


//If success in getCurrent position:
function nav_geo_success(pos) {
  var crd_ = pos.coords;
  document.getElementById("GPSloc").innerHTML = 'GPS:' +
    `{LAT:${crd_.latitude.toFixed(8)},` + `LON:${crd_.longitude.toFixed(8)}} `
    + `Accuracy:${crd_.accuracy.toFixed(1)} meters`;

  //Check accuracy:
  if (crd_.accuracy > 65) { // If accuracy is less than 30 meters
    toggleAlert(true);
  } else {
    toggleAlert(false);
  }

  if ((!isNaN(crd_.latitude)) && (!isNaN(crd_.longitude))) {
    data.crd_lat = pos.coords.latitude;
    data.crd_lon = pos.coords.longitude;
    data.crd_accuracy = pos.accuracy;
    //Get current time in [sec]
    //let dtime = new Date();
    //let time_vel_delta = dtime - last_time;
    UpdatePos();
  }
}


//Alert for low GPS signal
function toggleAlert(boolean) {
  if (boolean) {
    document.querySelector('.alert').classList.add('visible');
  } else {
    document.querySelector('.alert').classList.remove('visible');
  }
}

//If fail in get current position:
function nav_geo_error(err) {
  //navigator.geolocation.getCurrentPosition(showPosition); //Getting GPS location using device only
  document.getElementById("GPSloc").innerHTML = "No location provided!" + `ERROR(${err.code}): 
    ${err.message}`;
  //error('Oops! Turn on "High Precision" location in Settings.');
  toggleAlert(true);
}


//Function interpulates position between vector v1 to vector v2 in n_step steps
//Returns the next position - mid_position:
//Usage:
//In function animate:
//Current position
//let v1 = new THREE.Vector3(obj.position.x,obj.position.y,obj.position.z);
//Target position
//let v2 = new THREE.Vector3(res.x,res.y,res.z);
//Number of steps to transition  - configuration
//let num_steps = 100;//1% in frame render
//SmoothMotion(v1, v2, 20)
//Globals:
var curr_step = 0; //is midposition between to points
var last_vb = null;
var last_mid_pos = null;

function SmoothMotion(va,vb,num_steps) {
  //If in the middle of interpulation the destination moved,
  //We will start from the finish and update the new destination position with same step
  if (last_vb != null) {
    if (!last_vb.equals(vb)) {
      curr_step = 0;
      last_vb = vb;
      return last_mid_pos;
    }
  }else{
    last_vb = vb;
  }
  //Update the alpha (percent/100 of final value)
  let alpha = curr_step / num_steps;

  //If we've reached the target:
  if (alpha > 1) {
    curr_step = 0;
    last_mid_pos =vb;
    return last_mid_pos;
  } else { //not yet reached the target
    curr_step++;
    last_mid_pos =va.lerp(vb, alpha);
    return last_mid_pos;
  }
}


//Update velocity:
function UpdateVel() {
  this.velocity.prev = 0;
  this.velocity.curr = 0;
  this.bearing.prev = 0;
  this.bearing.curr = 0;
  return;
}


//Get GPS position location:
function GetGPSLoc() {
  //If GPS simulation is on:
  if (GPS_sim.IsOn) {
    let sim_pos = LinearWalk((scene_time), positionGPS);
    positionGPS.last_lat = positionGPS.lat;
    positionGPS.last_lon = positionGPS.lon;
    positionGPS.lat = sim_pos.lat_;
    positionGPS.lon = sim_pos.lon_;

    data.crd_lat = sim_pos.lat_;
    data.crd_lon = sim_pos.lon_;

    if (State != 1) {
      SetInitPosPlayer(positionGPS, CenterPos);
      //Dispatch event that the GPS position is confirmed:
      //gps-coord-set
      State = 1;
      LastDeviceGPS.accuracy = 3;//[m]
    }

    document.getElementById("GPSloc").innerHTML = 'GPS:' +
      `{SIM:LAT:${this.positionGPS.lat.toFixed(6)},` +
      `LON:${this.positionGPS.lon.toFixed(6)}}
                CNTR:{${this.CenterPos.lat.toFixed((6))},${this.CenterPos.lon.toFixed((6))}}`;
    return;
  }

  //If real GPS signal is available:
  LastDeviceGPS.lat = data.crd_lat;
  LastDeviceGPS.lon = data.crd_lon;
  LastDeviceGPS.accuracy = (data.crd_accuracy < 3) ? 3 : data.crd_accuracy;
  positionGPS.lat = LastDeviceGPS.lat;
  positionGPS.lon = LastDeviceGPS.lon;

  if (data.crd_lat != 0 && data.crd_lon != 0 && State != 1) {
    SetInitPosPlayer(positionGPS, CenterPos);
    //Dispatch event that the GPS position is confirmed:
    State = 1;
    //LastDeviceGPS.accuracy = 3;//[m]
  }
}


//Set initial position for the player in VR space:
function SetInitPosPlayer(PosCoord, WorldCenterPos) {

  //this.data.world_center_lon = PosCoord.lon;
  //this.data.world_center_lat = PosCoord.lat;
  CenterPos.lon = PosCoord.lon;
  CenterPos.lat = PosCoord.lat;

  //Update the global center position:
  GlobCenter.lat = PosCoord.lat; //TBD refactoring - make it the same one
  GlobCenter.lon = PosCoord.lon;

  const z = 1;
  //CameraWrapper.position = new THREE.Vector3(0,z,0);
  CameraWrapper.position.x = 0;
  CameraWrapper.position.y = z;
  CameraWrapper.position.z = 0;

  //Signal that there is gps:
  window.dispatchEvent(new CustomEvent('gps-coord-set',
    {detail: {position: this.CenterPos}}));
}


//Update player position and bearing:
function UpdatePos() {

  //Get GPS position:
  GetGPSLoc();

  //If it's in init state, don't update the position and bearing
  if (State == -1) return;

  //Get current position of camera wrapper:
  let currentPosition = CameraWrapper.position;
  //Get distance to new position:
  let res4 = GetDirection(CenterPos, positionGPS); //[km]
  //Update next position of camera (global variable)
  next_pos = new THREE.Vector3(res4.x * Scale, CameraWrapper.position.y, res4.y * Scale);
  let d_err2 = next_pos.distanceTo(currentPosition);

  let d_err_m = d_err2 * 1000 / Scale;//[meter]
  let LMT = 1;//[meter]

  //If gps moves more than LMT [meters] move the player
  if (d_err_m > LMT) {
    //UpdateCameraPos(next_pos);
    //Signal that there is gps update:
    //if (this.delta_dist > 20)//bigger than 20 meters
    window.dispatchEvent(new CustomEvent('gps-position-update', {}));
  }
}

//Updates current position of player:
function UpdateCameraPos(newPos)
{
  let v_res=null;
  if(newPos!=null) {
    if(!isNaN(CameraWrapper.position.x)) {
      let origin = new THREE.Vector3(CameraWrapper.position.x,CameraWrapper.position.y,CameraWrapper.position.z);
      v_res = SmoothMotion(origin, newPos,100);
    }else{
      v_res = newPos;
    }
    CameraWrapper.position.x = v_res.x;
    CameraWrapper.position.y = v_res.y;
    CameraWrapper.position.z = v_res.z;
  }
}


//Calculate estimated velocity [km/h]: (distance in meters and time delta in seconds)
function calcVel(delta_distance, timeDelta) {
  return (delta_distance) / timeDelta * 3600;//[km/h]
}


//Function calculates the estimated acceleration between given two way points assuming delta time:
function GetAcceleration(prev_vel, next_vel, delta_time) {
  return ((next_vel - prev_vel) / delta_time); //time in [seconds] vel in m/sec
}


//-------------Simulation of GPS signal:
//Function implements Linear walk  - based on the sign array:
function LinearWalk(scene_time, curr_pos) {

  scene_time = new Date();
  //const SIM_D_SEC = 1;
  //const delta_ = 0.0001;//@@ need to check if to make bigger
  //const delta_ = 0.0000015/this.data.Scale;//@@ need to check if to make bigger
  //const delta_ = 0.0001;//is ~40km/h for deltatime=1sec
  const delta_ = 0.000025;//is ~40km/h for deltatime=1sec
  let sign_y = GPS_sim.sign_y;
  let sign_x = GPS_sim.sign_x;
  let lat = 0;
  let lon = 0;
  let leg_cnt = GPS_sim.leg_cnt;
  let s_ind = GPS_sim.s_ind;
  let x = 0;
  let y = 0;

  //if (delta_loc_time_changed > SIM_D_SEC && ((scene_time - this.GPS_sim.LWdlt_time) > SIM_D_SEC)) //LOC_DELTA_TIME_MAX_SIM)

  if ((scene_time - GPS_sim.LWdlt_time) > GPS_sim.SIM_D_SEC) //LOC_DELTA_TIME_MAX_SIM)
  {
    GPS_sim.LWdlt_time = scene_time;
    if (GPS_sim.leg_cnt < 30) {
      y = sign_y[GPS_sim.s_ind] * delta_;
      x = sign_x[GPS_sim.s_ind] * delta_;
      GPS_sim.leg_cnt++;
    } else {
      if (GPS_sim.s_ind < (sign_x.length - 1))
        GPS_sim.s_ind++;
      else
        GPS_sim.s_ind = 0;
      GPS_sim.leg_cnt = 0;
    }

    lat = curr_pos.lat + y;//(+is north)
    lon = curr_pos.lon + x; //("+" is east)
  } else {
    lat = curr_pos.lat;
    lon = curr_pos.lon;
  }
  let res = {lat_: lat, lon_: lon};
  //this.GPS_sim.leg_cnt = this.GPS_sim.leg_cnt;
  //this.GPS_sim.s_ind = s_ind;

  return res;
}


//Function checks if the initial location is ok: //NOT Used
function CheckInitLocation(pos) //Not used
{
  var crd_ = pos.coords;
  document.getElementById("GPSloc").innerHTML = 'GPS:' +
    `{LAT:${crd_.latitude.toFixed(5)},` + `LON:${crd_.longitude.toFixed(5)}} `
    + `Accuracy:${crd_.accuracy.toFixed(1)} meters`;

  //let comp_ptr = document.querySelector('[motion-helper]').components['motion-helper'];
  if ((!isNaN(crd_.latitude)) && (!isNaN(crd_.longitude))) {
    data.crd_lat = pos.coords.latitude;
    data.crd_lon = pos.coords.longitude;
    data.crd_accuracy = pos.accuracy;

  }
  //For 3 itirations understand the movement type:
  if (init_iteration < 4) {
    //for first itiration make center the first reading:
    if (init_iteration == 0) {
      CenterPos = {lat: crd_.latitude, lon: crd_.longitude};
      let dtime = new Date();
      init_time_interval = dtime;
    } else {
      //If its the second/third time
      //Check motion type:
      let GPS_pos = {lat: crd_.latitude, lon: crd_.longitude, last_lat: 0, last_lon: 0};
      let result = GetDirection(CenterPos, GPS_pos);
      let dtime = new Date();
      let time_vel_delta = dtime - init_time_interval;
      init_time_interval = dtime;
      if (GPS_sim.IsOn) time_vel_delta = GPS_sim.SIM_D_SEC;
      let velocity_ = calcVel(result.distance_, time_vel_delta);//in [km/h]
      let jerk_movement = CheckForJerkMovement(result.bearing_);
      if (velocity_ < 200 && !jerk_movement) {
        navigator.geolocation.clearWatch(id_watch);
        navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, options);
      } else {
        if (init_iteration == 3) {
          navigator.geolocation.clearWatch(id_watch);
          navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, options);
        }
      }
    }
  }
}

//Checks if the movement from gps is irradic: //Not used
//bearing is in [deg]
function CheckForJerkMovement(bearing) {
  let jerk_movement = false;
  if (bearing.curr != 0) {
    let bq = new THREE.Quaternion();
    let bq_prev = new THREE.Quaternion();
    bq.setFromEuler(new THREE.Euler(0, bearing * 3.14 / 180, 0));
    bq_prev.setFromEuler(new THREE.Euler(0, this.bearing.curr * 3.14 / 180, 0));
    let dlt = bq.angleTo(bq_prev);
    dlt = Math.round((dlt) / (2 * 3.14) * (2 * 3.14));
    //if(dlt>3.14) dlt = 2*3.14 - dlt;
    jerk_movement = dlt > 80 * 3.14 / 180;
    if (jerk_movement)
      document.getElementById("ERRMSG").innerHTML = `JRKMOVE:(DLTBEARING={${(dlt * 180 / 3.14).toFixed(1)})`;
    else document.getElementById("ERRMSG").innerHTML = `:(DLTBEARING={${(dlt * 180 / 3.14).toFixed(1)})`;
  }
  return jerk_movement;
}


/*
    if(LastDeviceGPS.lat!=0 && LastDeviceGPS.lon!=0) {
        //If this is the first time the GPS is available:
        if (positionGPS.lat == 0 && (positionGPS.lon == 0)) {
            positionGPS.lat = LastDeviceGPS.lat;
            positionGPS.lon = LastDeviceGPS.lon;
            SetInitPosPlayer(positionGPS, CenterPos);
            //Dispatch event that the GPS position is confirmed:
            data.State = 1;//OK
        } else {
            positionGPS.last_lat = positionGPS.lat;
            positionGPS.last_lon = positionGPS.lon;
            positionGPS.lat = LastDeviceGPS.lat;
            positionGPS.lon = LastDeviceGPS.lon;
        }
    }
     */

//If last position is zero, then we are still in init mode:
/*if ((positionGPS.last_lat == 0) && (positionGPS.last_lon == 0)) {
    State = -1;//INIT
} else {
    State = 1;//OK
}
 */
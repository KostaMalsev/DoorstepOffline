/*
 * Camarker (MIT License)
 * world.js
 *
 * Script creates 3d world and CSS2D world
 * and hooks to main.js for rotating 3d camera
 * and placing markers in the 3d world
 * based on data from peer in real time.
 *
 */

//Global size of the window
var gwidth=375;
var gheight=375;


var scene = new THREE.Scene();
//var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
//var camera = new THREE.PerspectiveCamera(60, 375 / 375, 1, 1000);
var camera = new THREE.PerspectiveCamera(60, gwidth / gheight, 0.1, 1000);
camera.position.set(0, 0, 0.1);
var renderer = new THREE.WebGLRenderer({
  alpha: true
});
//renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setSize(gwidth, gheight);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;
renderer.domElement.style.zIndex = 2;

// Create CSS scene:
const scene2 = new THREE.Scene();
scene2.add(camera);

// Create CSS2D renderer:
var cssRenderer = new COOLRenderer();
//cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.setSize(gwidth, gheight);
cssRenderer.domElement.style.position = 'fixed';
cssRenderer.domElement.style.top = 0;
cssRenderer.domElement.style.left = 0;
cssRenderer.domElement.style.cursor = 'pointer';
cssRenderer.domElement.style.zIndex = 3;
//cssRenderer.domElement.onclick = clickedOnScreen;
document.body.appendChild(cssRenderer.domElement);

// Create plane at z position of "-5" in front of the camera
var normal = new THREE.Vector3(0, 0, -1);
var center = new THREE.Vector3();
var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);

// Align the geometry to the plane
// Create a basic rectangle geometry
var planeGeometry = new THREE.PlaneGeometry(0, 0);
var coplanarPoint = plane.coplanarPoint();
var focalPoint = new THREE.Vector3().copy(coplanarPoint).add(plane.normal);
planeGeometry.lookAt(focalPoint);
planeGeometry.translate(coplanarPoint.x, coplanarPoint.y, coplanarPoint.z);

// Draw reference blue plane
/*const material2 = new THREE.MeshBasicMaterial({
  color: 'blue',
  side: THREE.DoubleSide
}); //MeshLambertMaterial
const mesh1 = new THREE.Mesh(planeGeometry, material2);
mesh1.rotation.x = 0;
mesh1.position.y = 0;
mesh1.position.z = 50;
mesh1.position.x = 0;
scene.add(mesh1);*/

// Create forward plane (to tap on)
const material1 = new THREE.MeshBasicMaterial({
  color: 0x000000,
  alphaTest: 0,
  visible: false
});
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth, window.innerHeight), material1);
mesh.rotation.x = 0;
mesh.position.y = 0;
mesh.position.z = -10//-0.5;//-10; //-80
mesh.position.x = 0;

// Bind the plane with roating camera
let pivot_ = new THREE.Object3D();
pivot_.position.z = 0;
camera.add(mesh)
camera.add(pivot_)
scene.add(camera)

//Create device binded controls:
//They will listen also to rotation from net
var DevControls = new DeviceOrientationController(camera, cssRenderer.domElement);
DevControls.connect();

// Set resize (reshape) callback
window.addEventListener('resize', resize);

// Create raycaster
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var tempRadius = new THREE.Vector3();

// Sample mouse readings
function setMouse(event) {
  //mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  mouse.x = (event.mouseX / gwidth) * 2 - 1;
  mouse.y = -(event.mouseY / gheight) * 2 + 1;
}

//Set raycaster from camera:
function setRaycaster(event) {
  setMouse(event);
  raycaster.setFromCamera(mouse, camera);
}

// Function gets intersection with the plane and draw markers
function clickedOnScreen(event) {
  setRaycaster(event);
  var intersects = raycaster.intersectObjects(scene.children, true);

  //console.log('clicked', intersects);
  //logMessage("Got click.");

  // If we got intersection, make a marker on xyz point
  if (intersects.length > 0) {
    let pt = {
      x: intersects[0].point.x,
      y: intersects[0].point.y,
      z: intersects[0].point.z
    };
    createPoint(pt);
    sendMarker(pt);
  }
}

//Create marker on mobile and stationary client:
function createPoint(pt) {
  // Create CSS2D object:
  var element1 = document.createElement('div');
  element1.classList = 'marker';

  // Create CSS element:
  var vricon = new COOLObject(element1);

  scene2.add(vricon);
  vricon.position.x = pt.x; //intersects[0].point.x;
  vricon.position.y = pt.y; //intersects[0].point.y;
  vricon.position.z = pt.z; //intersects[0].point.z + 0.1;

  setTimeout(() => {
    scene2.remove(vricon);
  }, 15000);
}

// Drag (hook with main.js)

var currentX;//last mouse/finger down reading
var initialX; //first mouse down reading in drag mode
var xOffset = 0;

var active = false;
var click = false;
var swiped = false;

var direction = 0;

cssRenderer.domElement.addEventListener("touchstart", dragStart, false);
cssRenderer.domElement.addEventListener("touchend", dragEnd, false);
cssRenderer.domElement.addEventListener("touchmove", drag, false);

cssRenderer.domElement.addEventListener("mousedown", dragStart, false);
cssRenderer.domElement.addEventListener("mouseup", dragEnd, false);
cssRenderer.domElement.addEventListener("mousemove", drag, false);

//Function gets mouse/finger down event
function dragStart(e) {
  if (e.type === "touchstart") {
    initialX = e.touches[0].clientX - xOffset;
  } else {
    initialX = e.clientX - xOffset;
  }

  active = true;
  click = true;
  swiped = false;
}

//Function gets mouse/finger up event
function dragEnd(e) {

  xOffset = 0;
  //initialX = currentX;

  var mouseEvent = {};
  if (e.type === "touchend") {
    mouseEvent.mouseX = e.touches[0].clientX;
    mouseEvent.mouseY = e.touches[0].clientY;
  } else {
    mouseEvent.mouseX = e.clientX;
    mouseEvent.mouseY = e.clientY;
  }

  //If it's a simple click, send marker to slave
  if (click == true) {
    clickedOnScreen(mouseEvent);
  }
  //Currently dragging state is false (finished dragging)
  active = false;
}

//Function called upon drag event
function drag(e) {
  if (active) {
    //prevent default dragging behavior (like dragging screen)
    e.preventDefault();

    //If the device is mobile:
    if (e.type === "touchmove") {
      currentX = e.touches[0].clientX - initialX;
    } else {
      currentX = e.clientX - initialX;
    }

    //XOffset is delta in pixels from start drag event
    xOffset = currentX;

    //If Direction is 'right'
    if (xOffset < 0) {
      direction = -1;
    }
    else { //if direction is left
      direction = 1;
    }

    //If mouse/finger drags less than threshold don't direction //TBD - consider removing
    if (Math.abs(xOffset) < 30) {
      direction = 0;
    }

    if (direction == 1 && swiped == false) {
      //Draw right blue bar on master and send message to slave
      sendNav(0);
      swiped = true;
    } else if (direction == -1 && swiped == false) {
      //Draw left blue bar on master and send to slave
      sendNav(1);
      swiped = true;
    }

    /*if (swiped == false) {
      message.innerHTML = 'Started swiping';
    }*/

    click = false;
  }
}

function resize() {
  /*
  width = window.innerWidth;
  height = window.innerHeight;
  camera.right = width;
  camera.bottom = height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  cssRenderer.setSize(width, height);
  render();*/
}

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
  cssRenderer.render(scene2, camera);
  DevControls.update();
}

render();

// Rotate camera with pitch, roll, yual
function rotateCamera(data) {
  updateRotationTo(data)
}

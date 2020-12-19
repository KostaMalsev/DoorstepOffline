//Implements monitor for supporter (stationary client):
//Rotation of the invisible camera is given by network from mobile client


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 0.1);
var renderer = new THREE.WebGLRenderer( { alpha: true } );
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;
renderer.domElement.style.zIndex = 2;

// Create CSS scene:
const scene2 = new THREE.Scene();
scene2.add(camera);

// Create CSS2D renderer:
var cssRenderer = new CSS2DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'fixed';
cssRenderer.domElement.style.top = 0;
cssRenderer.domElement.style.left = 0;
cssRenderer.domElement.style.zIndex = 3;
document.body.appendChild(cssRenderer.domElement);

// Create plane at z position of "-5" in front of the camera
var normal = new THREE.Vector3(0, 0, -1);
var center = new THREE.Vector3();
var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal,center);

// Align the geometry to the plane
// Create a basic rectangle geometry
var planeGeometry = new THREE.PlaneGeometry(0, 0);
var coplanarPoint = plane.coplanarPoint();
var focalPoint = new THREE.Vector3().copy(coplanarPoint).add(plane.normal);
planeGeometry.lookAt(focalPoint);
planeGeometry.translate(coplanarPoint.x, coplanarPoint.y, coplanarPoint.z);

// Draw reference blue plane
const material2 = new THREE.MeshBasicMaterial({color: 'blue', side: THREE.DoubleSide});//MeshLambertMaterial
const mesh1 = new THREE.Mesh(planeGeometry, material2);
mesh1.rotation.x = 0;
mesh1.position.y = 0;
mesh1.position.z = 50;
mesh1.position.x = 0;
scene.add(mesh1);

// Create forward plane (to tap on)
const material1 = new THREE.MeshBasicMaterial({color: 0x000000, alphaTest: 0, visible: false});
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth, window.innerHeight), material1);
mesh.rotation.x = 0;
mesh.position.y = 0;
mesh.position.z = -80;
mesh.position.x = 0;

// Bind the plane with roating camera
let pivot_ = new THREE.Object3D();
pivot_.position.z = 0;
camera.add(mesh)
camera.add(pivot_)
scene.add(camera)

cssRenderer.domElement.addEventListener('click', clickedOnScreen);

//Create device binded controls:
//They will listen also to rotation from net
var DevControls = new DeviceOrientationController( camera, renderer.domElement );

// Set resize (reshape) callback
window.addEventListener( 'resize', resize );

// Create raycaster
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var tempRadius = new THREE.Vector3();

// Sample mouse readings
function setMouse(event){
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

//Set raycaster from camera:
function setRaycaster(event){
	setMouse(event);
  raycaster.setFromCamera(mouse, camera);
}

// Function gets intersection with the plane and draw markers
function clickedOnScreen(event) {
  setRaycaster(event);
  var intersects = raycaster.intersectObjects(scene.children, true);

  console.log('clicked', intersects);

  // If we got intersection, make a marker on xyz point
  if (intersects.length > 0) {
    createPoint(intersects);
    sendMarker(intersects);
  }
}

function createPoint(intersects) {
  // Create CSS2D object:
  var element1 = document.createElement('div');
  element1.classList = 'marker';

  // Create CSS element:
  var vricon = new CSS2DObject(element1);

  scene2.add(vricon);
  vricon.position.x = intersects[0].point.x;
  vricon.position.y = intersects[0].point.y;
  vricon.position.z = intersects[0].point.z + 0.1;
}

function resize() {
	width = window.innerWidth;
	height = window.innerHeight;
	camera.right = width;
	camera.bottom = height;
	camera.updateProjectionMatrix();
	renderer.setSize(width,height);
  cssRenderer.setSize(width,height);
	render();
}

// Rotate camera with pitch, roll, yual
function rotateCamera(data) {
  //Send custom event to udpate rotation
  window.dispatchEvent(new CustomEvent('rotation-is-set',
                  {event:{alpha: data.alpha, beta:data.beta,gamma:data.gamma}}));

  //camera.rotation.x = -data.gamma*3.14/180;//pitch
  //camera.rotation.y = data.alpha*3.14/180;//azimuth
  //camera.rotation.z = -data.beta*3.14/180; //roll
}

function render(){
	requestAnimationFrame(render);
  renderer.render(scene, camera);
  cssRenderer.render(scene2, camera);
}

render();

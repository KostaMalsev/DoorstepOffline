var CSS2DObject = function ( element ) {

    THREE.Object3D.call( this );

    this.element = element || document.createElement( 'div' );

    this.element.style.position = 'absolute';

    this.addEventListener( 'removed', function () {

        this.traverse( function ( object ) {

            if ( object.element instanceof Element && object.element.parentNode !== null ) {

                object.element.parentNode.removeChild( object.element );

            }

        } );

    } );

};

CSS2DObject.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {

    constructor: CSS2DObject,

    copy: function ( source, recursive ) {

        THREE.Object3D.prototype.copy.call( this, source, recursive );

        this.element = source.element.cloneNode( true );

        return this;

    }

});

var CSS2DRenderer = function () {

    var _this = this;

    var _width, _height;
    var _widthHalf, _heightHalf;

    var vector = new THREE.Vector3();
    var viewMatrix = new THREE.Matrix4();
    var viewProjectionMatrix = new THREE.Matrix4();

    var cache = {
        objects: new WeakMap()
    };

    var domElement = document.createElement( 'div' );
    domElement.style.overflow = 'hidden';

    this.domElement = domElement;

    this.getSize = function () {

        return {
            width: _width,
            height: _height
        };

    };

    this.setSize = function ( width, height ) {

        _width = width;
        _height = height;

        _widthHalf = _width / 2;
        _heightHalf = _height / 2;

        domElement.style.width = width + 'px';
        domElement.style.height = height + 'px';

    };

    var renderObject = function ( object, scene, camera ) {

        if ( object instanceof CSS2DObject ) {

            object.onBeforeRender( _this, scene, camera );

            vector.setFromMatrixPosition( object.matrixWorld );
            vector.applyMatrix4( viewProjectionMatrix );

            var element = object.element;
            var style = 'translate(-50%,-50%) translate(' + ( vector.x * _widthHalf + _widthHalf ) + 'px,' + ( - vector.y * _heightHalf + _heightHalf ) + 'px)';

            element.style.WebkitTransform = style;
            element.style.MozTransform = style;
            element.style.oTransform = style;
            element.style.transform = style;

            element.style.display = ( object.visible && vector.z >= - 1 && vector.z <= 1 ) ? '' : 'none';

            var objectData = {
                distanceToCameraSquared: getDistanceToSquared( camera, object )
            };

            cache.objects.set( object, objectData );

            if ( element.parentNode !== domElement ) {

                domElement.appendChild( element );

            }

            object.onAfterRender( _this, scene, camera );

        }

        for ( var i = 0, l = object.children.length; i < l; i ++ ) {

            renderObject( object.children[ i ], scene, camera );

        }

    };

    var getDistanceToSquared = function () {

        var a = new THREE.Vector3();
        var b = new THREE.Vector3();

        return function ( object1, object2 ) {

            a.setFromMatrixPosition( object1.matrixWorld );
            b.setFromMatrixPosition( object2.matrixWorld );

            return a.distanceToSquared( b );

        };

    }();

    var filterAndFlatten = function ( scene ) {

        var result = [];

        scene.traverse( function ( object ) {

            if ( object instanceof CSS2DObject ) result.push( object );

        } );

        return result;

    };

    var zOrder = function ( scene ) {

        var sorted = filterAndFlatten( scene ).sort( function ( a, b ) {

            var distanceA = cache.objects.get( a ).distanceToCameraSquared;
            var distanceB = cache.objects.get( b ).distanceToCameraSquared;

            return distanceA - distanceB;

        } );

        var zMax = sorted.length;

        for ( var i = 0, l = sorted.length; i < l; i ++ ) {

            sorted[ i ].element.style.zIndex = zMax - i;

        }

    };

    this.render = function ( scene, camera ) {

        if ( scene.autoUpdate === true ) scene.updateMatrixWorld();
        if ( camera.parent === null ) camera.updateMatrixWorld();

        viewMatrix.copy( camera.matrixWorldInverse );
        viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, viewMatrix );

        renderObject( scene, scene, camera );
        zOrder( scene );

    };

};
/*
 * Camarker (MIT License)
 * DeviceOrientationController.js
 *
 * Modified version of threeVR (https://github.com/richtr/threeVR)
 * By Rich Tibbett (MIT License)
 *
 * W3C Device Orientation control (http://www.w3.org/TR/orientation-event/)
 * with manual user drag (rotate) and pinch (zoom) override handling
 *
 */

// Check for mobile device
let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

// Retrieve parameter "?room=" from url
var url = new URL(window.location.href);
var peerId = url.searchParams.get('room');

var DeviceOrientationController = function(object, domElement) {

  this.object = object;
  this.element = domElement || document;

  this.freeze = true;

  this.enableManualDrag = true; // enable manual user drag override control by default
  this.enableManualZoom = true; // enable manual user zoom override control by default

  this.useQuaternions = true; // use quaternions for orientation calculation by default

  this.deviceOrientation = {};
  this.screenOrientation = window.orientation || 0;

  // Manual rotate override components
  var startX = 0,
    startY = 0,
    currentX = 0,
    currentY = 0,
    scrollSpeedX, scrollSpeedY,
    tmpQuat = new THREE.Quaternion();

  // Manual zoom override components
  var zoomStart = 1,
    zoomCurrent = 1,
    zoomP1 = new THREE.Vector2(),
    zoomP2 = new THREE.Vector2(),
    tmpFOV;

  var CONTROLLER_STATE = {
    AUTO: 0,
    MANUAL_ROTATE: 1,
    MANUAL_ZOOM: 2
  };

  var appState = CONTROLLER_STATE.AUTO;

  var CONTROLLER_EVENT = {
    CALIBRATE_COMPASS: 'compassneedscalibration',
    SCREEN_ORIENTATION: 'orientationchange',
    MANUAL_CONTROL: 'userinteraction', // userinteractionstart, userinteractionend
    ZOOM_CONTROL: 'zoom', // zoomstart, zoomend
    ROTATE_CONTROL: 'rotate', // rotatestart, rotateend
  };

  // Consistent Object Field-Of-View fix components
  var startClientHeight = window.innerHeight,
    startFOVFrustrumHeight = 2000 * Math.tan(THREE.Math.degToRad((this.object.fov || 75) / 2)),
    relativeFOVFrustrumHeight, relativeVerticalFOV;

  var deviceQuat = new THREE.Quaternion();

  var fireEvent = function() {
    var eventData;

    return function(name) {
      eventData = arguments || {};

      eventData.type = name;
      eventData.target = this;

      this.dispatchEvent(eventData);
    }.bind(this);
  }.bind(this)();

  this.constrainObjectFOV = function() {
    relativeFOVFrustrumHeight = startFOVFrustrumHeight * (window.innerHeight / startClientHeight);

    relativeVerticalFOV = THREE.Math.radToDeg(2 * Math.atan(relativeFOVFrustrumHeight / 2000));

    this.object.fov = relativeVerticalFOV;
  }.bind(this);

  this.onDeviceOrientationChange = function(event) {
    this.deviceOrientation = event;
    //document.getElementById("Logs").innerHTML = `${event}`;
    //document.getElementById("Rotation").innerHTML = `${event.alpha}`;

  }.bind(this);

  this.onScreenOrientationChange = function() {
    this.screenOrientation = window.orientation || 0;

    fireEvent(CONTROLLER_EVENT.SCREEN_ORIENTATION);
  }.bind(this);

  this.onCompassNeedsCalibration = function(event) {
    event.preventDefault();

    fireEvent(CONTROLLER_EVENT.CALIBRATE_COMPASS);
  }.bind(this);

  this.onDocumentMouseDown = function(event) {
    if (this.enableManualDrag !== true) return;

    event.preventDefault();

    appState = CONTROLLER_STATE.MANUAL_ROTATE;

    this.freeze = true;

    tmpQuat.copy(this.object.quaternion);

    startX = currentX = event.pageX;
    startY = currentY = event.pageY;

    // Set consistent scroll speed based on current viewport width/height
    scrollSpeedX = (1200 / window.innerWidth) * 0.2;
    scrollSpeedY = (800 / window.innerHeight) * 0.2;

    this.element.addEventListener('mousemove', this.onDocumentMouseMove, false);
    this.element.addEventListener('mouseup', this.onDocumentMouseUp, false);

    fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'start');
    fireEvent(CONTROLLER_EVENT.ROTATE_CONTROL + 'start');
  }.bind(this);

  this.onDocumentMouseMove = function(event) {
    currentX = event.pageX;
    currentY = event.pageY;
  }.bind(this);

  this.onDocumentMouseUp = function(event) {
    this.element.removeEventListener('mousemove', this.onDocumentMouseMove, false);
    this.element.removeEventListener('mouseup', this.onDocumentMouseUp, false);

    appState = CONTROLLER_STATE.AUTO;

    this.freeze = false;

    fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'end');
    fireEvent(CONTROLLER_EVENT.ROTATE_CONTROL + 'end');
  }.bind(this);

  this.onDocumentTouchStart = function(event) {
    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1: // ROTATE
        if (this.enableManualDrag !== true) return;

        appState = CONTROLLER_STATE.MANUAL_ROTATE;

        this.freeze = true;

        tmpQuat.copy(this.object.quaternion);

        startX = currentX = event.touches[0].pageX;
        startY = currentY = event.touches[0].pageY;

        // Set consistent scroll speed based on current viewport width/height
        scrollSpeedX = (1200 / window.innerWidth) * 0.1;
        scrollSpeedY = (800 / window.innerHeight) * 0.1;

        this.element.addEventListener('touchmove', this.onDocumentTouchMove, false);
        this.element.addEventListener('touchend', this.onDocumentTouchEnd, false);

        fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'start');
        fireEvent(CONTROLLER_EVENT.ROTATE_CONTROL + 'start');

        break;

      case 2: // ZOOM
        if (this.enableManualZoom !== true) return;

        appState = CONTROLLER_STATE.MANUAL_ZOOM;

        this.freeze = true;

        tmpFOV = this.object.fov;

        zoomP1.set(event.touches[0].pageX, event.touches[0].pageY);
        zoomP2.set(event.touches[1].pageX, event.touches[1].pageY);

        zoomStart = zoomCurrent = zoomP1.distanceTo(zoomP2);

        this.element.addEventListener('touchmove', this.onDocumentTouchMove, false);
        this.element.addEventListener('touchend', this.onDocumentTouchEnd, false);

        fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'start');
        fireEvent(CONTROLLER_EVENT.ZOOM_CONTROL + 'start');

        break;
    }
  }.bind(this);

  this.onDocumentTouchMove = function(event) {
    switch (event.touches.length) {
      case 1:
        currentX = event.touches[0].pageX;
        currentY = event.touches[0].pageY;
        break;

      case 2:
        zoomP1.set(event.touches[0].pageX, event.touches[0].pageY);
        zoomP2.set(event.touches[1].pageX, event.touches[1].pageY);
        break;
    }
  }.bind(this);

  this.onDocumentTouchEnd = function(event) {
    this.element.removeEventListener('touchmove', this.onDocumentTouchMove, false);
    this.element.removeEventListener('touchend', this.onDocumentTouchEnd, false);

    if (appState === CONTROLLER_STATE.MANUAL_ROTATE) {

      appState = CONTROLLER_STATE.AUTO; // reset control state

      this.freeze = false;

      fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'end');
      fireEvent(CONTROLLER_EVENT.ROTATE_CONTROL + 'end');

    } else if (appState === CONTROLLER_STATE.MANUAL_ZOOM) {

      this.constrainObjectFOV(); // re-instate original object FOV

      appState = CONTROLLER_STATE.AUTO; // reset control state

      this.freeze = false;

      fireEvent(CONTROLLER_EVENT.MANUAL_CONTROL + 'end');
      fireEvent(CONTROLLER_EVENT.ZOOM_CONTROL + 'end');

    }
  }.bind(this);

  var createQuaternion = function() {

    var finalQuaternion = new THREE.Quaternion();

    var deviceEuler = new THREE.Euler();

    var screenTransform = new THREE.Quaternion();

    var worldTransform = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

    var minusHalfAngle = 0;

    return function(alpha, beta, gamma, screenOrientation) {

      deviceEuler.set(beta, alpha, -gamma, 'YXZ');

      finalQuaternion.setFromEuler(deviceEuler);

      minusHalfAngle = -screenOrientation / 2;

      screenTransform.set(0, Math.sin(minusHalfAngle), 0, Math.cos(minusHalfAngle));

      finalQuaternion.multiply(screenTransform);

      finalQuaternion.multiply(worldTransform);

      return finalQuaternion;

    }

  }();

  var createRotationMatrix = function() {

    var finalMatrix = new THREE.Matrix4();

    var deviceEuler = new THREE.Euler();
    var screenEuler = new THREE.Euler();
    var worldEuler = new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'); // - PI/2 around the x-axis

    var screenTransform = new THREE.Matrix4();

    var worldTransform = new THREE.Matrix4();
    worldTransform.makeRotationFromEuler(worldEuler);

    return function(alpha, beta, gamma, screenOrientation) {

      deviceEuler.set(beta, alpha, -gamma, 'YXZ');

      finalMatrix.identity();

      finalMatrix.makeRotationFromEuler(deviceEuler);

      screenEuler.set(0, -screenOrientation, 0, 'YXZ');

      screenTransform.identity();

      screenTransform.makeRotationFromEuler(screenEuler);

      finalMatrix.multiply(screenTransform);

      finalMatrix.multiply(worldTransform);

      return finalMatrix;

    }

  }();

  this.updateManualMove = function() {

    var lat, lon;
    var phi, theta;

    var rotation = new THREE.Euler(0, 0, 0, 'YXZ');

    var rotQuat = new THREE.Quaternion();
    var objQuat = new THREE.Quaternion();

    var tmpZ, objZ, realZ;

    var zoomFactor, minZoomFactor = 1; // maxZoomFactor = Infinity

    return function() {

      objQuat.copy(tmpQuat);

      if (appState === CONTROLLER_STATE.MANUAL_ROTATE) {

        lat = (startY - currentY) * scrollSpeedY;
        lon = (startX - currentX) * scrollSpeedX;

        phi = THREE.Math.degToRad(lat);
        theta = THREE.Math.degToRad(lon);

        rotQuat.set(0, Math.sin(theta / 2), 0, Math.cos(theta / 2));

        objQuat.multiply(rotQuat);

        rotQuat.set(Math.sin(phi / 2), 0, 0, Math.cos(phi / 2));

        objQuat.multiply(rotQuat);

        // Remove introduced z-axis rotation and add device's current z-axis rotation

        tmpZ = rotation.setFromQuaternion(tmpQuat, 'YXZ').z;
        objZ = rotation.setFromQuaternion(objQuat, 'YXZ').z;
        realZ = rotation.setFromQuaternion(deviceQuat || tmpQuat, 'YXZ').z;

        rotQuat.set(0, 0, Math.sin((realZ - tmpZ) / 2), Math.cos((realZ - tmpZ) / 2));

        tmpQuat.multiply(rotQuat);

        rotQuat.set(0, 0, Math.sin((realZ - objZ) / 2), Math.cos((realZ - objZ) / 2));

        objQuat.multiply(rotQuat);

        this.object.quaternion.copy(objQuat);

      } else if (appState === CONTROLLER_STATE.MANUAL_ZOOM) {

        zoomCurrent = zoomP1.distanceTo(zoomP2);

        zoomFactor = zoomStart / zoomCurrent;

        if (zoomFactor <= minZoomFactor) {

          this.object.fov = tmpFOV * zoomFactor;

          this.object.updateProjectionMatrix();

        }

        // Add device's current z-axis rotation

        if (deviceQuat) {

          tmpZ = rotation.setFromQuaternion(tmpQuat, 'YXZ').z;
          realZ = rotation.setFromQuaternion(deviceQuat, 'YXZ').z;

          rotQuat.set(0, 0, Math.sin((realZ - tmpZ) / 2), Math.cos((realZ - tmpZ) / 2));

          tmpQuat.multiply(rotQuat);

          this.object.quaternion.copy(tmpQuat);

        }

      }

    };

  }();


  //Update rotation from net:
  this.UpdateRotFromNet = function(e) {

    //Remove touch events of mouse when is controlled by net
    window.removeEventListener('resize', this.onDocumentMouseDown, false);
    window.removeEventListener('resize', this.onDocumentTouchStart, false);

    this.deviceOrientation.alpha = e.detail.alpha;
    this.deviceOrientation.beta = e.detail.beta;
    this.deviceOrientation.gamma = e.detail.gamma;

    // Update rotation with new data
    this.updateDeviceMove();
  }.bind(this);


  this.updateDeviceMove = function() {

    var alpha, beta, gamma, orient;

    var deviceMatrix;

    return function() {

      alpha = THREE.Math.degToRad(this.deviceOrientation.alpha || 0); // Z
      beta = THREE.Math.degToRad(this.deviceOrientation.beta || 0); // X'
      gamma = THREE.Math.degToRad(this.deviceOrientation.gamma || 0); // Y''
      orient = THREE.Math.degToRad(this.screenOrientation || 0); // O

      // only process non-zero 3-axis data
      if (alpha !== 0 && beta !== 0 && gamma !== 0) {

        if (this.useQuaternions) {

          deviceQuat = createQuaternion(alpha, beta, gamma, orient);

        } else {

          deviceMatrix = createRotationMatrix(alpha, beta, gamma, orient);

          deviceQuat.setFromRotationMatrix(deviceMatrix);

        }

        if (this.freeze) return;

        this.object.quaternion.copy(deviceQuat);

      }

    };

  }();

  this.update = function() {
    this.updateDeviceMove();

    if (appState !== CONTROLLER_STATE.AUTO) {
      this.updateManualMove();
    }
  };


  // Bind controls to events
  this.connect = function() {
    window.addEventListener('resize', this.constrainObjectFOV, false);

    //If is mobile device and creating room, bind orientation bindings:
    if (isMobile && peerId == null) {
      window.addEventListener('orientationchange', this.onScreenOrientationChange, false);
      window.addEventListener('deviceorientation', this.onDeviceOrientationChange, false);
    }
    else {
      //this.element.addEventListener('mousedown', this.onDocumentMouseDown, false);
      //this.element.addEventListener('touchstart', this.onDocumentTouchStart, false);
    }

    window.addEventListener('compassneedscalibration', this.onCompassNeedsCalibration, false);

    // Bind the rotation event from net
    window.addEventListener('rotation-net-set', this.UpdateRotFromNet, false);

    this.freeze = false;
  };

  this.disconnect = function() {
    this.freeze = true;

    window.removeEventListener('resize', this.constrainObjectFOV, false);

    window.removeEventListener('orientationchange', this.onScreenOrientationChange, false);
    window.removeEventListener('deviceorientation', this.onDeviceOrientationChange, false);

    window.removeEventListener('compassneedscalibration', this.onCompassNeedsCalibration, false);

    this.element.removeEventListener('mousedown', this.onDocumentMouseDown, false);
    this.element.removeEventListener('touchstart', this.onDocumentTouchStart, false);
  };

};

DeviceOrientationController.prototype = Object.create(THREE.EventDispatcher.prototype);


// Update rotation from peer
function updateRotationTo(e) {
  window.dispatchEvent(new CustomEvent('rotation-net-set', {
    detail: {
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma
    }
  }));
}
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
var cssRenderer = new CSS2DRenderer();
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
  var vricon = new CSS2DObject(element1);

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
/*
 * Camarker (MIT License)
 * gyro.js
 *
 * Script gets orientation permission
 * and hooks to main.js for passing gyro
 * rotation to peer in real time.
 *
 */

// Flag determines whether orientation granted or not
var orientationGranted = false;

// Function runs when clicked on "Allow" option in HTML prompt
function requestPermission() {
  // Feature detect
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          orientationGranted = true;
          window.addEventListener('deviceorientation', () => {});
        }
      })
      .catch(console.error);
  }
}

/* Hooks for sending orientation data to peer */

// iOS
window.addEventListener("deviceorientation", function (event) {
  var orientationExists = (event != null && event.alpha != null && event.beta != null && event.gamma != null);
  if (orientationExists) {
    orientationGranted = true;

    // Recive orientation data
    // alpha is azimuth, beta is roll, gamma is pitch
    var data = {alpha: event.alpha.toFixed(2), beta: event.beta.toFixed(2), gamma: event.gamma.toFixed(2)};

    // Hook with main.js to pass gyro data to peer
    sendGyroData(data);
  }
});
/*
// Android
window.addEventListener("orientationchange", function (event) { // deviceorientation
//window.addEventListener("deviceorientationabsolute", function (event) {
  var orientationExists = (event != null && event.alpha != null && event.beta != null && event.gamma != null);
  if (orientationExists) {
    orientationGranted = true;

    // Recive orientation data
    // alpha is rotation around z-axis, beta is front back motion, gamma is left to right
    var data = {alpha: event.alpha.toFixed(2), beta: event.beta.toFixed(2), gamma: event.gamma.toFixed(2)};

    // Hook with main.js to pass gyro data to peer
    sendGyroData(data);
  }
});

//Android
window.addEventListener("deviceorientation", function (event) { // deviceorientation
//window.addEventListener("deviceorientationabsolute", function (event) {
  var orientationExists = (event != null && event.alpha != null && event.beta != null && event.gamma != null);
  if (orientationExists) {
    orientationGranted = true;

    // Recive orientation data
    // alpha is rotation around z-axis, beta is front back motion, gamma is left to right
    var data = {alpha: event.alpha.toFixed(2), beta: event.beta.toFixed(2), gamma: event.gamma.toFixed(2)};

    // Hook with main.js to pass gyro data to peer
    sendGyroData(data);
  }
});
*/


// Retrieve parameter "?room=" from url
var url = new URL(window.location.href);
var peerId = url.searchParams.get('room');

// If orientation not granted and creating room
let promptEl = document.querySelector('.prompt-wrapper');
if (orientationGranted == false && peerId == null) {
  // Show prompt
  promptEl.classList.add('visible');
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

function copyLink() {
  var link = window.location.href + '?room=' + document.querySelector('.button').id;
  copy('Your package has arrived. Please direct it to your doorstep:\n' + link);
  document.querySelector('.button').innerHTML = 'Copied';
}

document.querySelector('.button').addEventListener('click', e => {
  copyLink();
})

document.querySelectorAll('.buttons div')[0].addEventListener('click', e => {
  promptEl.classList.remove('visible');
})

document.querySelectorAll('.buttons div')[1].addEventListener('click', e => {
  promptEl.classList.remove('visible');
  requestPermission();
})
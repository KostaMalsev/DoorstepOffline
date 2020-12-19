/**
 * -------
 * threeVR (https://github.com/richtr/threeVR)
 * -------
 *
 * W3C Device Orientation control (http://www.w3.org/TR/orientation-event/)
 * with manual user drag (rotate) and pinch (zoom) override handling
 *
 * Author: Rich Tibbett (http://github.com/richtr)
 * License: The MIT License
 *
 **/

//CHANGE TO SUPPORT orientation event from net:

var DeviceOrientationController = function ( object, domElement ) {

    this.object = object;
    this.element = domElement || document;

    this.freeze = true;

    this.enableManualDrag = true; // enable manual user drag override control by default
    this.enableManualZoom = true; // enable manual user zoom override control by default

    this.useQuaternions = true; // use quaternions for orientation calculation by default

    this.deviceOrientation = {};
    this.screenOrientation = window.orientation || 0;

    // Manual rotate override components
    var startX = 0, startY = 0,
        currentX = 0, currentY = 0,
        scrollSpeedX, scrollSpeedY,
        tmpQuat = new THREE.Quaternion();

    // Manual zoom override components
    var zoomStart = 1, zoomCurrent = 1,
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
        CALIBRATE_COMPASS:  'compassneedscalibration',
        SCREEN_ORIENTATION: 'orientationchange',
        MANUAL_CONTROL:     'userinteraction', // userinteractionstart, userinteractionend
        ZOOM_CONTROL:       'zoom',            // zoomstart, zoomend
        ROTATE_CONTROL:     'rotate',          // rotatestart, rotateend
    };

    // Consistent Object Field-Of-View fix components
    var startClientHeight = window.innerHeight,
        startFOVFrustrumHeight = 2000 * Math.tan( THREE.Math.degToRad( ( this.object.fov || 75 ) / 2 ) ),
        relativeFOVFrustrumHeight, relativeVerticalFOV;

    var deviceQuat = new THREE.Quaternion();

    var fireEvent = function () {
        var eventData;

        return function ( name ) {
            eventData = arguments || {};

            eventData.type = name;
            eventData.target = this;

            this.dispatchEvent( eventData );
        }.bind( this );
    }.bind( this )();

    this.constrainObjectFOV = function () {
        relativeFOVFrustrumHeight = startFOVFrustrumHeight * ( window.innerHeight / startClientHeight );

        relativeVerticalFOV = THREE.Math.radToDeg( 2 * Math.atan( relativeFOVFrustrumHeight / 2000 ) );

        this.object.fov = relativeVerticalFOV;
    }.bind( this );

    this.onDeviceOrientationChange = function ( event ) {
        this.deviceOrientation = event;
        //document.getElementById("Logs").innerHTML = `${event}`;
        //document.getElementById("Rotation").innerHTML = `${event.alpha}`;

    }.bind( this );

    this.onScreenOrientationChange = function () {
        this.screenOrientation = window.orientation || 0;

        fireEvent( CONTROLLER_EVENT.SCREEN_ORIENTATION );
    }.bind( this );

    this.onCompassNeedsCalibration = function ( event ) {
        event.preventDefault();

        fireEvent( CONTROLLER_EVENT.CALIBRATE_COMPASS );
    }.bind( this );

    this.onDocumentMouseDown = function ( event ) {
        if ( this.enableManualDrag !== true ) return;

        event.preventDefault();

        appState = CONTROLLER_STATE.MANUAL_ROTATE;

        this.freeze = true;

        tmpQuat.copy( this.object.quaternion );

        startX = currentX = event.pageX;
        startY = currentY = event.pageY;

        // Set consistent scroll speed based on current viewport width/height
        scrollSpeedX = ( 1200 / window.innerWidth ) * 0.2;
        scrollSpeedY = ( 800 / window.innerHeight ) * 0.2;

        this.element.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
        this.element.addEventListener( 'mouseup', this.onDocumentMouseUp, false );

        fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'start' );
        fireEvent( CONTROLLER_EVENT.ROTATE_CONTROL + 'start' );
    }.bind( this );

    this.onDocumentMouseMove = function ( event ) {
        currentX = event.pageX;
        currentY = event.pageY;
    }.bind( this );

    this.onDocumentMouseUp = function ( event ) {
        this.element.removeEventListener( 'mousemove', this.onDocumentMouseMove, false );
        this.element.removeEventListener( 'mouseup', this.onDocumentMouseUp, false );

        appState = CONTROLLER_STATE.AUTO;

        this.freeze = false;

        fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'end' );
        fireEvent( CONTROLLER_EVENT.ROTATE_CONTROL + 'end' );
    }.bind( this );

    this.onDocumentTouchStart = function ( event ) {
        event.preventDefault();
        event.stopPropagation();

        switch ( event.touches.length ) {
            case 1: // ROTATE
                if ( this.enableManualDrag !== true ) return;

                appState = CONTROLLER_STATE.MANUAL_ROTATE;

                this.freeze = true;

                tmpQuat.copy( this.object.quaternion );

                startX = currentX = event.touches[ 0 ].pageX;
                startY = currentY = event.touches[ 0 ].pageY;

                // Set consistent scroll speed based on current viewport width/height
                scrollSpeedX = ( 1200 / window.innerWidth ) * 0.1;
                scrollSpeedY = ( 800 / window.innerHeight ) * 0.1;

                this.element.addEventListener( 'touchmove', this.onDocumentTouchMove, false );
                this.element.addEventListener( 'touchend', this.onDocumentTouchEnd, false );

                fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'start' );
                fireEvent( CONTROLLER_EVENT.ROTATE_CONTROL + 'start' );

                break;

            case 2: // ZOOM
                if ( this.enableManualZoom !== true ) return;

                appState = CONTROLLER_STATE.MANUAL_ZOOM;

                this.freeze = true;

                tmpFOV = this.object.fov;

                zoomP1.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                zoomP2.set( event.touches[ 1 ].pageX, event.touches[ 1 ].pageY );

                zoomStart = zoomCurrent = zoomP1.distanceTo( zoomP2 );

                this.element.addEventListener( 'touchmove', this.onDocumentTouchMove, false );
                this.element.addEventListener( 'touchend', this.onDocumentTouchEnd, false );

                fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'start' );
                fireEvent( CONTROLLER_EVENT.ZOOM_CONTROL + 'start' );

                break;
        }
    }.bind( this );

    this.onDocumentTouchMove = function ( event ) {
        switch( event.touches.length ) {
            case 1:
                currentX = event.touches[ 0 ].pageX;
                currentY = event.touches[ 0 ].pageY;
                break;

            case 2:
                zoomP1.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                zoomP2.set( event.touches[ 1 ].pageX, event.touches[ 1 ].pageY );
                break;
        }
    }.bind( this );

    this.onDocumentTouchEnd = function ( event ) {
        this.element.removeEventListener( 'touchmove', this.onDocumentTouchMove, false );
        this.element.removeEventListener( 'touchend', this.onDocumentTouchEnd, false );

        if ( appState === CONTROLLER_STATE.MANUAL_ROTATE ) {

            appState = CONTROLLER_STATE.AUTO; // reset control state

            this.freeze = false;

            fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'end' );
            fireEvent( CONTROLLER_EVENT.ROTATE_CONTROL + 'end' );

        } else if ( appState === CONTROLLER_STATE.MANUAL_ZOOM ) {

            this.constrainObjectFOV(); // re-instate original object FOV

            appState = CONTROLLER_STATE.AUTO; // reset control state

            this.freeze = false;

            fireEvent( CONTROLLER_EVENT.MANUAL_CONTROL + 'end' );
            fireEvent( CONTROLLER_EVENT.ZOOM_CONTROL + 'end' );

        }
    }.bind( this );

    var createQuaternion = function () {

        var finalQuaternion = new THREE.Quaternion();

        var deviceEuler = new THREE.Euler();

        var screenTransform = new THREE.Quaternion();

        var worldTransform = new THREE.Quaternion( - Math.sqrt(0.5), 0, 0, Math.sqrt(0.5) ); // - PI/2 around the x-axis

        var minusHalfAngle = 0;

        return function ( alpha, beta, gamma, screenOrientation ) {

            deviceEuler.set( beta, alpha, - gamma, 'YXZ' );

            finalQuaternion.setFromEuler( deviceEuler );

            minusHalfAngle = - screenOrientation / 2;

            screenTransform.set( 0, Math.sin( minusHalfAngle ), 0, Math.cos( minusHalfAngle ) );

            finalQuaternion.multiply( screenTransform );

            finalQuaternion.multiply( worldTransform );

            return finalQuaternion;

        }

    }();

    var createRotationMatrix = function () {

        var finalMatrix = new THREE.Matrix4();

        var deviceEuler = new THREE.Euler();
        var screenEuler = new THREE.Euler();
        var worldEuler = new THREE.Euler( - Math.PI / 2, 0, 0, 'YXZ' ); // - PI/2 around the x-axis

        var screenTransform = new THREE.Matrix4();

        var worldTransform = new THREE.Matrix4();
        worldTransform.makeRotationFromEuler(worldEuler);

        return function (alpha, beta, gamma, screenOrientation) {

            deviceEuler.set( beta, alpha, - gamma, 'YXZ' );

            finalMatrix.identity();

            finalMatrix.makeRotationFromEuler( deviceEuler );

            screenEuler.set( 0, - screenOrientation, 0, 'YXZ' );

            screenTransform.identity();

            screenTransform.makeRotationFromEuler( screenEuler );

            finalMatrix.multiply( screenTransform );

            finalMatrix.multiply( worldTransform );

            return finalMatrix;

        }

    }();

    this.updateManualMove = function () {

        var lat, lon;
        var phi, theta;

        var rotation = new THREE.Euler( 0, 0, 0, 'YXZ' );

        var rotQuat = new THREE.Quaternion();
        var objQuat = new THREE.Quaternion();

        var tmpZ, objZ, realZ;

        var zoomFactor, minZoomFactor = 1; // maxZoomFactor = Infinity

        return function () {

            objQuat.copy( tmpQuat );

            if ( appState === CONTROLLER_STATE.MANUAL_ROTATE ) {

                lat = ( startY - currentY ) * scrollSpeedY;
                lon = ( startX - currentX ) * scrollSpeedX;

                phi	 = THREE.Math.degToRad( lat );
                theta = THREE.Math.degToRad( lon );

                rotQuat.set( 0, Math.sin( theta / 2 ), 0, Math.cos( theta / 2 ) );

                objQuat.multiply( rotQuat );

                rotQuat.set( Math.sin( phi / 2 ), 0, 0, Math.cos( phi / 2 ) );

                objQuat.multiply( rotQuat );

                // Remove introduced z-axis rotation and add device's current z-axis rotation

                tmpZ  = rotation.setFromQuaternion( tmpQuat, 'YXZ' ).z;
                objZ  = rotation.setFromQuaternion( objQuat, 'YXZ' ).z;
                realZ = rotation.setFromQuaternion( deviceQuat || tmpQuat, 'YXZ' ).z;

                rotQuat.set( 0, 0, Math.sin( ( realZ - tmpZ  ) / 2 ), Math.cos( ( realZ - tmpZ ) / 2 ) );

                tmpQuat.multiply( rotQuat );

                rotQuat.set( 0, 0, Math.sin( ( realZ - objZ  ) / 2 ), Math.cos( ( realZ - objZ ) / 2 ) );

                objQuat.multiply( rotQuat );

                this.object.quaternion.copy( objQuat );

            } else if ( appState === CONTROLLER_STATE.MANUAL_ZOOM ) {

                zoomCurrent = zoomP1.distanceTo( zoomP2 );

                zoomFactor = zoomStart / zoomCurrent;

                if ( zoomFactor <= minZoomFactor ) {

                    this.object.fov = tmpFOV * zoomFactor;

                    this.object.updateProjectionMatrix();

                }

                // Add device's current z-axis rotation

                if ( deviceQuat ) {

                    tmpZ  = rotation.setFromQuaternion( tmpQuat, 'YXZ' ).z;
                    realZ = rotation.setFromQuaternion( deviceQuat, 'YXZ' ).z;

                    rotQuat.set( 0, 0, Math.sin( ( realZ - tmpZ ) / 2 ), Math.cos( ( realZ - tmpZ ) / 2 ) );

                    tmpQuat.multiply( rotQuat );

                    this.object.quaternion.copy( tmpQuat );

                }

            }

        };

    }();


    //Update rotation from net:
    this.UpdateRotFromNet = function(e){
      console.log("Got rotation event from net")
      console.log(event);//TBD

      //Remove touch events of mouse when is controlled by net:
      window.removeEventListener( 'resize', this.onDocumentMouseDown, false );
      window.removeEventListener( 'resize', this.onDocumentTouchStart, false );

      this.deviceOrientation.alpha = e.detail.alpha;
      this.deviceOrientation.beta = e.detail.beta;
      this.deviceOrientation.gamma = e.detail.gamma;
      //Update rotation with new data:
      this.updateDeviceMove();
    }.bind( this );


    this.updateDeviceMove = function () {

        var alpha, beta, gamma, orient;

        var deviceMatrix;

        return function () {

            alpha  = THREE.Math.degToRad( this.deviceOrientation.alpha || 0 ); // Z
            beta   = THREE.Math.degToRad( this.deviceOrientation.beta  || 0 ); // X'
            gamma  = THREE.Math.degToRad( this.deviceOrientation.gamma || 0 ); // Y''
            orient = THREE.Math.degToRad( this.screenOrientation       || 0 ); // O

            // only process non-zero 3-axis data
            if ( alpha !== 0 && beta !== 0 && gamma !== 0) {

                if ( this.useQuaternions ) {

                    deviceQuat = createQuaternion( alpha, beta, gamma, orient );

                } else {

                    deviceMatrix = createRotationMatrix( alpha, beta, gamma, orient );

                    deviceQuat.setFromRotationMatrix( deviceMatrix );

                }

                if ( this.freeze ) return;

                //this.object.quaternion.slerp( deviceQuat, 0.07 ); // smoothing
                this.object.quaternion.copy( deviceQuat );

            }

        };

    }();

    this.update = function () {
        this.updateDeviceMove();

        if ( appState !== CONTROLLER_STATE.AUTO ) {
            this.updateManualMove();
        }
    };


    //Bind controls to events:
    this.connect = function () {
        window.addEventListener( 'resize', this.constrainObjectFOV, false );

        window.addEventListener( 'orientationchange', this.onScreenOrientationChange, false );
        window.addEventListener( 'deviceorientation', this.onDeviceOrientationChange, false );

        window.addEventListener( 'compassneedscalibration', this.onCompassNeedsCalibration, false );

        //Bind the  rotation event from net:
        window.addEventListener('rotation-is-set', this.UpdateRotFromNet);

        this.element.addEventListener( 'mousedown', this.onDocumentMouseDown, false );
        this.element.addEventListener( 'touchstart', this.onDocumentTouchStart, false );

        this.freeze = false;
    };

    this.disconnect = function () {
        this.freeze = true;

        window.removeEventListener( 'resize', this.constrainObjectFOV, false );

        window.removeEventListener( 'orientationchange', this.onScreenOrientationChange, false );
        window.removeEventListener( 'deviceorientation', this.onDeviceOrientationChange, false );

        window.removeEventListener( 'compassneedscalibration', this.onCompassNeedsCalibration, false );

        this.element.removeEventListener( 'mousedown', this.onDocumentMouseDown, false );
        this.element.removeEventListener( 'touchstart', this.onDocumentTouchStart, false );
    };

};

DeviceOrientationController.prototype = Object.create( THREE.EventDispatcher.prototype );




//Call back for Rotation request:
var OrientationGrantedFlag=false;
/*
function onClick() {
    // feature detect
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    OrientationGrantedFlag = true;
                    window.addEventListener('deviceorientation', () => {});
                }
            })
            .catch(console.error);
    } else {
        // handle regular non iOS 13+ devices
    }
}

//Define the location options:
let options = { //location options
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
};

//Callback for location access request:
function activateLocation()
{
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    //window.addEventListener('deviceorientation', () => {});
                    //navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, options);
                }
            })
            .catch(console.error);
    } else {
        //navigator.geolocation.watchPosition(nav_geo_success, nav_geo_error, options);
        // handle regular non iOS 13+ devices
    }
}
*/



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




//For IOS devices:
window.addEventListener("deviceorientation", function (event) {
    {
        let compass_ = GetCompassHeading(event.webkitCompassHeading,
            event.beta, event.gamma);
        //let compass_ = event.webkitCompassHeading;

        if(compass_!=null && event!=null && event.alpha!=null && event.beta!=null && event.gamma!=null) {
            document.getElementById("IOSEvent").innerHTML =
                `orientation event fired, webkit cmpss=${compass_.toFixed(1)}}
                        alpha=${event.alpha.toFixed(1)}
                        beta=${event.beta.toFixed(1)}
                        gamma=${event.gamma.toFixed(1)}
                        `;
        }
        //gamma is pitch.
        //alpha is azimuth
        //beta is roll
        //hide the orientation button:
        OrientationGrantedFlag=true;
        if(OrientationGrantedFlag)
        {
          document.getElementById("RotPerm").style.display='none';
        }
        //let comp_ptr = document.querySelector('[rotation-helper]').components['rotation-helper'];
        if(!isNaN(compass_) && compass_!=null) {
            //comp_ptr.data.cmpss_heading = compass_;//compass heading relative to z axis.
            window.dispatchEvent(new CustomEvent('rotation-is-set',
                {detail: {compass_reading: compass_}}));
        }
    }
});

//For android devices:
window.addEventListener("deviceorientationabsolute", function (event) {
    function handleOrientationEvent(event) {
        //document.getElementById("id04").innerHTML = `Handle orientation event A# ${++this.num_of_handled_ori_events}`;
        // alpha: rotation around z-axis
        let rotateDegrees = event.alpha;
        let rotateDegreesIOS = event.absolute;
        // gamma: left to right
        let leftToRight = event.gamma;
        // beta: front back motion
        let frontToBack = event.beta;

        let compass_heading = GetCompassHeading(event.alpha, event.beta, event.gamma);

        //let comp_ptr = document.querySelector('[rotation-helper]').components['rotation-helper'];
        //if(this.comp_ptr == null)
        //let comp_ptr = document.querySelector('[rotation-helper]').components['rotation-helper'];

        if(!isNaN(compass_heading) && compass_heading!=null) {
            //comp_ptr.data.cmpss_heading = compass_heading;//compass heading relative to z axis.
            document.getElementById("AndroidEvent").innerHTML =
                `ANDR_ORNT_EVENT [abs=${event.absolute}
                            alpha= ${event.alpha.toFixed(1)}
                            beta= ${event.beta.toFixed(1)}
                            gamma ${event.gamma.toFixed(1)}
                            cmpss_head=${compass_heading.toFixed(1)}`;
            OrientationGrantedFlag = true;//Set global flag to on
            //If orientation is enabled hide the rotation permition button:
            if(OrientationGrantedFlag)
            {
              document.getElementById("RotPerm").style.display='none';
            }
            //Set the event for compass reading is ready and reliable:
            window.dispatchEvent(new CustomEvent('rotation-is-set',
                {detail: {compass_reading: compass_heading}}));
        }
    }
    //document.getElementById("AndroidEvent").innerHTML =
    //    `ANDR_ORNT_EVENT [abs= ${event.absolute} alpha= ${event.alpha.toFixed(1)}]`;
    handleOrientationEvent(event);
});






/*
//Bind the initial rotation event:
window.addEventListener('rotation-is-set', this.SetInitRotation);
//};
document.getElementById("AndroidEvent").innerHTML = "No orientation event";
console.log('Rotation module is loaded and ready');
*/



/*
//Device access promissions for ios13:
DeviceMotionEvent.requestPermission()
    .then(response => {
        if (response == 'granted') {
            window.addEventListener('devicemotion', (e) => {
                // do something with e
            })
        }
    })
    .catch(console.error)

DeviceOrientationEvent.requestPermission()
    .then(response => {
        if (response == 'granted') {
            window.addEventListener('deviceorientation', (e) => {
                // do something with e
                document.getElementById("Log").innerHTML = "Got orientation event";
            })
        }
    })
    .catch(console.error)

*/

//document.getElementById("myBtn").addEventListener("click", onClick);

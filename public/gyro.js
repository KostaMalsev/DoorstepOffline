/* Camarker (MIT License)
 * gyro.js
 *
 * Script gets orientation permission
 * and hooks to main.js for passing gyro
 * rotation to peer in real time.
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

// Android
window.addEventListener("deviceorientationabsolute", function (event) {
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


// If orientation not granted
let promptEl = document.querySelector('.prompt-wrapper');
if (!peerId && orientationGranted == false) {
  // Show prompt
  promptEl.classList.add('visible');
}

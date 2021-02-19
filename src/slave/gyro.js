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
    sendDataPacket(data);
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
    sendDataPacket(data);
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
    sendDataPacket(data);
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
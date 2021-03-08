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
//Onboarding:
var url = new URL(window.location.href),
    join = url.searchParams.get('room'),
    onboard = document.querySelector('.onboard'),
    stages = document.querySelector('.stages'),
    phone = document.querySelector('#phone-input'),
    submit = document.querySelector('.phone-submit'),
    apps = document.querySelector('.apps').children;

// If orientation not granted and not creating room
let promptEl = document.querySelector('.prompt-wrapper');
//If it's an initiator he is the master and no rotation needed:
if (orientationGranted == false && peerId != null) {
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


document.querySelectorAll('.buttons div')[0].addEventListener('click', e => {
  promptEl.classList.remove('visible');
})

document.querySelectorAll('.buttons div')[1].addEventListener('click', e => {
  promptEl.classList.remove('visible');
  requestPermission();
})



if (join == null) {
  onboard.classList.add('visible');
}

submit.addEventListener('click', e => {
  stages.classList = 'stages two';

})


//SMS:
apps[0].addEventListener('click', e => {
  onboard.classList.remove('visible');

  let href_ = window.location.href;//window.location.href.replace('https','googlechromes');

  var link = href_ + '?room=' + document.querySelector('.button').id,
      text = 'Your package has arrived. Please direct it to your doorstep:\n' + link;

  phone.value.replace('-','');//remove seperators
  phone.value.replace('+972','');//remove Israel id number

  //window.location.href = encodeURI('sms:'+ phone.value +'&amp;body='+ text);
  window.location.href = 'sms:'+ phone.value +'&body='+encodeURI(text);
});


//Whatsapp:
apps[1].addEventListener('click', e => {
  onboard.classList.remove('visible');

  let href_ = window.location.href;//.replace('https','googlechromes');
  var link = href_ + '?room=' + document.querySelector('.button').id,
  text = 'Your package has arrived. Please direct it to your doorstep:\n' + link;

  //window.location.href = 'whatsapp://send?phone='+ phone.value +'&amp;text='+ text;

  //Clean phone number:
  phone.value.replace('-','');//remove seperators
  phone.value.replace('+972','');//remove Israel id number
  //Remove zero in from phone number
  let phonen = phone.value[0]=='0'?phone.value.substring(1,9):phone.value;

  window.location.href = 'whatsapp://send?phone='+'+972'+phone.value+'&text='+encodeURI(text);
  //window.location.href = 'whatsapp://send?phone='+ phone.value +'&amp;text='+ encodeURI(text);
  //window.location.href ='https://wa.me/whatsapp'+'+972'+phone.value+'?text='+encodeURI(text);
  //var win = window.open(`https://wa.me/${phone.value}?text=I%27m%20api%20msg%20hello%20friend%20${encodeURI(text)}`, '_blank');

});

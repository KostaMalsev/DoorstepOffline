/*
 * Camarker (MIT License)
 * main.js
 *
 * Script handles peer-to-peer communication
 * and hooks to world.js and gyro.js
 * to synchronize rotation with 3d world.
 *
 * Script terms:
 * These terms are used in the script
 * to differentiate between peers.
 * "Master": Room Creator (Typically: Computer)
 * "Slave": Room Joiner (Typically: Mobile Device)
 *
 */

let Peer = window.Peer;

let messagesEl = document.querySelector('.messages');
let videoEl = document.querySelector('.remote-video');
let myVideoEl = document.querySelector('.my-video');
let button = document.querySelector('.button');
let loaderSVG = '<svg class="loader2" width="32" height="32" viewBox="0 0 100 100"><rect fill="white" height="6" opacity="0" rx="3" ry="3" transform="rotate(-90 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.08333333333333333" rx="3" ry="3" transform="rotate(-60 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.16666666666666666" rx="3" ry="3" transform="rotate(-30 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.25" rx="3" ry="3" transform="rotate(0 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.3333333333333333" rx="3" ry="3" transform="rotate(30 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.4166666666666667" rx="3" ry="3" transform="rotate(60 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.5" rx="3" ry="3" transform="rotate(90 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.5833333333333334" rx="3" ry="3" transform="rotate(120 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.6666666666666666" rx="3" ry="3" transform="rotate(150 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.75" rx="3" ry="3" transform="rotate(180 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.8333333333333334" rx="3" ry="3" transform="rotate(210 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.9166666666666666" rx="3" ry="3" transform="rotate(240 50 50)" width="25" x="72" y="47"></rect></svg>';



// Utility function - Log message
let logMessage = (message) => {
  messagesEl.innerHTML = '<div>' + message + '</div>';
};

window.logMessage = logMessage;

// Utility function - Remove connectivity message
let removeConnectionMessage = () => {
  messagesEl.querySelectorAll('div').forEach(div => {
    if (div.innerHTML == (loaderSVG + 'Connecting')) {
      div.remove()
    };
  })
};


//Client (participant) side section functions:
// Render main video
let renderVideo = (stream) => {
  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => {
    videoEl.play();
    removeConnectionMessage();
  }
};

// Render tiny video
let renderMyVideo = (stream) => {
  myVideoEl.srcObject = stream;
  myVideoEl.onloadedmetadata = () => {
    myVideoEl.play();
  }
}
/*
// Register with the peer server
let peer = new Peer({
  host: '/',
  path: '/peerjs/myapp'
});
*/
/*
let peer = new Peer({
  //initiator,
  //stream: this.stream,
  trickle: true,
  config: { 
    iceServers: [{ 
      urlstun:stun2.l.google.com:19302
      urls: 'turn:18.193.254.239:3478?transport=tcp', username: 'user', credential: 'limor1' }] }
  //config: {‘iceServers’: [{ url: ‘stun:[your stun id]:[port]’ },{ url: ‘turn:[your turn id]:[port]’,username:’[turn username]’, credential: ‘[turn password]’ }
});
*/

let peer = new Peer({
  //initiator,
  //stream: this.stream,
  //trickle: true,
  //EU server:
  config: {iceServers: [{ urls: 'stun:stun.l.google.com:19302' },
                    {urls: 'turn:54.93.214.159:3478?transport=tcp', credential: 'limor1', username: 'user'}]
          }

  //Australia Pasific:
  /*
  config: {iceServers: [{ urls: 'stun:stun.l.google.com:19302' },
                    {urls: 'turn:54.206.15.107:3478?transport=tcp', credential: 'limor1', username: 'user'}]
          }
  */
  //config: {iceServers: [
  //      {url: 'stun2.l.google.com:19302'},
  //      {url: 'turn:18.193.254.239:3478?transport=tcp', credential: 'limor1', username: 'user'}
  //      ]
  //  }
});



// Show "Connecting" message
logMessage(loaderSVG + 'Connecting');

// On connection to server
let peerConn;
peer.on('open', (id) => {

  // If creating meeting
  if (peerId == null) {

    // Show "Copy link" button
    button.style.display = 'block';
    button.id = id;
    removeConnectionMessage();

  }

  // If joining meeting
  else {

    // Connect with room admin
    let conn = peer.connect(peerId);
    peerConn = conn;

    conn.on('open', () => {
      //logMessage('Established connection with room admin');
      conn.send({ width: window.innerWidth, height: window.innerHeight });
    });

    // When receiving data from admin
    conn.on('data', (data) => {
      // Add point to 3d world
      let pt = {
        x: data.x,
        y: data.y,
        z: data.z
      };
      createPoint(pt);

    });
  }
});
peer.on('error', (error) => {
  logMessage(error);
});



//Admin side functions:
// Handle incoming data connection
let last_rot_data={alpha: 0,beta: 0, gamma: 0};

let theadminConn;
peer.on('connection', (conn) => {
  //logMessage('Incoming peer connection');

  // Save connection for later use
  theadminConn = conn;

  conn.on('open', () => {
    logMessage('Established connection with room participant');
    //cssRenderer.domElement.addEventListener('click', clickedOnScreen); // cssRenderer.domElement
    //cssRenderer.domElement.style.cursor = 'pointer';
  });

  // When reciving data from participant
  conn.on('data', (data) => {

    if (data.width == undefined) {
      // Hook with world.js:
      // Rotate the admin's virtual camera
      // Based on participant's device rotation
      //logMessage(JSON.stringify(data));

      //"alpha":"19.18","beta":"41.08","gamma":"-18.16"
      if(Math.sqrt(Math.pow(last_rot_data.alpha,2) - Math.pow(data.alpha,2))<15){
        rotateCamera(data);
      }else{
        rotateCamera(last_rot_data);
        //console.log(JSON.stringify(data));
      }
      last_rot_data.alpha = data.alpha;
      last_rot_data.beta = data.beta;
      last_rot_data.gamma = data.gamma;
    }
    else {
      resizeTHREETo(data.width, data.height);
    }
  });

});

// Handle incoming voice/video connection
peer.on('call', (call) => {
  logMessage(loaderSVG + 'Connecting');
  myVideoEl.classList.remove('big');

  call.answer(myVideoStream); // Answer the call with an A/V stream.

  call.on('stream', (s) => {
    renderVideo(s);
  });

  call.on('error', (error) => {
    myVideoEl.classList.add('big');
    logMessage('Meeting ended: '+error);
  });
});

var myVideoStream;

// Retrieve parameter "?room=" from url
var url = new URL(window.location.href);
var peerId = url.searchParams.get('room');

// If joining meeting
if (peerId != null) {
  logMessage(loaderSVG + 'Connecting');
  
  document.title =  'Doorstep - Join Meeting'; // Set window title

  // Get voice/video permissions
  navigator.mediaDevices.getUserMedia({

      video: {
        facingMode: "environment"
      },
      audio: true

    }).then(stream => { // When permissions granted

      // Call admin
      let call = peer.call(peerId, stream);
      call.on('stream', (s) => {

        // Render video
        renderMyVideo(s);
        renderVideo(stream);
        videoEl.muted = "muted";

      });

      call.on('error', (error) => {
        myVideoEl.classList.add('big');
        logMessage('Meeting ended: '+error);
      });

    })
    .catch((err) => {
      removeConnectionMessage();
      logMessage('Allow camera access for video chat.');
    });
}

// If creating meeting
else {
  // Show "Connecting" message
  logMessage(loaderSVG + 'Connecting');
  
  document.title =  'Doorstep - Create Meeting'; // Set window title

  // Show big video
  videoEl.classList.add('remote');
  myVideoEl.classList.add('big');
  myVideoEl.muted = "muted";

  // Request voice/video permission
  navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    .then((stream) => {
      // Render video
      myVideoStream = stream;
      renderMyVideo(myVideoStream);
    })

    .catch((err) => {
      removeConnectionMessage();
      logMessage('Allow camera access for video chat.');
    });
}

// Hook with gyro.js:
// Function sends orientation data to room admin
let sendDataPacket = (data) => {

  // If connected to admin
  if (peerConn) {

    // Send gyro data
    peerConn.send(data);

  }

}

window.sendDataPacket = sendDataPacket;

// Hook with world.js:
// Function sends marker data to room participant
let sendMarker = (data) => {

  // If connected to participant
  if (theadminConn) {

    // Send marker data
    theadminConn.send(data);

  }

}

window.sendMarker = sendMarker;

// Utility function - Copy text
let copy = (text) => {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

let copyLink = () => {
  copy(window.location.href + '?room=' + button.id);
  button.innerHTML = 'Copied';
}

window.copyLink = copyLink;

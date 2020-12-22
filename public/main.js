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
 * "Admin": Room Creator (Typically: Computer)
 * "Participant": Room Joiner (Typically: Mobile Device)
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

// Utility function - Remove connectivity message
let removeConnectionMessage = () => {
  messagesEl.querySelectorAll('div').forEach(div => {
    if (div.innerHTML == (loaderSVG + 'Connecting')) {
      div.remove()
    };
  })
};

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

// Register with the peer server
let peer = new Peer({
  /*host: '/',
  path: '/peerjs/myapp'*/
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
      //conn.send({ width: window.innerWidth, height: window.innerHeight });
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

// Handle incoming data connection
let theadminConn;
peer.on('connection', (conn) => {
  //logMessage('Incoming peer connection');

  // Save connection for later use
  theadminConn = conn;

  conn.on('open', () => {
    logMessage('Established connection with room participant');
    cssRenderer.domElement.addEventListener('onclick', clickedOnScreen); // cssRenderer.domElement
    //cssRenderer.domElement.style.cursor = 'pointer';
  });

  // When reciving data from participant
  conn.on('data', (data) => {

    if (data.width == undefined) {
      // Hook with world.js:
      // Rotate the admin's virtual camera
      // Based on participant's device rotation
      //logMessage(JSON.stringify(data));
      rotateCamera(data);
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
      logMessage('Allow camera acess for video chat.');
    });
}

// If creating meeting
else {
  // Show "Connecting" message
  logMessage(loaderSVG + 'Connecting');

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
      logMessage('Allow camera acess for video chat.');
    });
}

// Hook with gyro.js:
// Function sends orientation data to room admin
let sendGyroData = (data) => {

  // If connected to admin
  if (peerConn) {

    // Send gyro data
    peerConn.send(data);

  }

}

window.sendGyroData = sendGyroData;

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

window.copy = copy;

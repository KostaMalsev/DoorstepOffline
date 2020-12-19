let Peer = window.Peer;

let messagesEl = document.querySelector('.messages');
let videoEl = document.querySelector('.remote-video');
let myVideoEl = document.querySelector('.my-video');
let button = document.querySelector('.button');
let loaderSVG = '<svg class="loader2" width="32" height="32" viewBox="0 0 100 100"><rect fill="white" height="6" opacity="0" rx="3" ry="3" transform="rotate(-90 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.08333333333333333" rx="3" ry="3" transform="rotate(-60 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.16666666666666666" rx="3" ry="3" transform="rotate(-30 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.25" rx="3" ry="3" transform="rotate(0 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.3333333333333333" rx="3" ry="3" transform="rotate(30 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.4166666666666667" rx="3" ry="3" transform="rotate(60 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.5" rx="3" ry="3" transform="rotate(90 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.5833333333333334" rx="3" ry="3" transform="rotate(120 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.6666666666666666" rx="3" ry="3" transform="rotate(150 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.75" rx="3" ry="3" transform="rotate(180 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.8333333333333334" rx="3" ry="3" transform="rotate(210 50 50)" width="25" x="72" y="47"></rect><rect fill="white" height="6" opacity="0.9166666666666666" rx="3" ry="3" transform="rotate(240 50 50)" width="25" x="72" y="47"></rect></svg>';

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerHTML = message;
  messagesEl.appendChild(newMessage);
};

let removeConnectionMessage = () => {
  messagesEl.querySelectorAll('div').forEach(div => {
    if (div.innerHTML == (loaderSVG + 'Connecting')) { div.remove() };
  })
};

let renderVideo = (stream) => {
  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => {
    videoEl.play();
    removeConnectionMessage();
  }
};

// Get my video and show it
let renderMyVideo = (stream) => {
  myVideoEl.srcObject = stream;
  myVideoEl.onloadedmetadata = () => {
    myVideoEl.play();
  }
}

// Register with the peer server
let peer = new Peer({
  host: '/',
  path: '/peerjs/myapp'
});

// Show "Copy link" button and insert peer ID
peer.on('open', (id) => {
  // If creating meeting
  if (!peerId) {
    button.style.display = 'block';
    button.id = id;
    removeConnectionMessage();
  }
});
peer.on('error', (error) => {
  removeConnectionMessage();
  logMessage(error);
});

// Handle incoming data connection
peer.on('connection', (conn) => {
  logMessage('Incoming peer connection!');
  conn.on('data', (data) => {
    logMessage(`received: ${data}`);
  });
  conn.on('open', () => {
    conn.send('hello!');
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
});

// Initiate outgoing connection
var myVideoStream;
var url = new URL(window.location.href);
var peerId = url.searchParams.get('room');
if (peerId) {
  logMessage(loaderSVG + 'Connecting');

  let conn = peer.connect(peerId);
  conn.on('data', (data) => {
    logMessage(`received: ${data}`);
  });
  conn.on('open', () => {
    conn.send(button.id + ' joined.');
  });

  navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment"},
      audio: true
  }).then(stream => {
     let call = peer.call(peerId, stream);
     call.on('stream', (s) => {
       renderMyVideo(s);
       renderVideo(stream);
       videoEl.muted = "muted";
     });
  })
  .catch((err) => {
    removeConnectionMessage();
    logMessage('Allow camera acess for video chat.<br>' + err);
  });
}
else {
  // Show "Connecting" message
  logMessage(loaderSVG + 'Connecting');
  
  myVideoEl.classList.add('big');
  myVideoEl.muted = "muted";
  navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment"},
      audio: true
  }).then((stream) => {
    myVideoStream = stream;
    renderMyVideo(myVideoStream);
  })
  .catch((err) => {
    removeConnectionMessage();
    logMessage('Allow camera acess for video chat.<br>' + err);
  });
}

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

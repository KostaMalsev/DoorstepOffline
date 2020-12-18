let Peer = window.Peer;

let messagesEl = document.querySelector('.messages');
let videoEl = document.querySelector('.remote-video');
let myVideoEl = document.querySelector('.my-video');
let button = document.querySelector('.button');

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerText = message;
  messagesEl.appendChild(newMessage);
};

let removeConnectionMessage = () => {
  messagesEl.querySelectorAll('div').forEach(div => {
    if (div.innerHTML == 'Connecting') { div.remove() };
  })
};

let renderVideo = (stream) => {
  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => {
    videoEl.play();
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
  logMessage(error);
});

// Handle incoming data connection
peer.on('connection', (conn) => {
  logMessage('incoming peer connection!');
  conn.on('data', (data) => {
    logMessage(`received: ${data}`);
  });
  conn.on('open', () => {
    conn.send('hello!');
  });
});

// Handle incoming voice/video connection
peer.on('call', (call) => {
  logMessage('Connecting');
  myVideoEl.classList.remove('big');

  call.answer(myVideoStream); // Answer the call with an A/V stream.
  call.on('stream', (s) => {
    renderVideo(s);
    removeConnectionMessage();
  });
});

// Initiate outgoing connection
var myVideoStream;
var url = new URL(window.location.href);
var peerId = url.searchParams.get('room');
if (peerId) {
  logMessage('Connecting');

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
       removeConnectionMessage();
     });
  })
  .catch((err) => {
    logMessage('Allow camera acess for video chat');
  });
}
else {
  // Show "Connecting" message
  logMessage('Connecting');
  
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
    logMessage('Allow camera acess for video chat');
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

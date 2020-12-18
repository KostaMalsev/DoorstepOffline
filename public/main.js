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

let renderVideo = (stream) => {
  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => {
    videoEl.play();
    /*messagesEl.innerHTML = '';*/
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
  button.style.display = 'block';
  button.id = id;
});
peer.on('error', (error) => {
  console.error(error);
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
    renderMyVideo(myVideoStream);
  });
});

// Initiate outgoing connection
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
     });
  })
  .catch((err) => {
    console.error('Failed to get local stream', err);
  });
}
var myVideoStream;
else {
  myVideoEl.classList.add('big');
  myVideoEl.muted = "muted";
  navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment"},
      audio: true
  }).then((stream) => {
    myVideoStream = stream;
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

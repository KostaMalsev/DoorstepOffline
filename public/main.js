// client-side js, loaded by index.html
// run by the browser each time the page is loaded

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
    messagesEl.innerHTML = '';
  }
};

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
  navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment"},
      audio: true
  }).then((stream) => {
    call.answer(/*stream*/); // Answer the call with an A/V stream.
    call.on('stream', renderVideo);
  })
  .catch((err) => {
    console.error('Failed to get local stream', err);
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
    conn.send('hi!');
  });

  navigator.mediaDevices.getUserMedia({
      video: {facingMode: "environment"},
      audio: true
  }).then(stream => {
     let call = peer.call(peerId, stream);
     call.on('stream', renderVideo);
  })
  .catch((err) => {
    console.error('Failed to get local stream', err);
  });
}

// Get video and show it
navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(stream => {
    myVideoEl.srcObject = stream;
    myVideoEl.onloadedmetadata = () => {
      myVideoEl.play();
    }
})

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

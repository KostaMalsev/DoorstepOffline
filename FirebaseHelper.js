//Firebase configuration:

//For managing duplicates from firebase (received duplicates from chiled-added event
var Glast_id = null;

var firebaseConfig = {
    apiKey: "AIzaSyAFIvRJ3bxemB9AjqOvyuoLo8s4CsSWDB8",
    authDomain: "varweb-52b08.firebaseapp.com",
    databaseURL: "https://varweb-52b08.firebaseio.com",
    projectId: "varweb-52b08",
    storageBucket: "varweb-52b08.appspot.com",
    messagingSenderId: "249703990981",
    appId: "1:249703990981:web:90216c63c3293b47d412ac"
};

//Firebase Globals:
//var firebase=null;
var db = null;
var msgRef = null;
//var vr_ptr_ = null;

//Function handles write event from firebase
function HandleHookFromFirebase(post) {

    //Handle dupblicates:
    if(Glast_id!=null && post.id === Glast_id)
        return;
    Glast_id = post.id;

    let pls_pos = {
        lat: parseFloat(post.Centerloc.lat),
        lon: parseFloat(post.Centerloc.lng)
    };

    //Place virtual entity in AR/VR:

    //vr_ptr_.PlaceInVR(pls_pos, vr_ptr_.WorldCenter, post.desc);
    PlaceInVR(pls_pos, GlobCenter, post.desc);

    //let qmarker
    let gmarker = {
        lat: parseFloat(post.Centerloc.lat),
        lon: parseFloat(post.Centerloc.lng),
        desc: post.desc
    };

    //Send message to mapbox to draw entity
    window.dispatchEvent(new CustomEvent('new-custom-marker-added',
        {detail: gmarker}));
}

//Function ititialize firebase:
function InitFirebase() {
    //When location is known, set the listeners:
    window.addEventListener('gps-coord-set', InitListeners);

}

//Init listeners:
function InitListeners()
{
    //vr_ptr_ = document.querySelector('[vrenvironment]').components['vrenvironment'];
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    //firebase.analytics();
    db = firebase.database();
    //to store data in the msgs folder by creating a reference in database
    msgRef = db.ref("/POIS");

    // Retrieve new posts as they are added to our database
    msgRef.on("child_added", function (snapshot, prevChildKey) {
        var newPost = snapshot.val();
        HandleHookFromFirebase(newPost);
        //console.log("Author: " + newPost.author);
        //console.log("Title: " + newPost.title);
        //console.log("Previous Post ID: " + prevChildKey);
    });
    console.log('Firebase is Loaded and ready');
}


function UpdateMarkerName(marker_name, new_name)
{
    //DatabaseReference mDatabase = FirebaseDatabase.getInstance().getReference("POIS").child("Quote");
    //mDatabase.child(marker_name).setValue(mItem.totalLikes + 1);
}



//---DB Shema:
/*
  let out = {
      Centerloc: {
          lat: details.lat,
          lng: details.lon
      },
      x: 0,
      y: 0,
      desc: details.desc_,
      id: hashCode(details.desc_+dtime_.toString()),
      user_id: 'map',
      dtime: dtime_
  };
  */
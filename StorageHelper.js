//Module StorageHelper stores markers on local storage,
//Markers will be visible only to the user



//Global storage marker array: Manage local storage markers:
var StorageMarkers=[];



function InitStorage() {

  //Set listener for creating markers on map:
  window.addEventListener('gps-coord-set', LoadFromStorage);
  console.log('Local storage is ready');
}


//Returns array of marker objects stored
function LoadFromStorage()
{
  if (localStorage.getItem('markers')) {
    // If in storage, set variable to it
    StorageMarkers = JSON.parse(localStorage.getItem('markers'));
  } else {
    // If is not in storage
    StorageMarkers = [];
  }


  if (StorageMarkers.length > 0 && (InvokeAppOrigin == "PLAIN") ) {
    StorageMarkers.forEach((marker,index)=>{
      //Create marker in VR:
      let pls_pos = {
        lat: marker.Centerloc.lat,
        lon: marker.Centerloc.lng
      };

      //Visualize markers
      PlaceInVR(pls_pos, GlobCenter, marker.desc);
      //Create marker on map:
      let gmarker = {
        lat: pls_pos.lat,
        lon: pls_pos.lon,
        desc: marker.desc
      };
      window.dispatchEvent(new CustomEvent('new-custom-marker-added',
        {detail: gmarker}));
    });
  }
  //Update debug:
  try{
    document.getElementById('PlacesLoaded').innerHTML = `Got ${StorageMarkers.length} markers`;
  }catch(error){
    console.error(error);
  }
}


//Function to delete all stored markers:
//Function doesn't clear firebase and local markers in app - after load it will clear created markers
function DeleteMarkersInStorage()
{
  localStorage.setItem('markers', "");
  StorageMarkers=[];
}


//Function add Marker to storage array and updates the local storage
function AddToStorage(details)
{
  let MarkerObj = {
    Centerloc: {
      lat: details.lat,
      lng: details.lon
    },
    x: 0,
    y: 0,
    desc: details.desc_,
    id: details.id,
    user_id: 'map',
    dtime: details.time_
  };

  //Add to array
  StorageMarkers.push(MarkerObj);

  //Create string out of the array of markers:
  let markers = JSON.stringify(StorageMarkers);

  //Replace the local storage:
  localStorage.setItem('markers', markers);
  try{
    document.getElementById('PlacesLoaded').innerHTML = `Got ${StorageMarkers.length} markers`;
  }catch(error){
    console.error(error);
  }
}

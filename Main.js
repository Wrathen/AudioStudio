// Variables
let audioCtx;
let stream;
let mediaRecorder;
let isRecordingStarted = false;
let isRecordingPaused = false;
let isPlaybackStarted = false;
let isPlaybackPaused = false;

let UIElements = {};
let clips = [];
let offsetEnd = 0.00;
let offsetStart = 0.00;
let duration = 0;
let timer = 0;
let startTimeMS = 0;

// Base Functions
function setup() {
  // Create the canvas.
  createCanvas(1920, 1080);

  // Create the UI Elements that are shown on left-side panel.
  createUIElements();

  // Ask the user for audio permissions and initialize audio manager.
  askForAudioPermission();
}
function draw() {
  let bgColor = [255, 255, 255];

  // Alter background color based on current state.
  if (isRecordingStarted) bgColor = [255, 0, 0];

  background(...bgColor);
  if (isPlaybackStarted && !isPlaybackPaused) {
    for (let i = 0; i < clips.length; ++i)
      if (clips[i].currentTime > clips[i].duration + offsetEnd)
        clips[i].currentTime = offsetStart,
        clips[i].play();
  }

  if (timer < 0.0001) return; 
  timer = duration - (millis() - startTimeMS) / 1000;
  textSize(46);
  text(timer.toFixed(2), 500, 500);
}

// Main Functions
function createUIElements() {
  // Create Labels
  UIElements["LBL_RecordTitle"] = createP("Record").size(80, 30);
  UIElements["LBL_PlaybackTitle"] = createP("Playback").size(80, 30);

  // Create Buttons
  UIElements["BUT_RecordToggleStart"] = createButton("Start").mousePressed(toggleRecordingStart);
  UIElements["BUT_RecordTogglePause"] = createButton("Pause").mousePressed(toggleRecordingPause);
  UIElements["BUT_PlaybackToggleStart"] = createButton("Start").mousePressed(togglePlaybackStart);
  UIElements["BUT_PlaybackTogglePause"] = createButton("Pause").mousePressed(togglePlaybackPause);

  // Create Divs
  UIElements["DIV_Header"] = createDiv().class("float-container");
  UIElements["DIV_Record"] = createDiv().class("float-child");
  UIElements["DIV_Playback"] = createDiv().class("float-child");
  UIElements["DIV_Clips"] = createDiv().size(600, 600).position(30, 200);

  // Assign Children
  UIElements["DIV_Header"].child(UIElements["DIV_Record"]).child(UIElements["DIV_Playback"]);
  UIElements["DIV_Record"].child(UIElements["LBL_RecordTitle"])
    .child(UIElements["BUT_RecordToggleStart"])
    .child(UIElements["BUT_RecordTogglePause"]);
  UIElements["DIV_Playback"].child(UIElements["LBL_PlaybackTitle"])
    .child(UIElements["BUT_PlaybackToggleStart"])
    .child(UIElements["BUT_PlaybackTogglePause"]);

  // Assign colors
  UIElements["DIV_Header"].elt.style.backgroundColor = "#ffff00";
  UIElements["DIV_Record"].elt.style.backgroundColor = "#00ff00";
  UIElements["DIV_Playback"].elt.style.backgroundColor = "#0000ff";
}

// Togglers
function toggleRecordingStart() { (isRecordingStarted = !isRecordingStarted) ? startRecording() : stopRecording(); }
function toggleRecordingPause() { (isRecordingPaused = !isRecordingPaused) ? pauseRecording() : resumeRecording(); }
function togglePlaybackStart() { (isPlaybackStarted = !isPlaybackStarted) ? startPlayback() : stopPlayback(); }
function togglePlaybackPause() { (isPlaybackPaused = !isPlaybackPaused) ? pausePlayback() : resumePlayback(); }

// Recording Functions
function startRecordingDelayed(delay) {
  timer = delay;
  duration = delay;
  startTimeMS = millis();
  setTimeout(() => { toggleRecordingStart(); }, (delay * 1000)|0);
}
function startRecording() {
  UIElements["BUT_RecordToggleStart"].elt.innerHTML = "Stop";
  mediaRecorder.start();
}
function stopRecording() {
  UIElements["BUT_RecordToggleStart"].elt.innerHTML = "Record";
  mediaRecorder.stop();
}
function pauseRecording() { }
function resumeRecording() { }

// Playback Functions
function startPlayback() {
  UIElements["BUT_PlaybackToggleStart"].elt.innerHTML = "Stop";

  for (let i = 0; i < clips.length; ++i)
    clips[i].currentTime = offsetStart,
    clips[i].play();
}
function stopPlayback() {
  UIElements["BUT_PlaybackToggleStart"].elt.innerHTML = "Start";

  for (let i = 0; i < clips.length; ++i)
    clips[i].currentTime = offsetStart,
    clips[i].pause();
}
function pausePlayback() {
  UIElements["BUT_PlaybackTogglePause"].elt.innerHTML = "Resume";

  for (let i = 0; i < clips.length; ++i)
    clips[i].pause();
}
function resumePlayback() {
  UIElements["BUT_PlaybackTogglePause"].elt.innerHTML = "Pause";

  for (let i = 0; i < clips.length; ++i)
    clips[i].play();
}

function saveRecording(chunks) {
  const clipContainer = document.createElement('article');
  const clipLabel = document.createElement('p');
  const audio = document.createElement('audio');
  const playButton = document.createElement('button');
  const deleteButton = document.createElement('button');

  clipContainer.classList.add('clip');
  audio.setAttribute('controls', '');
  clips.push(audio);

  clipLabel.textContent = "Unnamed Clip";
  playButton.textContent = "Play";
  deleteButton.textContent = 'Delete';

  clipContainer.appendChild(clipLabel);
  clipContainer.appendChild(audio);
  clipContainer.appendChild(playButton);
  clipContainer.appendChild(deleteButton);
  UIElements["DIV_Clips"].elt.appendChild(clipContainer);

  const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
  chunks = [];

  const audioURL = window.URL.createObjectURL(blob);
  audio.controls = true;
  audio.src = audioURL;

  playButton.onclick = function (e) { audio.play(); }
  deleteButton.onclick = function (e) { for (let i = 0; i < clips.length; ++i) if (clips[i] == audio) clips.splice(i, 1); clipContainer.remove(); }
  clipLabel.onclick = function () {
    const newClipName = prompt("Please enter your new name for this clip:");
    clipLabel.textContent = newClipName === null ? clipLabel.textContent : newClipName;
  }
}

// Events
function keyPressed() {
  // Space
  if (keyCode == 32)
    toggleRecordingStart();
}

// Utility
function askForAudioPermission() {
  if (!navigator.mediaDevices.getUserMedia) {
    alert("getUserMedia not supported on your browser!");
    return;
  }

  let chunks = [];
  let onError = function (err) { alert('The following error occured: ' + err); }
  let onSuccess = function (_stream) {
    stream = _stream;

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.onstop = function (e) { saveRecording(chunks); chunks = []; }
    mediaRecorder.ondataavailable = function (e) { chunks.push(e.data); }
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(onSuccess, onError);
}
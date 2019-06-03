"use strict";

const mediaStreamConstraints = {
  video: {
    width: { min: 1280 },
    height: { min: 720 }
  },
  audio: true
};

/**
 * Stream will be fed into this video element.
 */
const localVideo = document.querySelector("video");

/**
 * Local stream that will be fed into the video element.
 */
let localStream;

/**
 * Handle success by adding the mediaStream to the local video element.
 * @param {MediaStream} mediaStream
 */
function gotLocalMediaStream(mediaStream) {
  localStream = mediaStream;
  localVideo.srcObject = localStream;
}

/**
 * Handle error by logging a message to the console with the error message.
 * @param {Error} error
 */
function handleLocalMediaStreamError(error) {
  console.log("navigator.getUserMedia error: ", error);
}

// Initialize media stream
navigator.mediaDevices
  .getUserMedia(mediaStreamConstraints)
  .then(gotLocalMediaStream)
  .catch(handleLocalMediaStreamError);

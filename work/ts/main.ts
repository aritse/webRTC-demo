const mediaStreamConstraints = { video: true };
const localVideo = document.querySelector("video") as HTMLVideoElement;
let localStream: MediaStream;

function gotLocalMediaStream(mediaStream: MediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = localStream;
}

function handleLocalMediaStreamError(error: Error) {
    console.log(error);
}

navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);

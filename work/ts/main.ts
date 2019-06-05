const mediaStreamConstraints: MediaStreamConstraints = { video: true };
const offerOptions: RTCOfferOptions = { offerToReceiveVideo: true };

let startTime: number;

const localVideoHTMLElement: HTMLVideoElement = document.getElementById("localVideo") as HTMLVideoElement;
const remoteVideoHTMLElement: HTMLVideoElement = document.getElementById("remoteVideo") as HTMLVideoElement;

let localMediaStream: MediaStream;
let remoteMediaStream: MediaStream;

let localPeerConnection: RTCPeerConnection;
let remotePeerConnection: RTCPeerConnection;

localVideoHTMLElement.addEventListener("loadedmetadata", logVideoLoaded);
remoteVideoHTMLElement.addEventListener("loadedmetadata", logVideoLoaded);
remoteVideoHTMLElement.addEventListener("resize", logResizedVideo);

const startButton = document.getElementById("startButton") as HTMLButtonElement;
const callButton = document.getElementById("callButton") as HTMLButtonElement;
const endButton = document.getElementById("endButton") as HTMLButtonElement;

startButton.disabled = false;
callButton.disabled = true;
endButton.disabled = true;

startButton.addEventListener("click", startButtonAction);
callButton.addEventListener("click", callButtonAction);
endButton.addEventListener("click", endButtonAction);

function startButtonAction() {
  startButton.disabled = true;
  navigator.mediaDevices
    .getUserMedia(mediaStreamConstraints)
    .then(cbGotLocalMediaStream)
    .catch(cbHandleLocalMediaStreamError);
  trace("Requesting local media stream");
}

function callButtonAction() {
  callButton.disabled = true;
  endButton.disabled = false;

  trace("Starting call over RTCPeerConnection");
  startTime = window.performance.now();

  const videoTrack = localMediaStream.getVideoTracks()[0];
  trace(`Using video device: ${videoTrack.label}`);

  localPeerConnection = new RTCPeerConnection(undefined);
  trace("Created local peer connection object localPeerConnection");

  localPeerConnection.addEventListener("icecandidate", cbHandleConnection as EventListener);
  localPeerConnection.addEventListener("iceconnectionstatechange", cbHandleConnectionChange as EventListener);

  remotePeerConnection = new RTCPeerConnection(undefined);
  trace("Created remote peer connection object remotePeerConnection");

  remotePeerConnection.addEventListener("icecandidate", cbHandleConnection as EventListener);
  remotePeerConnection.addEventListener("iceconnectionstatechange", cbHandleConnectionChange as EventListener);
  remotePeerConnection.addEventListener("track", cbGotRemoteMediaStreamTrack);

  localPeerConnection.addTrack(videoTrack);
  trace("Added local stream to localPeerConnection");

  trace("localPeerConnection starting createOffer");
  localPeerConnection
    .createOffer(offerOptions)
    .then(createdOffer)
    .catch(setSessionDescriptionError);
}

function endButtonAction() {
  localPeerConnection.close();
  remotePeerConnection.close();
  endButton.disabled = true;
  callButton.disabled = false;
  trace("Ending call over RTCPeerConnection");
}

function cbGotLocalMediaStream(mediaStream: MediaStream) {
  localMediaStream = mediaStream;
  localVideoHTMLElement.srcObject = localMediaStream;
  trace("Received local media stream");
  callButton.disabled = false;
}

function cbHandleLocalMediaStreamError(error: MediaStreamError) {
  trace(`navigator.getUserMedia error: ${error}`);
}

function cbGotRemoteMediaStreamTrack(event: RTCTrackEvent) {
  remoteMediaStream = new MediaStream([event.track]);
  remoteVideoHTMLElement.srcObject = remoteMediaStream;
  trace("Remote peer connection received remote stream");
}

function logVideoLoaded(event: Event) {
  const video = event.target as HTMLVideoElement;
  trace(`${video.id}: ${video.videoWidth}x${video.videoHeight}px`);
}

function logResizedVideo(event: UIEvent) {
  logVideoLoaded(event);
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = 0;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms`);
  }
}

function cbHandleConnection(event: RTCPeerConnectionIceEvent) {
  const peerConnection = event.target as RTCPeerConnection;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate as RTCIceCandidateInit);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer
      .addIceCandidate(newIceCandidate)
      .then(() => {
        handleConnectionSuccess(peerConnection);
      })
      .catch(error => {
        handleConnectionFailure(peerConnection, error);
      });
    const rtcIceCandidate: RTCIceCandidate | null = event.candidate;
    trace(`${getPeerName(peerConnection)} ICE candidate:\n` + `${rtcIceCandidate}.`);
  }
}

function handleConnectionSuccess(peerConnection: RTCPeerConnection) {
  trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
}

function handleConnectionFailure(peerConnection: RTCPeerConnection, error: RTCError) {
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` + `${error}.`);
}

function cbHandleConnectionChange(event: RTCPeerConnectionIceEvent) {
  const peerConnection = event.target as RTCPeerConnection;
  console.log("ICE state change event: ", event);
  trace(`${getPeerName(peerConnection)} ICE state: ` + `${peerConnection.iceConnectionState}`);
}

function setSessionDescriptionError(error: RTCError) {
  trace(`Failed to create session description: ${error}`);
}

function setDescriptionSuccess(peerConnection: RTCPeerConnection, functionName: string) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}

function setLocalDescriptionSuccess(peerConnection: RTCPeerConnection) {
  setDescriptionSuccess(peerConnection, "setLocalDescription");
}

function setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection) {
  setDescriptionSuccess(peerConnection, "setRemoteDescription");
}

function createdOffer(description: RTCSessionDescriptionInit) {
  // trace(`Offer from localPeerConnection:\n${description.sdp}`);
  trace(`Offer from localPeerConnection`);
  trace("localPeerConnection setLocalDescription start");
  localPeerConnection
    .setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    })
    .catch(setSessionDescriptionError);

  trace("remotePeerConnection setRemoteDescription start.");
  remotePeerConnection
    .setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(remotePeerConnection);
    })
    .catch(setSessionDescriptionError);

  trace("remotePeerConnection createAnswer start.");
  remotePeerConnection
    .createAnswer()
    .then(createdAnswer)
    .catch(setSessionDescriptionError);
}

function createdAnswer(description: RTCSessionDescriptionInit) {
  // trace(`Answer from remotePeerConnection:\n${description.sdp}.`);
  trace(`Answer from remotePeerConnection`);
  trace("remotePeerConnection setLocalDescription start.");
  remotePeerConnection
    .setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(remotePeerConnection);
    })
    .catch(setSessionDescriptionError);

  trace("localPeerConnection setRemoteDescription start.");
  localPeerConnection
    .setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
    })
    .catch(setSessionDescriptionError);
}

function getOtherPeer(peerConnection: RTCPeerConnection) {
  return peerConnection === localPeerConnection ? remotePeerConnection : localPeerConnection;
}

function getPeerName(peerConnection: RTCPeerConnection) {
  return peerConnection === localPeerConnection ? "localPeerConnection" : "remotePeerConnection";
}

function trace(text: string) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);
  console.log(now, text);
}

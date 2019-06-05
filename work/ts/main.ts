let startTime: number = 0;

const constraints: MediaStreamConstraints = { video: true };
const options: RTCOfferOptions = { offerToReceiveVideo: true };

const localVideo: HTMLVideoElement = document.getElementById("localVideo") as HTMLVideoElement;
const remoteVideo: HTMLVideoElement = document.getElementById("remoteVideo") as HTMLVideoElement;

let localMediaStream: MediaStream;
let remoteMediaStream: MediaStream;

let localPeerConnection: RTCPeerConnection;
let remotePeerConnection: RTCPeerConnection;

localVideo.addEventListener("loadedmetadata", logVideoLoaded);
remoteVideo.addEventListener("loadedmetadata", logVideoLoaded);
remoteVideo.addEventListener("resize", logVideoResized);

const startButton: HTMLButtonElement = document.getElementById("startButton") as HTMLButtonElement;
const callButton: HTMLButtonElement = document.getElementById("callButton") as HTMLButtonElement;
const endButton: HTMLButtonElement = document.getElementById("endButton") as HTMLButtonElement;

startButton.disabled = false;
callButton.disabled = true;
endButton.disabled = true;

startButton.addEventListener("click", cbStartButton);
callButton.addEventListener("click", cbCallButton);
endButton.addEventListener("click", cbEndButton);

function cbStartButton(): void {
  trace("Getting user media stream");

  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia(constraints).then(cbGotUserMediaStream).catch(cbHandleUserMediaStreamError);
}

function cbCallButton(): void {
  trace("Calling a peer over RTCPeerConnection");
  startTime = window.performance.now();

  callButton.disabled = true;
  endButton.disabled = false;

  const localVideoTrack = localMediaStream.getVideoTracks()[0];
  trace("Using local video device: " + localVideoTrack.label);

  localPeerConnection = new RTCPeerConnection();
  trace("Created local peer connection object localPeerConnection");
  localPeerConnection.addEventListener("icecandidate", cbHandleConnection);
  localPeerConnection.addEventListener("iceconnectionstatechange", cbHandleConnectionChange);
  localPeerConnection.addTrack(localVideoTrack);
  trace("Added local media stream track to localPeerConnection");

  remotePeerConnection = new RTCPeerConnection();
  trace("Created remote peer connection object remotePeerConnection");
  remotePeerConnection.addEventListener("icecandidate", cbHandleConnection);
  remotePeerConnection.addEventListener("iceconnectionstatechange", cbHandleConnectionChange);
  remotePeerConnection.addEventListener("track", cbGotRemoteMediaStreamTrack);

  trace("localPeerConnection starting createOffer");
  localPeerConnection.createOffer(options)
    .then(cbCreatedOffer)
    .catch(cbHandleSessionDescriptionError);
}

function cbEndButton(): void {
  localPeerConnection.removeTrack(localPeerConnection.getSenders()[0]);
  localPeerConnection.close();
  remotePeerConnection.removeTrack(remotePeerConnection.getSenders()[0]);
  remotePeerConnection.close();
  endButton.disabled = true;
  callButton.disabled = false;
  trace("Call over RTCPeerConnection ended");
}

function cbHandleConnection(event: RTCPeerConnectionIceEvent): void {
  const peerConnection: RTCPeerConnection = event.target as RTCPeerConnection;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate as RTCIceCandidateInit);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(newIceCandidate)
      .then(() => { handleConnectionSuccess(peerConnection); })
      .catch(error => { handleConnectionFailure(peerConnection, error); });
    const rtcIceCandidate: RTCIceCandidate | null = event.candidate;
    trace(`${getPeerName(peerConnection)} ICE candidate:\n` + `${rtcIceCandidate}.`);
  }
}

function handleConnectionSuccess(peerConnection: RTCPeerConnection): void {
  trace(getPeerName(peerConnection) + "addIceCandidate success");
}

function handleConnectionFailure(peerConnection: RTCPeerConnection, error: RTCError): void {
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` + `${error}.`);
}

function cbHandleConnectionChange(event: Event): void {
  const peerConnection = event.target as RTCPeerConnection;
  console.log("ICE state change event: ", event);
  trace(`${getPeerName(peerConnection)} ICE state: ` + `${peerConnection.iceConnectionState}`);
}

function cbGotUserMediaStream(mediaStream: MediaStream): void {
  localMediaStream = mediaStream;
  localVideo.srcObject = localMediaStream;
  callButton.disabled = false;
  trace("Got user media stream");
}

function cbHandleUserMediaStreamError(error: MediaStreamError): void {
  if (error.message) {
    trace(error.message);
  }
}

function cbGotRemoteMediaStreamTrack(event: RTCTrackEvent): void {
  remoteMediaStream = new MediaStream([event.track]);
  remoteVideo.srcObject = remoteMediaStream;
  trace("Remote peer connection received remote media stream");
}

function cbCreatedOffer(description: RTCSessionDescriptionInit): void {
  trace("Offer created by localPeerConnection");
  trace("localPeerConnection starting setLocalDescription");
  localPeerConnection.setLocalDescription(description)
    .then(() => { setLocalDescriptionSuccess(localPeerConnection); })
    .catch(cbHandleSessionDescriptionError);

  trace("remotePeerConnection starting setRemoteDescription");
  remotePeerConnection.setRemoteDescription(description)
    .then(() => { setRemoteDescriptionSuccess(remotePeerConnection); })
    .catch(cbHandleSessionDescriptionError);

  trace("remotePeerConnection starting createAnswer");
  remotePeerConnection.createAnswer()
    .then(cbCreatedAnswer)
    .catch(cbHandleSessionDescriptionError);
}

function cbCreatedAnswer(description: RTCSessionDescriptionInit): void {
  trace("Answer created by remotePeerConnection");
  trace("remotePeerConnection starting setLocalDescription");
  remotePeerConnection.setLocalDescription(description)
    .then(() => { setLocalDescriptionSuccess(remotePeerConnection); })
    .catch(cbHandleSessionDescriptionError);

  trace("localPeerConnection starting setRemoteDescription");
  localPeerConnection.setRemoteDescription(description)
    .then(() => { setRemoteDescriptionSuccess(localPeerConnection); })
    .catch(cbHandleSessionDescriptionError);
}

function setLocalDescriptionSuccess(peerConnection: RTCPeerConnection): void {
  setDescriptionSuccess(peerConnection, "setLocalDescription");
}

function setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection): void {
  setDescriptionSuccess(peerConnection, "setRemoteDescription");
}

function setDescriptionSuccess(peerConnection: RTCPeerConnection, functionName: string): void {
  trace(getPeerName(peerConnection) + " completed " + functionName);
}

function cbHandleSessionDescriptionError(error: RTCError): void {
  if (error.message) {
    trace(error.message);
  }
}

// Helper functions

function logVideoLoaded(event: Event): void {
  const video: HTMLVideoElement = event.target as HTMLVideoElement;
  const size: string = "(" + video.videoHeight.toString() + "x" + video.videoWidth.toString() + "px)";
  trace("Media stream is loaded into " + video.id + " " + size);
}

function logVideoResized(event: UIEvent): void {
  logVideoLoaded(event);
  if (startTime) {
    const elapsedTime: number = window.performance.now() - startTime;
    trace("Setup time: " + elapsedTime.toFixed(3) + "ms");
    startTime = 0;
  }
}

function getOtherPeer(peerConnection: RTCPeerConnection): RTCPeerConnection {
  return (peerConnection === localPeerConnection) ? remotePeerConnection : localPeerConnection;
}

function getPeerName(peerConnection: RTCPeerConnection): string {
  return (peerConnection === localPeerConnection) ? "localPeerConnection" : "remotePeerConnection";
}

function trace(text: string): void {
  const now = (window.performance.now() / 1000).toFixed(3);
  console.log(now, text.trim());
}

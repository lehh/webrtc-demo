//Must have adapter.js before this file.
'use strict';

/** 
 * @param {object} signalingData object containing a service MessageService object property
 * and a channel string property
 * @param {object} streamConstrants object containing the getUserMedia streamConstrants
 * @param {object} DOMVideoElements localVideo, remoteVideo and hangUp elements
*/
class WebRTCCall {
    constructor(signalingData, streamConstrants, DOMVideoElements) {
        this.localVideo = DOMVideoElements.localVideo;
        this.remoteVideo = DOMVideoElements.remoteVideo;
        this.hangUp = DOMVideoElements.hangUp;
        this.signalingService = signalingData.service;
        this.signalingChannel = signalingData.channel;
        this.streamConstrants = streamConstrants;
        this._peerConnection = null;
        this._candidatesQueue = [];
    }

    startCall() {
        navigator.mediaDevices.getUserMedia(this.streamConstrants)
            .then((localStream) => {
                this.localVideo.srcObject = localStream;

                this.createPeerConnection();

                localStream.getTracks().forEach((track) => {
                    this._peerConnection.addTrack(track, localStream)
                });

                this.hangUp.disabled = false;

            }).catch((err) => {
                console.error(`Error while starting the call: ${err}`);
                this.closeCall();
            });
    }

    createPeerConnection() {
        if (this.onGoingCall()) {
            console.error(`Call has already started`);
            return;
        }

        this._peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                  urls: [
                    'stun:numb.viagenie.ca'
                  ]
                },
                {
                  urls: [
                    'turn:numb.viagenie.ca'
                  ],
                  username: 'aleterre13@gmail.com',
                  credential: 'z1bc79oT'
                }
              ]
        });

        this._peerConnection.onicecandidate = this.handleICECandidateEvent.bind(this);
        this._peerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
        this._peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
        this._peerConnection.ontrack = this.handleTrackEvent.bind(this);
        this._peerConnection.onremovetrack = this.handleRemoveTrackEvent.bind(this);
        this._peerConnection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
        this._peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
    }

    handleNegotiationNeededEvent() {
        this._peerConnection.createOffer()
            .then((offer) => {
                return this._peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                let message = {
                    type: "WebRTCSignal",
                    value: "video-offer",
                    content: this._peerConnection.localDescription
                };

                this.signalingService.sendMessage(message, this.signalingChannel);
            })
            .catch((err) => {
                console.log('error ' + err);
            });
    }

    handleICECandidateEvent(event) {
        let message = {
            type: "WebRTCSignal",
            value: 'new-ice-candidate',
            content: event.candidate
        };

        this.signalingService.sendMessage(message, this.signalingChannel);
    }

    handleSignalMessage(data) {
        let message = data.message;

        if (message.value === "video-offer") {
            if (this.confirmCall(data.publisher)) {
                this.handleVideoOfferMessage(message.content);
                return;
            }
            this.sendOfferDeclinedMessage();
            return;
        }

        if (message.value === "offer-declined") {
            alert('declined');
            this.closeCall();
            return;
        }

        if (message.value === "video-answer") {
            this.handleVideoAnswerMessage(message.content);
            return;
        }

        if (message.value === "new-ice-candidate") {
            this.handleNewICECandidate(message.content);
            return;
        }
    }

    handleNewICECandidate(candidate) {
        if (!candidate) {
            return;
        }

        //Since Chrome send ICE Candidates before answer is received, it's needed to put the candidates into a queue.
        if (!this._peerConnection || !this._peerConnection.remoteDescription) {
            let iceCandidate = new RTCIceCandidate(candidate);
            this._candidatesQueue.push(iceCandidate);
            return;
        }

        let iceCandidate = new RTCIceCandidate(candidate);

        this._peerConnection.addIceCandidate(iceCandidate)
            .catch((err) => {
                console.log(err);
            })
    }

    addQueuedIceCandidates() {
        if (this._candidatesQueue.length <= 0) {
            return;
        }

        this._candidatesQueue.forEach((candidate) => {
            this._peerConnection.addIceCandidate(candidate)
                .catch((err) => {
                    console.log(err);
                })
        });
    }

    handleVideoAnswerMessage(sdp) {
        let sessionDesc = new RTCSessionDescription(sdp);

        this._peerConnection.setRemoteDescription(sessionDesc)
            .catch((err) => {
                console.log(err);
                this.closeCall();
            });

        this.addQueuedIceCandidates();
    }

    handleVideoOfferMessage(sdp) {
        this.createPeerConnection();

        let sessionDesc = new RTCSessionDescription(sdp);

        this._peerConnection.setRemoteDescription(sessionDesc)
            .then(() => {
                return navigator.mediaDevices.getUserMedia(this.streamConstrants);
            }).then((remoteStream) => {
                this.localVideo.srcObject = remoteStream;

                remoteStream.getTracks().forEach((track) => {
                    this._peerConnection.addTrack(track, remoteStream);
                });
            }).then(() => {
                return this._peerConnection.createAnswer();
            }).then((answer) => {
                return this._peerConnection.setLocalDescription(answer);
            }).then(() => {
                let message = {
                    type: "WebRTCSignal",
                    value: "video-answer",
                    content: this._peerConnection.localDescription
                };

                this.signalingService.sendMessage(message, this.signalingChannel);

                this.hangUp.disabled = false;

                this.addQueuedIceCandidates();
            }).catch((err) => {
                console.log('error ' + err);
                this.closeCall();
            });
    }

    handleTrackEvent(event) {
        this.remoteVideo.srcObject = event.streams[0];
    }

    handleRemoveTrackEvent() {
        let stream = this.remoteVideo.srcObject;
        let trackList = stream.getTracks();

        if (trackList.length == 0) {
            this.closeCall();
        }
    }

    handleICEConnectionStateChangeEvent() {
        switch (this._peerConnection.iceConnectionState) {
            case "closed":
            case "failed":
            case "disconnected":
                this.hangUp.click();
                break;
        }
    }

    handleSignalingStateChangeEvent() {
        switch (this._peerConnection.signalingState) {
            case "closed":
                this.hangUp.click();
                break;
        }
    }

    confirmCall(publisher) {
        return confirm(`${publisher} is calling you, answer call?`);
    }

    sendOfferDeclinedMessage() {
        let message = {
            type: "WebRTCSignal",
            value: "offer-declined"
        };

        this.signalingService.sendMessage(message, this.signalingChannel);
    }

    onGoingCall() {
        return this._peerConnection !== null && this._peerConnection instanceof RTCPeerConnection;
    }

    closeCall() {
        if (this._peerConnection) {
            this._peerConnection.ontrack = null;
            this._peerConnection.onremovetrack = null;
            this._peerConnection.onremovestream = null;
            this._peerConnection.onicecandidate = null;
            this._peerConnection.oniceconnectionstatechange = null;
            this._peerConnection.onsignalingstatechange = null;
            this._peerConnection.onicegatheringstatechange = null;
            this._peerConnection.onnegotiationneeded = null;
        }

        this._peerConnection.close();
        this._peerConnection = null;

        if (this.remoteVideo.srcObject) {
            this.remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        if (this.localVideo.srcObject) {
            this.localVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        this.remoteVideo.setAttribute("src", "");
        this.remoteVideo.setAttribute("srcObject", "");
        this.localVideo.setAttribute("src", "");
        this.localVideo.setAttribute("srcObject", "");

        this.hangUp.disabled = true;
    }

    handleICEGatheringStateChangeEvent(event) {
        console.log(event);
    }
}
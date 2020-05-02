# webrtc-demo

A WebRTC javascript demo script using PubNub as messaging service.

You can check it out by opening the [WebRTC Demo Website](https://webrtctest2.000webhostapp.com/) in two windows of the same browser. One normal window and a private window.

The objective of this demo is to help people understand and develop webrtc calls in a easier manner, since all the core functions are already created here. You will need to just copy, paste and do some adjustments :). 

It contains three main files:

### [**messagingService.js**](messagingService.js)

File containing a class MessagingService used to create an abstraction for the messaging service.

### [**webrtc.js**](webrtc.js)

This file has a class WebRTCCall responsible for handling all steps of the WebRTC connection.
It uses [adapter.js](https://github.com/webrtchacks/adapter) declared in the [html](index.html).

The constructor receives: 

* MessagingService instance for sending signaling messages (video-offer, video-answer and new-ice-candidate);
* Channel where messages will be sent;
* Stream Constrants object;
* The DOM elements related to the video call (local video, remote video and hang-up button);

**Note:** if you or your company already have a STUN and/or TURN server, please configure your credentials.

```javascript
this._peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                  urls: [
                    'stun:yourSTUNServerUrl'
                  ]
                },
                {
                  urls: [
                    'turn:yourTURNServerUrl'
                  ],
                  username: 'username',
                  credential: 'password'
                }
              ]
        });
```

More information inside the [file](webrtc.js) itself.

### [**index.js**](index.js)

This file is responsible for handling HTML events, managing user data, setting up and managing the MessagingService and WebRTCCall instances.

## References

[WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

[WebRTC Signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)

[WebRTC Samples](https://webrtc.github.io/samples/)
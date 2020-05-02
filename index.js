'use strict';

//This project is using PUBNUB to do the messaging exchange. The connection configuration is at messagingService.js

$(document).ready(() => {
    let userChannel = null;

    let onlineUsersArray = [];

    let messagingService = null;
    let webRtcCall = null;

    $("#connectBtn").on("click", () => {
        setUserChannel();
        startChat();
        $(".connected").show();
        $(".notConnected").hide();
    });

    $("#disconnectBtn").on("click", () => {
        if (onGoingVideoCall())
            webRtcCall.closeCall();

        leaveChat();
        $(".notConnected").show();
        $(".connected").hide();
        $("#onlineUsers #userList").html("");
        $("#video").hide();
    });

    $("#sendMessage").on("click", () => {
        let message = {
            type: "user-message",
            content: $('#messageText').val()
        };

        messagingService.sendMessage(message, userChannel);
    });

    $("#requestVideo").on("click", () => {
        createWebRtcCall(userChannel);
        webRtcCall.startCall();

        $("#video").show();
    });

    $("#hangUp").on("click", () => {
        $("#video").hide();

        if (!webRtcCall) {
            return;
        }

        webRtcCall.closeCall();
        webRtcCall = null;
    });

    $(window).on("unload", () => {
        leaveChannels();
    });

    $(window).on("beforeunload", () => {
        leaveChannels();
    });

    let setUserChannel = () => {
        userChannel = $("#channel").val();

        if (channel === "") {
            userChannel = "default";
        }
    }

    let startChat = async () => {
        messagingService = new MessagingService();

        addListeners();

        await messagingService.subscribe([userChannel], { withPresence: true });

        $("#myUserId").html(messagingService.getUserId());

        setOnlineUsers();
    }

    let addListeners = () => {
        messagingService.addListener({
            message: (data) => {
                const message = data.message;
                const channel = data.channel;
                const publisher = data.publisher;

                if (message.type === "user-message") {
                    $('#chatMessages').append(message.content);
                    return;
                }

                if (message.type === "WebRTCSignal") {
                    if (!webRtcCall) {
                        createWebRtcCall(channel);
                    }

                    if (message.value === "offer-declined") {
                        $("#video").hide();
                    }

                    if (message.value === "video-offer") {
                        $("#video").show();
                    }

                    if (publisher === messagingService.getUserId()) {
                        return;
                    }

                    webRtcCall.handleSignalMessage(data);
                }
            },
            presence: async (presence) => {
                let action = presence.action; // join, leave, state-change or timeout
                let uuid = presence.uuid;

                if (messagingService.getUserId() === uuid) {
                    return;
                }

                if (action === "join") {
                    if (findOnlineUserIndexInArray(uuid) >= 0)
                        return;

                    let userData = {
                        uuid: uuid
                    };

                    onlineUsersArray.push(userData);

                    addUserToOnlineDiv(userData)
                    return;
                }

                if (action === "leave" || action === "timeout") {
                    let onlineUserIndex = findOnlineUserIndexInArray(uuid);

                    onlineUsersArray.splice(onlineUserIndex, 1);

                    removeUserFromOnlineDiv(uuid);
                }
            }
        });
    }

    let findOnlineUserIndexInArray = (uuid) => {
        return onlineUsersArray.findIndex((value, index) => {
            return value.uuid == uuid;
        });
    }

    let setOnlineUsers = async () => {
        var onlineUsers = {};

        onlineUsers = await messagingService.getOnlineUsers([userChannel]);

        let channels = Object.entries(onlineUsers.channels);

        if (channels.length <= 0)
            return;

        let channelData = channels[0][1];

        for (let user of channelData.occupants) {
            if (messagingService.getUserId() === user.uuid) {
                continue;
            }

            if (findOnlineUserIndexInArray(user.uuid) >= 0)
                continue;

            let userData = {
                uuid: user.uuid
            };

            onlineUsersArray.push(userData);
            addUserToOnlineDiv(userData);
        }
    }

    let addUserToOnlineDiv = (userData) => {
        let paragraph = document.createElement("p");
        paragraph.id = `${userData.uuid}`;
        paragraph.innerHTML = userData.uuid;

        let userListDiv = $("#onlineUsers #userList");
        userListDiv.append(paragraph);
    }

    let removeUserFromOnlineDiv = (uuid) => {
        let user = document.getElementById(`${uuid}`);
        if (user) {
            user.remove();
        }
    }

    let leaveChat = async () => {
        leaveChannels();
        removeListeners();
        await messagingService.closeConnection();
    }

    let removeListeners = async () => {
        await messagingService.removeListener({
            presence: () => { },
            message: () => { }
        });
    }

    let leaveChannels = async () => {
        if (messagingService)
            await messagingService.unsubscribeAll();
    }

    let onGoingVideoCall = () => {
        return webRtcCall && webRtcCall.onGoingCall();
    }

    let createWebRtcCall = (channel) => {
        if (!messagingService || !channel) {
            return;
        }

        let signalingData = {
            service: messagingService,
            channel: channel
        };

        let streamConstrants = {
            audio: true,
            video: true
        };

        let DOMVideoElements = {
            localVideo: $("#localVideo")[0],
            remoteVideo: $("#remoteVideo")[0],
            hangUp: $("#hangUp")[0]
        }

        webRtcCall = new WebRTCCall(signalingData, streamConstrants, DOMVideoElements);
    }
});
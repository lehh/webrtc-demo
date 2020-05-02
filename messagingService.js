class MessagingService {
    constructor() {
        this._service = new PubNub({
            subscribeKey: "sub-c-af9c417a-84d7-11ea-a961-f6bfeb2ef611",
            publishKey: "pub-c-cca42a1f-ca43-42a7-9535-29007ad72560",
            heartbeatInterval: 10,
            autoNetworkDetection: true, // enable for non-browser environment automatic reconnection
            restore: true, // enable catchup on missed messages
        });
    }

    closeConnection() {
        return this._service.stop();
    }

    getUserId() {
        return this._service.getUUID();
    }

    addListener(listener) {
        this._service.addListener(listener);
    }

    async removeListener(listener) {
        await this._service.removeListener(listener);
    }

    async subscribe(channels, options) {
        let properties = {
            channels: channels
        };

        if (options instanceof Object) {
            Object.assign(properties, options);
        }

        await this._service.subscribe(properties);
    }

    async unsubscribe(channels) {
        await this._service.unsubscribe({
            channels: channels
        });
    }

    async unsubscribeAll() {
        await this._service.unsubscribeAll();
    }

    sendMessage(message, channel) {
        this._service.publish({
            message: message,
            channel: channel,
        }, (status, response) => {
            console.log(status);
            console.log(response);
        });
    }

    getOnlineUsers(channels = null, groups = null) {
        let properties = {
            includeUUIDs: true
        };

        if (channels && channels !== null)
            properties.channels = channels;

        if (groups && groups !== null)
            properties.channelGroups = groups;

        return this._service.hereNow(properties);
    }
}
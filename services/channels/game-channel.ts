import Redis from "ioredis";

export class GameChannel {
    private redis: Redis;
    private channelId: string;

    constructor(id: string) {
        this.redis = new Redis();
        this.channelId = id;
        console.log("Game channel created ->", id);
    }

    async publish(message: string) {
        await this.redis.publish(this.channelId, message);
        console.log(`Message published to channel [${this.channelId}]:`, message);
    }

    async subscribe(callback: (message: string) => void) {
        const subscriber = new Redis();
        await subscriber.subscribe(this.channelId);
        console.log(`Subscribed to channel -> ${this.channelId}`);

        subscriber.on("message", (channel, message) => {
            if (channel === this.channelId) {
                console.log(`Message received from channel [${channel}]:`, message);
                callback(message);
            }
        });
    }

    async unsubscribe() {
        const subscriber = new Redis();
        await subscriber.unsubscribe(this.channelId);
        console.log(`Unsubscribed from channel -> ${this.channelId}`);
        subscriber.disconnect();
    }

    close() {
        this.redis.disconnect();
        console.log("Game channel connection closed ->", this.channelId);
    }
}

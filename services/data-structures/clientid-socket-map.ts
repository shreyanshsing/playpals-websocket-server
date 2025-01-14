import Redis from "ioredis";
import { Server, Socket } from "socket.io";
import { Redis_Eums } from "./enum";
import dotenv from "dotenv";

dotenv.config();

export class ClientIdSocketMap {
    private redis: Redis;
    private io: Server;

    constructor(io: Server) {
        // TODO: remove while dev
        const redisURL = process.env.REDISCLOUD_URL!;
        this.redis = new Redis(redisURL);
        this.io = io;
    }

    // Store the full Socket object using the clientId as the key
    async set(clientId: string, socket: Socket) {
        // Store the Socket object as JSON (or just store socket.id if you prefer)
        await this.redis.hset(Redis_Eums.CLIENT_ID_SOCKET_MAP, clientId, socket.id);
    }

    // Delete the client from the map
    async del(clientId: string) {
        await this.redis.hdel(Redis_Eums.CLIENT_ID_SOCKET_MAP, clientId);
    }

    async getSocketFromClientId(clientId: string): Promise<Socket | null> {
        const socketId = await this.redis.hget(Redis_Eums.CLIENT_ID_SOCKET_MAP, clientId);
        if (socketId) {
            return this.io.sockets.sockets.get(socketId) as Socket;
        }
        return null;
    }
}

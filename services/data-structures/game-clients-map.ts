import Redis from "ioredis";
import { Redis_Eums } from "./enum";
import dotenv from "dotenv";

dotenv.config();

export class GameClientsMap {
    private redis: Redis;

    constructor() {
        const redisURL = process.env.REDISCLOUD_URL!;
        this.redis = new Redis(redisURL);
    }

    async set(gameId: string, clientId: string) {
        const result = await this.redis.hget(Redis_Eums.GAME_CLIENTS_MAP, gameId);
        console.log("result", result);
        let clients = result ? JSON.parse(result) : [];
        clients.push(clientId);
        await this.redis.hset(Redis_Eums.GAME_CLIENTS_MAP, gameId, JSON.stringify(clients));
    }

    async get(gameId: string) {
        const result = await this.redis.hget(Redis_Eums.GAME_CLIENTS_MAP, gameId);
        return result ? JSON.parse(result) : null;
    }

    async del(gameId: string) {
        await this.redis.hdel(Redis_Eums.GAME_CLIENTS_MAP, gameId);
    }
}
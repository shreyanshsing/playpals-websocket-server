import Redis from "ioredis";
import { Redis_Eums } from "./enum";
import dotenv from "dotenv";

dotenv.config();

export class GameGridMap {
    private redis: Redis;

    constructor() {
        const redisURL = process.env.REDISCLOUD_URL!;
        this.redis = new Redis(redisURL);
    }

    async set(gameId: string, grid: string) {
        await this.redis.hset(Redis_Eums.GAME_GRID_MAP, gameId, grid);
    }

    async get(gameId: string) {
        return await this.redis.hget(Redis_Eums.GAME_GRID_MAP, gameId);
    }

    async del(gameId: string) {
        await this.redis.hdel(Redis_Eums.GAME_GRID_MAP, gameId);
    }
}
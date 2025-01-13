import Redis from "ioredis";
import { Redis_Eums } from "./enum";

export class GameGridMap {
    private redis: Redis;

    constructor() {
        this.redis = new Redis();
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
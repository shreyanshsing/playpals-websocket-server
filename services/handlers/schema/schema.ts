import z from "zod";
import { WebSocketMessageType } from "../../config/enum";

export const updatePlayerSchema = z.object({
    symbol: z.string().min(1).max(1).optional(),
    color: z.string().optional(),
});

export const updateGameSchema = z.object({
    status: z.enum([
        WebSocketMessageType.GAME_PENDING,
        WebSocketMessageType.GAME_START,
        WebSocketMessageType.GAME_LIVE,
        WebSocketMessageType.GAME_OVER,
        WebSocketMessageType.GAME_RESET,
    ]).optional(),
    winner: z.string().optional(),
});
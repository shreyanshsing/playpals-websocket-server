import axios from "axios";
import { serverURL } from "../../config/data";

export const getGameData = async (gameId: string) => {
    try {
        // Get the game status from the database
        // ...
        console.log("Getting game status...", `${serverURL}/game-server/${gameId}`);
        const res = await axios.get(`${serverURL}/game-server/${gameId}`);
        return { success: true, data: res.data };
    } catch (error: any) {
        console.error("Error getting game status:", error.message);
        return { success: false, error: error.message };
    }
}

export const updateGameData = async (gameId: string, data: any) => {
    try {
        // Update the game status in the database
        // ...
        const res = await axios.put(`${serverURL}/game-server/${gameId}`, data);
        console.log("Game updated:", res.data);
        return { success: true, data: res.data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
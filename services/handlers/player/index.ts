import z from "zod";
import { updatePlayerSchema } from "../schema/schema";
import axios from "axios";
import { serverURL } from "../../config/data";

export const updatePlayer = async (playerId: string, data: z.infer<typeof updatePlayerSchema>) => {
    try {
        // Update the player in the database
        // ...
        const res = await axios.put(`${serverURL}/player/${playerId}`, data);
        return { success: true, data: res.data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
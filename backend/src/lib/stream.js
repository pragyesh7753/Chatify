import { StreamChat } from 'stream-chat';
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("STREAM_API_KEY or STREAM_API_SECRET is missing.");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
    try {
        await streamClient.upsertUsers([userData])
        return userData
    } catch (error) {
        console.error("Error upserting Stream user:", error);
    }
}

// TODO: Do it later
export const generateStreamToken = (userId) => {
    try {
        
    } catch (error) {

    }
}
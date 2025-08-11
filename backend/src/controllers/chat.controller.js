import { generateStreamToken } from "../lib/stream.js";

export async function getStreamToken(req, res) {
    try {
        // Logic to generate and return a stream token
        const token = generateStreamToken(req.user.id);

        return res.status(200).json({ token });
    } catch (error) {
        console.error("Error in  getStreamToken controller", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
import { Client, Databases, Query } from "node-appwrite";
import logger from "./logger.js";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

export const databases = new Databases(client);

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
export const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;
export const FRIEND_REQUESTS_COLLECTION_ID = process.env.APPWRITE_FRIEND_REQUESTS_COLLECTION_ID;
export const REFRESH_TOKENS_COLLECTION_ID = process.env.APPWRITE_REFRESH_TOKENS_COLLECTION_ID;

export { Query };

export const connectAppwrite = async () => {
  try {
    await databases.list();
    logger.info("Appwrite Connected Successfully");
  } catch (error) {
    logger.error("Error connecting to Appwrite", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

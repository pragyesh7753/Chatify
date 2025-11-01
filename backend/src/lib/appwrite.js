import { Client, Databases, Query } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

export const databases = new Databases(client);

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
export const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;
export const FRIEND_REQUESTS_COLLECTION_ID = process.env.APPWRITE_FRIEND_REQUESTS_COLLECTION_ID;

export { Query };

export const connectAppwrite = async () => {
  try {
    await databases.list();
    console.log("Appwrite Connected Successfully");
  } catch (error) {
    console.log("Error connecting to Appwrite:", error);
    process.exit(1);
  }
};

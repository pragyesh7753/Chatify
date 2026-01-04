import { databases, DATABASE_ID, Query } from "../lib/appwrite.js";

const FCM_TOKENS_COLLECTION_ID = process.env.APPWRITE_FCM_TOKENS_COLLECTION_ID;

export const saveFCMTokenService = async (userId, token) => {
  try {
    // Try to update existing document
    const docs = await databases.listDocuments(DATABASE_ID, FCM_TOKENS_COLLECTION_ID, [
      Query.equal("userId", userId)
    ]);

    if (docs.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        FCM_TOKENS_COLLECTION_ID,
        docs.documents[0].$id,
        { token }
      );
    } else {
      // Create new document
      await databases.createDocument(
        DATABASE_ID,
        FCM_TOKENS_COLLECTION_ID,
        "unique()",
        { userId, token }
      );
    }
  } catch (error) {
    throw error;
  }
};

export const getFCMTokenService = async (userId) => {
  try {
    const docs = await databases.listDocuments(DATABASE_ID, FCM_TOKENS_COLLECTION_ID, [
      Query.equal("userId", userId)
    ]);
    return docs.documents[0]?.token || null;
  } catch (error) {
    return null;
  }
};

export const removeFCMTokenService = async (userId) => {
  try {
    const docs = await databases.listDocuments(DATABASE_ID, FCM_TOKENS_COLLECTION_ID, [
      Query.equal("userId", userId)
    ]);
    if (docs.documents.length > 0) {
      await databases.deleteDocument(
        DATABASE_ID,
        FCM_TOKENS_COLLECTION_ID,
        docs.documents[0].$id
      );
    }
  } catch (error) {
    throw error;
  }
};

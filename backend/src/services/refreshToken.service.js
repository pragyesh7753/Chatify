import { databases, DATABASE_ID, REFRESH_TOKENS_COLLECTION_ID, Query } from "../lib/appwrite.js";
import { ID } from "node-appwrite";

export const RefreshTokenService = {
  async create(userId, refreshToken, expiresAt) {
    const tokenId = ID.unique();
    const doc = await databases.createDocument(
      DATABASE_ID,
      REFRESH_TOKENS_COLLECTION_ID,
      tokenId,
      {
        userId,
        refreshToken,
        expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
      }
    );
    return { ...doc, _id: doc.$id };
  },

  async findByToken(refreshToken) {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        REFRESH_TOKENS_COLLECTION_ID,
        [Query.equal("refreshToken", refreshToken)]
      );
      if (result.documents.length === 0) return null;
      const doc = result.documents[0];
      return { ...doc, _id: doc.$id };
    } catch (error) {
      console.error("Error finding refresh token:", error);
      return null;
    }
  },

  async findByUserId(userId) {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        REFRESH_TOKENS_COLLECTION_ID,
        [Query.equal("userId", userId)]
      );
      return result.documents.map(doc => ({ ...doc, _id: doc.$id }));
    } catch (error) {
      console.error("Error finding user tokens:", error);
      return [];
    }
  },

  async deleteByToken(refreshToken) {
    try {
      const token = await this.findByToken(refreshToken);
      if (token) {
        await databases.deleteDocument(DATABASE_ID, REFRESH_TOKENS_COLLECTION_ID, token._id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting refresh token:", error);
      return false;
    }
  },

  async deleteByUserId(userId) {
    try {
      const tokens = await this.findByUserId(userId);
      await Promise.all(
        tokens.map(token => 
          databases.deleteDocument(DATABASE_ID, REFRESH_TOKENS_COLLECTION_ID, token._id)
        )
      );
      return true;
    } catch (error) {
      console.error("Error deleting user tokens:", error);
      return false;
    }
  },

  async deleteExpired() {
    try {
      const now = new Date().toISOString();
      const result = await databases.listDocuments(
        DATABASE_ID,
        REFRESH_TOKENS_COLLECTION_ID,
        [Query.lessThan("expiresAt", now)]
      );
      await Promise.all(
        result.documents.map(doc => 
          databases.deleteDocument(DATABASE_ID, REFRESH_TOKENS_COLLECTION_ID, doc.$id)
        )
      );
      return result.documents.length;
    } catch (error) {
      console.error("Error deleting expired tokens:", error);
      return 0;
    }
  },
};

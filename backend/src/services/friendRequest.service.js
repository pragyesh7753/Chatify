import { databases, DATABASE_ID, FRIEND_REQUESTS_COLLECTION_ID, Query } from "../lib/appwrite.js";
import { ID } from "node-appwrite";

export const FriendRequestService = {
  async create(data) {
    const requestId = ID.unique();
    const doc = await databases.createDocument(
      DATABASE_ID,
      FRIEND_REQUESTS_COLLECTION_ID,
      requestId,
      {
        ...data,
        status: data.status || "pending",
      }
    );
    return { ...doc, _id: doc.$id };
  },

  async findById(id) {
    try {
      const doc = await databases.getDocument(DATABASE_ID, FRIEND_REQUESTS_COLLECTION_ID, id);
      return { ...doc, _id: doc.$id };
    } catch (error) {
      if (error.code === 404) return null;
      throw error;
    }
  },

  async findOne(query) {
    const queries = [];
    
    if (query.$or) {
      // Appwrite doesn't support $or directly, so we need to make multiple queries
      const results = await Promise.all(
        query.$or.map(async condition => {
          const q = Object.entries(condition).map(([key, value]) => Query.equal(key, value));
          const result = await databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_COLLECTION_ID, q);
          return result.documents;
        })
      );
      const allDocs = results.flat();
      if (allDocs.length === 0) return null;
      return { ...allDocs[0], _id: allDocs[0].$id };
    }

    Object.entries(query).forEach(([key, value]) => {
      queries.push(Query.equal(key, value));
    });

    const result = await databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_COLLECTION_ID, queries);
    if (result.documents.length === 0) return null;
    return { ...result.documents[0], _id: result.documents[0].$id };
  },

  async find(query) {
    const queries = [];
    
    Object.entries(query).forEach(([key, value]) => {
      queries.push(Query.equal(key, value));
    });

    const result = await databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_COLLECTION_ID, queries);
    return result.documents.map(doc => ({ ...doc, _id: doc.$id }));
  },

  async save(request) {
    const updates = { ...request };
    delete updates._id;
    delete updates.$id;
    delete updates.$createdAt;
    delete updates.$updatedAt;
    delete updates.$permissions;
    delete updates.$databaseId;
    delete updates.$collectionId;

    const doc = await databases.updateDocument(
      DATABASE_ID,
      FRIEND_REQUESTS_COLLECTION_ID,
      request._id,
      updates
    );
    return { ...doc, _id: doc.$id };
  },

  async populate(request, field, select) {
    if (!request[field]) return request;
    
    const { UserService } = await import("./user.service.js");
    const populated = await UserService.findById(request[field]);
    
    if (select && populated) {
      const fields = select.split(" ");
      const result = { _id: populated._id };
      fields.forEach(f => {
        if (populated[f] !== undefined) result[f] = populated[f];
      });
      request[field] = result;
    } else {
      request[field] = populated;
    }

    return request;
  }
};

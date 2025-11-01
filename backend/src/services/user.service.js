import { databases, DATABASE_ID, USERS_COLLECTION_ID, Query } from "../lib/appwrite.js";
import { ID } from "node-appwrite";
import bcrypt from "bcryptjs";

export const UserService = {
  async create(userData) {
    const userId = ID.unique();
    const data = { ...userData };
    if (data.friends) {
      data.friends = JSON.stringify(data.friends);
    }
    const doc = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      data
    );
    const result = { ...doc, _id: doc.$id };
    if (result.friends) {
      result.friends = JSON.parse(result.friends);
    }
    return result;
  },

  async findById(id) {
    try {
      const doc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, id);
      const result = { ...doc, _id: doc.$id };
      if (result.friends) {
        result.friends = JSON.parse(result.friends);
      }
      return result;
    } catch (error) {
      if (error.code === 404) return null;
      throw error;
    }
  },

  async findOne(query) {
    const queries = Object.entries(query).map(([key, value]) => {
      if (key === "_id") return Query.equal("$id", value);
      return Query.equal(key, value);
    });

    const result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, queries);
    if (result.documents.length === 0) return null;
    const doc = { ...result.documents[0], _id: result.documents[0].$id };
    if (doc.friends) {
      doc.friends = JSON.parse(doc.friends);
    }
    return doc;
  },

  async find(query) {
    const queries = [];
    
    if (query.$and) {
      query.$and.forEach(condition => {
        Object.entries(condition).forEach(([key, value]) => {
          if (key === "_id" && value.$ne) {
            queries.push(Query.notEqual("$id", value.$ne));
          } else if (key === "_id" && value.$nin) {
            value.$nin.forEach(id => queries.push(Query.notEqual("$id", id)));
          } else if (key === "username" && value.$regex) {
            queries.push(Query.search("username", value.$regex));
          } else if (typeof value === "object" && !value.$ne && !value.$nin && !value.$regex) {
            queries.push(Query.equal(key, value));
          } else if (typeof value !== "object") {
            queries.push(Query.equal(key, value));
          }
        });
      });
    } else {
      Object.entries(query).forEach(([key, value]) => {
        if (key === "_id") {
          queries.push(Query.equal("$id", value));
        } else {
          queries.push(Query.equal(key, value));
        }
      });
    }

    const result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, queries);
    return result.documents.map(doc => {
      const user = { ...doc, _id: doc.$id };
      if (user.friends) {
        user.friends = JSON.parse(user.friends);
      }
      return user;
    });
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const updates = { ...updateData };
    
    if (updates.$addToSet) {
      const current = await this.findById(id);
      Object.entries(updates.$addToSet).forEach(([key, value]) => {
        const currentArray = current[key] || [];
        if (!currentArray.includes(value)) {
          updates[key] = [...currentArray, value];
        } else {
          updates[key] = currentArray;
        }
      });
      delete updates.$addToSet;
    }

    if (updates.friends) {
      updates.friends = JSON.stringify(updates.friends);
    }

    const doc = await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, id, updates);
    const result = { ...doc, _id: doc.$id };
    if (result.friends) {
      result.friends = JSON.parse(result.friends);
    }
    return result;
  },

  async findByIdAndDelete(id) {
    await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, id);
  },

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  },

  async matchPassword(enteredPassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(enteredPassword, hashedPassword);
  },

  async populate(user, field, select) {
    if (!user[field]) return user;
    
    const ids = Array.isArray(user[field]) ? user[field] : [user[field]];
    const populated = await Promise.all(
      ids.map(id => this.findById(id))
    );

    if (select) {
      const fields = select.split(" ");
      const filtered = populated.map(doc => {
        if (!doc) return null;
        const result = { _id: doc._id };
        fields.forEach(f => {
          if (doc[f] !== undefined) result[f] = doc[f];
        });
        return result;
      });
      user[field] = Array.isArray(user[field]) ? filtered : filtered[0];
    } else {
      user[field] = Array.isArray(user[field]) ? populated : populated[0];
    }

    return user;
  }
};

import { UserService } from "../services/user.service.js";
import { databases, DATABASE_ID, USERS_COLLECTION_ID, Query } from "./appwrite.js";

export const cleanupExpiredEmailChanges = async () => {
  try {
    const now = new Date();
    
    // Find users with expired email change tokens
    const allUsers = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.isNotNull("emailChangeToken")]
    );

    let count = 0;
    for (const user of allUsers.documents) {
      if (user.emailChangeTokenExpires && new Date(user.emailChangeTokenExpires) < now) {
        await UserService.findByIdAndUpdate(user.$id, {
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeTokenExpires: null,
        });
        count++;
      }
    }

    if (count > 0) {
      console.log(`Cleaned up ${count} expired email change requests`);
    }

    return count;
  } catch (error) {
    console.error("Error cleaning up expired email changes:", error);
    throw error;
  }
};

// Cleanup expired email verification tokens as well
export const cleanupExpiredVerificationTokens = async () => {
  try {
    const now = new Date();
    
    // Find users with expired verification tokens
    const allUsers = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.isNotNull("verificationToken")]
    );

    let count = 0;
    for (const user of allUsers.documents) {
      if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < now) {
        await UserService.findByIdAndUpdate(user.$id, {
          verificationToken: null,
          verificationTokenExpires: null,
        });
        count++;
      }
    }

    if (count > 0) {
      console.log(`Cleaned up ${count} expired verification tokens`);
    }

    return count;
  } catch (error) {
    console.error("Error cleaning up expired verification tokens:", error);
    throw error;
  }
};

// Combined cleanup function
export const cleanupExpiredTokens = async () => {
  console.log("Running cleanup for expired tokens...");
  
  try {
    const emailChanges = await cleanupExpiredEmailChanges();
    const verificationTokens = await cleanupExpiredVerificationTokens();
    
    console.log(`Cleanup completed: ${emailChanges} email changes, ${verificationTokens} verification tokens`);
  } catch (error) {
    console.error("Error during token cleanup:", error);
  }
};

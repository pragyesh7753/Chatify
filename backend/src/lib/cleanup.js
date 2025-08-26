import User from "../models/User.js";

export const cleanupExpiredEmailChanges = async () => {
  try {
    const now = new Date();
    
    // Find users with expired email change tokens
    const result = await User.updateMany(
      {
        emailChangeTokenExpires: { $lt: now },
        emailChangeToken: { $ne: null }
      },
      {
        $unset: {
          pendingEmail: "",
          emailChangeToken: "",
          emailChangeTokenExpires: ""
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Cleaned up ${result.modifiedCount} expired email change requests`);
    }

    return result.modifiedCount;
  } catch (error) {
    console.error("Error cleaning up expired email changes:", error);
    throw error;
  }
};

// Cleanup expired email verification tokens as well
export const cleanupExpiredVerificationTokens = async () => {
  try {
    const now = new Date();
    
    // Find users with expired verification tokens (but don't delete unverified users, just clear tokens)
    const result = await User.updateMany(
      {
        verificationTokenExpires: { $lt: now },
        verificationToken: { $ne: null }
      },
      {
        $unset: {
          verificationToken: "",
          verificationTokenExpires: ""
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Cleaned up ${result.modifiedCount} expired verification tokens`);
    }

    return result.modifiedCount;
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

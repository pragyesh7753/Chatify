import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { sendVerificationEmail, generateVerificationToken, sendEmailChangeVerification } from "../lib/email.js";
import { cleanupExpiredEmailChanges } from "../lib/cleanup.js";
import cloudinary from "../lib/cloudinary.js";

export async function searchUsersByUsername(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: "Username query is required" });
    }

    // Search for users by username (case-insensitive partial match)
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // exclude current user
        { _id: { $nin: currentUser.friends } }, // exclude current user's friends
        { isOnboarded: true },
        { username: { $regex: username.trim(), $options: "i" } }, // case-insensitive search
      ],
    }).select("fullName profilePic username nativeLanguage bio location");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsersByUsername controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("friends")
      .populate("friends", "fullName profilePic nativeLanguage username");

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A friend request already exists between you and this user" });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // add each user to the other's friends array
    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate("sender", "fullName profilePic nativeLanguage username");

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    }).populate("recipient", "fullName profilePic");

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    }).populate("recipient", "fullName profilePic nativeLanguage username");

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle custom photo upload
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'chatify/profiles',
              transformation: [
                { width: 400, height: 400, crop: 'fill' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        updateData.profilePic = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }

    // Handle email changes separately
    let emailChanged = false;
    if (updateData.email && updateData.email !== currentUser.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate email change token
      const emailChangeToken = generateVerificationToken();
      const emailChangeTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Set pending email change
      currentUser.pendingEmail = updateData.email;
      currentUser.emailChangeToken = emailChangeToken;
      currentUser.emailChangeTokenExpires = emailChangeTokenExpires;

      // Send verification email to new email address
      try {
        await sendEmailChangeVerification(updateData.email, emailChangeToken, currentUser.fullName);
        emailChanged = true;
      } catch (emailError) {
        console.error("Failed to send email change verification:", emailError);
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.email; // Handle email separately above
    delete updateData.password;
    delete updateData.friends;
    delete updateData.isVerified;
    delete updateData.verificationToken;
    delete updateData.verificationTokenExpires;
    delete updateData.isOnboarded;
    delete updateData.pendingEmail;
    delete updateData.emailChangeToken;
    delete updateData.emailChangeTokenExpires;

    // Validate fullName if provided
    if (updateData.fullName && updateData.fullName.trim().length < 2) {
      return res.status(400).json({ message: "Full name must be at least 2 characters long" });
    }

    // Validate username if provided
    if (updateData.username) {
      const username = updateData.username.trim().toLowerCase();
      
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      updateData.username = username;
    }

    // Validate profilePic URL if provided
    if (updateData.profilePic && updateData.profilePic.trim()) {
      try {
        new URL(updateData.profilePic);
      } catch (error) {
        return res.status(400).json({ message: "Invalid profile picture URL" });
      }
    }

    // Trim string values
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim();
      }
    });

    // Update other profile fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    // If email was changed, also save the email change data
    if (emailChanged) {
      await currentUser.save();
    }

    // Get the final user data to return
    const finalUser = await User.findById(userId).select("-password");

    if (!finalUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Provide appropriate response message
    let message = "Profile updated successfully!";
    if (emailChanged) {
      message = "Profile updated successfully! Please check your new email to verify the email change.";
    }

    res.status(200).json({
      message,
      user: finalUser,
      emailChanged
    });
  } catch (error) {
    console.error("Error in updateProfile controller", error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;

    // Run cleanup to remove any expired pending email changes
    await cleanupExpiredEmailChanges();

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Request email change
export async function requestEmailChange(req, res) {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ message: "New email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Check if user is requesting to change to the same email
    const currentUser = await User.findById(userId);
    if (currentUser.email === newEmail) {
      return res.status(400).json({ message: "New email is the same as current email" });
    }

    // Generate email change token
    const emailChangeToken = generateVerificationToken();
    const emailChangeTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with pending email change
    currentUser.pendingEmail = newEmail;
    currentUser.emailChangeToken = emailChangeToken;
    currentUser.emailChangeTokenExpires = emailChangeTokenExpires;
    await currentUser.save();

    // Send verification email to new email address
    try {
      await sendEmailChangeVerification(newEmail, emailChangeToken, currentUser.fullName);
    } catch (emailError) {
      console.error("Failed to send email change verification:", emailError);
      // Clear the pending change if email sending fails
      currentUser.pendingEmail = null;
      currentUser.emailChangeToken = null;
      currentUser.emailChangeTokenExpires = null;
      await currentUser.save();
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

    res.status(200).json({
      message: "Verification email sent to new email address. Please check your email to confirm the change.",
      pendingEmail: newEmail
    });
  } catch (error) {
    console.error("Error in requestEmailChange controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Verify email change
export async function verifyEmailChange(req, res) {
  try {
    const { token } = req.params;

    console.log("Starting email change verification for token:", token);

    // Run cleanup before verification to ensure we don't have stale tokens
    await cleanupExpiredEmailChanges();

    const user = await User.findOne({
      emailChangeToken: token,
      emailChangeTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      console.log("Email change verification failed: Invalid or expired token:", token);
      return res.status(400).json({
        message: "Invalid or expired email change token"
      });
    }

    // Store the new email before updating
    const newEmail = user.pendingEmail;
    const oldEmail = user.email;

    console.log("Email change verification found user:", { 
      userId: user._id,
      oldEmail: oldEmail,
      newEmail: newEmail,
      currentIsVerified: user.isVerified 
    });

    // Update email and clear pending change
    user.email = newEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpires = null;
    
    // Since the user has verified ownership of the new email by clicking the verification link,
    // we can set them as verified. No need for a second verification step.
    user.isVerified = true;
    
    // Clear any existing verification tokens since email is now verified
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    
    await user.save();

    console.log("Email change completed successfully:", {
      userId: user._id,
      newEmail: newEmail,
      isVerified: user.isVerified
    });

    res.status(200).json({
      message: "Email changed and verified successfully!",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error("Error in verifyEmailChange controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Resend email verification for current email
export async function resendEmailVerification(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken, user.fullName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

    res.status(200).json({
      message: "Verification email sent successfully!"
    });
  } catch (error) {
    console.error("Error in resendEmailVerification controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

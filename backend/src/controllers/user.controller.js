import { UserService } from "../services/user.service.js";
import { FriendRequestService } from "../services/friendRequest.service.js";
import { sendVerificationEmail, generateVerificationToken, sendEmailChangeVerification } from "../lib/email.js";
import { cleanupExpiredEmailChanges } from "../lib/cleanup.js";
import cloudinary from "../lib/cloudinary.js";

export async function searchUsersByUsername(req, res) {
  try {
    const currentUserId = req.user._id;
    const currentUser = req.user;
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: "Username query is required" });
    }

    // Search for users by username (case-insensitive partial match)
    const users = await UserService.find({
      $and: [
        { _id: { $ne: currentUserId } }, // exclude current user
        { _id: { $nin: currentUser.friends } }, // exclude current user's friends
        { isOnboarded: true },
        { username: { $regex: username.trim() } }, // case-insensitive search
      ],
    });

    const filtered = users.map(u => ({
      _id: u._id,
      fullName: u.fullName,
      profilePic: u.profilePic,
      username: u.username,
      nativeLanguage: u.nativeLanguage,
      bio: u.bio,
      location: u.location,
    }));

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error in searchUsersByUsername controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await UserService.findById(req.user._id || req.user.id);
    
    if (!user || !user.friends || user.friends.length === 0) {
      return res.status(200).json([]);
    }

    const friends = await Promise.all(
      user.friends.map(async friendId => {
        if (!friendId) return null;
        const friend = await UserService.findById(friendId);
        if (!friend) return null;
        return {
          _id: friend._id,
          fullName: friend.fullName,
          profilePic: friend.profilePic,
          nativeLanguage: friend.nativeLanguage,
          username: friend.username,
        };
      })
    );

    res.status(200).json(friends.filter(f => f !== null));
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user._id;
    const { id: recipientId } = req.params;

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await UserService.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends && recipient.friends.includes(myId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
    const existingRequest = await FriendRequestService.findOne({
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

    const friendRequest = await FriendRequestService.create({
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

    const friendRequest = await FriendRequestService.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Verify the current user is the recipient
    if (friendRequest.recipient !== req.user._id) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await FriendRequestService.save(friendRequest);

    // add each user to the other's friends array
    await UserService.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await UserService.findByIdAndUpdate(friendRequest.recipient, {
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
    const incomingReqs = await FriendRequestService.find({
      recipient: req.user._id,
      status: "pending",
    });

    const incomingWithSender = await Promise.all(
      incomingReqs.map(async req => {
        const sender = await UserService.findById(req.sender);
        return {
          ...req,
          sender: sender ? {
            _id: sender._id,
            fullName: sender.fullName,
            profilePic: sender.profilePic,
            nativeLanguage: sender.nativeLanguage,
            username: sender.username,
          } : null
        };
      })
    );

    const acceptedReqs = await FriendRequestService.find({
      sender: req.user._id,
      status: "accepted",
    });

    const acceptedWithRecipient = await Promise.all(
      acceptedReqs.map(async req => {
        const recipient = await UserService.findById(req.recipient);
        return {
          ...req,
          recipient: recipient ? {
            _id: recipient._id,
            fullName: recipient.fullName,
            profilePic: recipient.profilePic,
          } : null
        };
      })
    );

    res.status(200).json({ 
      incomingReqs: incomingWithSender.filter(r => r.sender !== null), 
      acceptedReqs: acceptedWithRecipient.filter(r => r.recipient !== null) 
    });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequestService.find({
      sender: req.user._id,
      status: "pending",
    });

    const outgoingWithRecipient = await Promise.all(
      outgoingRequests.map(async req => {
        const recipient = await UserService.findById(req.recipient);
        return {
          ...req,
          recipient: recipient ? {
            _id: recipient._id,
            fullName: recipient.fullName,
            profilePic: recipient.profilePic,
            nativeLanguage: recipient.nativeLanguage,
            username: recipient.username,
          } : null
        };
      })
    );

    res.status(200).json(outgoingWithRecipient.filter(r => r.recipient !== null));
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    
    // Get current user
    const currentUser = await UserService.findById(userId);
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
      const existingUser = await UserService.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate email change token
      const emailChangeToken = generateVerificationToken();
      const emailChangeTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Set pending email change
      await UserService.findByIdAndUpdate(userId, {
        pendingEmail: updateData.email,
        emailChangeToken,
        emailChangeTokenExpires: emailChangeTokenExpires.toISOString(),
      });

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
      const existingUser = await UserService.findOne({ username });
      if (existingUser && existingUser._id !== userId) {
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
    await UserService.findByIdAndUpdate(userId, updateData);

    // Get the final user data to return
    const finalUser = await UserService.findById(userId);
    const { password, ...userWithoutPassword } = finalUser;

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
      user: userWithoutPassword,
      emailChanged
    });
  } catch (error) {
    console.error("Error in updateProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const userId = req.user._id;

    // Run cleanup to remove any expired pending email changes
    await cleanupExpiredEmailChanges();

    const user = await UserService.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Request email change
export async function requestEmailChange(req, res) {
  try {
    const userId = req.user._id;
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
    const existingUser = await UserService.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Check if user is requesting to change to the same email
    const currentUser = await UserService.findById(userId);
    if (currentUser.email === newEmail) {
      return res.status(400).json({ message: "New email is the same as current email" });
    }

    // Generate email change token
    const emailChangeToken = generateVerificationToken();
    const emailChangeTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with pending email change
    await UserService.findByIdAndUpdate(userId, {
      pendingEmail: newEmail,
      emailChangeToken,
      emailChangeTokenExpires: emailChangeTokenExpires.toISOString(),
    });

    // Send verification email to new email address
    try {
      await sendEmailChangeVerification(newEmail, emailChangeToken, currentUser.fullName);
    } catch (emailError) {
      console.error("Failed to send email change verification:", emailError);
      // Clear the pending change if email sending fails
      await UserService.findByIdAndUpdate(userId, {
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeTokenExpires: null,
      });
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

    const allUsers = await UserService.find({ emailChangeToken: token });
    const user = allUsers.find(u => new Date(u.emailChangeTokenExpires) > new Date());

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
    await UserService.findByIdAndUpdate(user._id, {
      email: newEmail,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeTokenExpires: null,
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    console.log("Email change completed successfully:", {
      userId: user._id,
      newEmail: newEmail,
      isVerified: true
    });

    const updatedUser = await UserService.findById(user._id);

    res.status(200).json({
      message: "Email changed and verified successfully!",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
        isVerified: updatedUser.isVerified,
        isOnboarded: updatedUser.isOnboarded,
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
    const userId = req.user._id;
    const user = await UserService.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await UserService.findByIdAndUpdate(userId, {
      verificationToken,
      verificationTokenExpires: verificationTokenExpires.toISOString(),
    });

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

import { upsertStreamUser } from "../lib/stream.js";
import { sendVerificationEmail, generateVerificationToken } from "../lib/email.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";

// Sign up (creates unverified user and sends verification email)
export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a different one" });
    }

    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    // Generate a unique username based on the full name
    let baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (baseUsername.length < 3) {
      baseUsername = 'user' + Math.floor(Math.random() * 10000);
    }
    if (baseUsername.length > 15) {
      baseUsername = baseUsername.substring(0, 15);
    }

    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await User.findOne({ username })) {
      username = baseUsername + counter;
      counter++;
      if (username.length > 20) {
        username = baseUsername.substring(0, 15) + counter;
      }
    }

    // Generate verification token and expiration date
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24 hours

    const newUser = await User.create({
      email,
      fullName,
      username,
      password,
      profilePic: randomAvatar,
      verificationToken,
      verificationTokenExpires,
      isVerified: false,
    });

    // Send Verification Email
    try {
      await sendVerificationEmail(email, verificationToken, fullName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Delete the user if email sending fails
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

    // Don't create Stream user here, only after email verification
    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
      email: newUser.email,
    });
  } catch (error) {
    console.log("Error in signup controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Add email verification endpoint
export async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    console.log("Starting email verification for token:", token);

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      console.log("Verification failed: Invalid or expired token:", token);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    console.log("Found user for verification:", { 
      email: user.email, 
      isVerified: user.isVerified,
      userId: user._id 
    });

    // Verify the user
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    console.log("User verification completed:", { 
      email: user.email, 
      isVerified: user.isVerified,
      userId: user._id 
    });

    // Create Stream user after verification
    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.fullName,
        image: user.profilePic || "",
      });
    } catch (err) {
      console.log("Error creating Stream user:", err);
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d"
    });

    res.cookie("jwt", jwtToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });

    console.log("Email verification successful for user:", user.email);
    
    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
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
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

//Add resend verification email endpoint
export async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generate new verification token and expiration date
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send Verification Email
    await sendVerificationEmail(user.email, verificationToken, user.fullName);

    return res.status(200).json({ success: true, message: "Verification email sent successfully!" });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Login
export async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password)
      return res.status(400).json({ message: "All fields are required" });

    // Check if the input is an email or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername);
    
    // Find user by email or username
    const user = await User.findOne(
      isEmail 
        ? { email: emailOrUsername } 
        : { username: emailOrUsername.toLowerCase() }
    );
    
    if (!user)
      return res.status(401).json({ message: "Invalid email/username or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect)
      return res.status(401).json({ message: "Invalid email/username or password" });

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email first",
        needsVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // More permissive for development
      secure: process.env.NODE_ENV === "production",
    });

    // Return user without password
    const { password: userPassword, ...userWithoutPassword } = user.toObject();
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.log("Error in login controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Logout
export async function logout(req, res) {
  try {
    res.clearCookie("jwt", {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.clearCookie("jwt", {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ success: true, message: "Logout successful" });
  }
}

// Onboarding
export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, username, bio, nativeLanguage, location } = req.body;

    if (!fullName || !username || !bio || !nativeLanguage || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !username && "username",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !location && "location",
        ].filter(Boolean),
      });
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: "Username already taken" });
    }

    let profilePicUrl = req.body.profilePic;

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
        profilePicUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...req.body, 
        username: username.toLowerCase(), 
        profilePic: profilePicUrl,
        isOnboarded: true 
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding:", streamError.message);
    }

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

import { sendVerificationEmail, generateVerificationToken, sendPasswordResetEmail } from "../lib/email.js";
import { UserService } from "../services/user.service.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration, setTokenCookies, clearTokenCookies } from "../utils/token.js";

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

    const existingUser = await UserService.findOne({ email });
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
    while (await UserService.findOne({ username })) {
      username = baseUsername + counter;
      counter++;
      if (username.length > 20) {
        username = baseUsername.substring(0, 15) + counter;
      }
    }

    // Generate verification token and expiration date
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24 hours

    const hashedPassword = await UserService.hashPassword(password);
    
    const newUser = await UserService.create({
      email,
      fullName,
      username,
      password: hashedPassword,
      profilePic: randomAvatar,
      verificationToken,
      verificationTokenExpires: verificationTokenExpires.toISOString(),
      isVerified: false,
      bio: "",
      nativeLanguage: "",
      location: "",
      isOnboarded: false,
      googleId: null,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    });

    // Send Verification Email
    try {
      await sendVerificationEmail(email, verificationToken, fullName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Delete the user if email sending fails
      await UserService.findByIdAndDelete(newUser._id);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

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

    const allUsers = await UserService.find({ verificationToken: token });
    const user = allUsers.find(u => new Date(u.verificationTokenExpires) > new Date());

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
    await UserService.findByIdAndUpdate(user._id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    console.log("User verification completed:", { 
      email: user.email, 
      isVerified: true,
      userId: user._id 
    });

    // Clear any existing refresh tokens for this user before creating new ones
    await RefreshTokenService.deleteByUserId(user._id);

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    // Store refresh token in separate collection
    await RefreshTokenService.create(user._id, refreshToken, refreshTokenExpires);

    // Set token cookies
    setTokenCookies(res, accessToken, refreshToken);

    console.log("Email verification successful for user:", user.email);
    
    const updatedUser = await UserService.findById(user._id);
    
    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
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
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

//Add resend verification email endpoint
export async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await UserService.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generate new verification token and expiration date
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UserService.findByIdAndUpdate(user._id, {
      verificationToken,
      verificationTokenExpires: verificationTokenExpires.toISOString(),
    });

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
    const user = await UserService.findOne(
      isEmail 
        ? { email: emailOrUsername } 
        : { username: emailOrUsername.toLowerCase() }
    );
    
    if (!user)
      return res.status(401).json({ message: "Invalid email/username or password" });

    // Check if user signed up with Google OAuth
    if (user.googleId && !user.password) {
      return res.status(401).json({ 
        message: "This account was created with Google. Please use 'Continue with Google' to sign in." 
      });
    }

    const isPasswordCorrect = await UserService.matchPassword(password, user.password);
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

    // Clear any existing refresh tokens for this user before creating new ones
    await RefreshTokenService.deleteByUserId(user._id);

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    // Store refresh token in separate collection
    await RefreshTokenService.create(user._id, refreshToken, refreshTokenExpires);

    // Set token cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return user without password
    const { password: userPassword, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.log("Error in login controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Logout
export async function logout(req, res) {
  try {
    let tokensDeleted = false;
    
    // Clear refresh token from separate collection if user is authenticated
    if (req.user) {
      const deleted = await RefreshTokenService.deleteByUserId(req.user._id);
      if (deleted) {
        console.log('Deleted all refresh tokens for authenticated user:', req.user._id);
        tokensDeleted = true;
      }
    }
    
    // Also try to delete by token from cookie if available (fallback)
    const { refreshToken } = req.cookies;
    if (refreshToken && !tokensDeleted) {
      const deleted = await RefreshTokenService.deleteByToken(refreshToken);
      if (deleted) {
        console.log('Deleted refresh token from cookie');
      }
    }
    
    // Clear all token cookies
    clearTokenCookies(res);
    
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    
    // Clear cookies even if there's an error
    clearTokenCookies(res);
    
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
    const existingUser = await UserService.findOne({ username: username.toLowerCase() });
    if (existingUser && existingUser._id !== userId) {
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

    const updatedUser = await UserService.findByIdAndUpdate(
      userId,
      { 
        ...req.body, 
        username: username.toLowerCase(), 
        profilePic: profilePicUrl,
        isOnboarded: true 
      }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Forgot Password
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserService.findOne({ email });
    if (!user) {
      return res.status(200).json({ 
        success: true, 
        message: "If an account with that email exists, we've sent a password reset link." 
      });
    }

    const resetToken = generateVerificationToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await UserService.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetTokenExpires: resetTokenExpires.toISOString(),
    });

    await sendPasswordResetEmail(user.email, resetToken, user.fullName);

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link."
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Reset Password
export async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const allUsers = await UserService.find({ passwordResetToken: token });
    const user = allUsers.find(u => new Date(u.passwordResetTokenExpires) > new Date());

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await UserService.hashPassword(password);
    await UserService.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Change Password (for authenticated users)
export async function changePassword(req, res) {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentPasswordCorrect = await UserService.matchPassword(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await UserService.hashPassword(newPassword);
    await UserService.findByIdAndUpdate(userId, { password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Google OAuth callback
export async function googleCallback(req, res) {
  try {
    const user = req.user;
    
    if (!user) {
      console.error("Google OAuth: No user in request");
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    console.log("Google OAuth successful for user:", user.email);

    // Clear any existing refresh tokens for this user before creating new ones
    console.log("Google OAuth successful for user:", user.email);

    // Clear any existing refresh tokens for this user before creating new ones
    await RefreshTokenService.deleteByUserId(user._id);

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    // Store refresh token in separate collection
    await RefreshTokenService.create(user._id, refreshToken, refreshTokenExpires);

    // Set token cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Redirect to frontend based on onboarding status
    const redirectUrl = user.isOnboarded 
      ? `${process.env.FRONTEND_URL}/`
      : `${process.env.FRONTEND_URL}/onboarding`;
    
    console.log("Redirecting to:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in googleCallback:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
}

// Refresh Token - generate new access token using refresh token
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not provided" });
    }

    // Find refresh token in separate collection
    const tokenDoc = await RefreshTokenService.findByToken(refreshToken);

    if (!tokenDoc) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if refresh token is still valid
    if (new Date(tokenDoc.expiresAt) <= new Date()) {
      // Token expired, delete it
      await RefreshTokenService.deleteByToken(refreshToken);
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // Verify user still exists
    const user = await UserService.findById(tokenDoc.userId);
    if (!user) {
      await RefreshTokenService.deleteByToken(refreshToken);
      return res.status(401).json({ message: "User not found" });
    }

    // Verify user is still verified (in case admin revoked verification)
    if (!user.isVerified) {
      await RefreshTokenService.deleteByToken(refreshToken);
      return res.status(401).json({ message: "User account is no longer verified" });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(tokenDoc.userId);

    // Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      maxAge: 15 * 60 * 1000, // 15 minutes
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });

    console.log('Successfully refreshed access token for user:', user._id);

    // Return user data along with success message to avoid additional request
    const { password: userPassword, ...userWithoutPassword } = user;
    return res.status(200).json({ 
      success: true, 
      message: "Access token refreshed successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    console.log("Error in refreshToken controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

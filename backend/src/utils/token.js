import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate short-lived access token (15 minutes)
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
  });
};

// Generate long-lived refresh token (7 days)
export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Calculate refresh token expiration date
export const getRefreshTokenExpiration = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
};

// Set token cookies in response
export const setTokenCookies = (res, accessToken, refreshToken) => {
  // Access token cookie (15 minutes)
  res.cookie("accessToken", accessToken, {
    maxAge: 15 * 60 * 1000, // 15 minutes
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: '/',
  });

  // Refresh token cookie (7 days)
  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: '/',
  });
};

// Clear token cookies
export const clearTokenCookies = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: '/',
  });
  
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: '/',
  });
  
  // Also clear old jwt cookie for backward compatibility
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: '/',
  });
};

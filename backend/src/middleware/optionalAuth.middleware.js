import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service.js";
import logger from "../lib/logger.js";

export const optionalProtectRoute = async (req, res, next) => {
  try {
    // Support both new accessToken and old jwt cookie for backward compatibility
    const token = req.cookies.accessToken || req.cookies.jwt;

    if (!token) {
      return next(); // Continue without user if no token
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await UserService.findById(decoded.userId);
    
    if (user) {
      delete user.password;
    }

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    logger.error("Error in optionalProtectRoute middleware", { error: error.message });
    next(); // Continue without user if token is invalid
  }
};

import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service.js";
import logger from "../lib/logger.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.cookies.jwt;
    const refreshToken = req.cookies.refreshToken;

    if (!token) {
      // If no access token but refresh token exists, return token expired to trigger refresh
      if (refreshToken) {
        return res.status(401).json({ 
          message: "Unauthorized - Token expired"
        });
      }
      return res.status(401).json({ 
        message: "Unauthorized - No token provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
      return res.status(401).json({ 
        message: error.name === 'TokenExpiredError' 
          ? "Unauthorized - Token expired" 
          : "Unauthorized - Invalid token"
      });
    }

    if (!decoded) {
      return res.status(401).json({ 
        message: "Unauthorized - Invalid token"
      });
    }

    const user = await UserService.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        message: "Unauthorized - User not found"
      });
    }

    // Remove password before attaching to request
    if (user.password) {
      delete user.password;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.logError(req, error, "Error in protectRoute middleware");
    res.status(500).json({ message: "Internal Server Error" });
  }
};

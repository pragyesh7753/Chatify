import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Support both new accessToken and old jwt cookie for backward compatibility
    const token = req.cookies.accessToken || req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ 
        message: "Unauthorized - No token provided",
        needsRefresh: false
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: "Unauthorized - Token expired",
          needsRefresh: true // Signal frontend to try refreshing the token
        });
      }
      return res.status(401).json({ 
        message: "Unauthorized - Invalid token",
        needsRefresh: false
      });
    }

    if (!decoded) {
      return res.status(401).json({ 
        message: "Unauthorized - Invalid token",
        needsRefresh: false
      });
    }

    const user = await UserService.findById(decoded.userId);
    
    if (user) {
      delete user.password;
    }

    if (!user) {
      return res.status(401).json({ 
        message: "Unauthorized - User not found",
        needsRefresh: false
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Support both new accessToken and old jwt cookie for backward compatibility
    const token = req.cookies.accessToken || req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ 
        message: "Unauthorized - No token provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
      // Token is invalid or expired
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
    console.log("Error in protectRoute middleware", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service.js";

export const optionalProtectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

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
    console.log("Error in optionalProtectRoute middleware", error.message);
    next(); // Continue without user if token is invalid
  }
};

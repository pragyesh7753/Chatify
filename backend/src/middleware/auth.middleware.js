import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Enhanced logging for mobile debugging
    if (isMobile) {
      console.log('Mobile request detected:', {
        userAgent: userAgent.substring(0, 50) + '...',
        hasToken: !!token,
        cookies: Object.keys(req.cookies),
        origin: req.get('Origin'),
        referer: req.get('Referer')
      });
    }

    if (!token) {
      return res.status(401).json({ 
        message: "Unauthorized - No token provided",
        debug: isMobile ? {
          isMobile,
          cookieCount: Object.keys(req.cookies).length,
          userAgent: userAgent.substring(0, 100)
        } : undefined
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

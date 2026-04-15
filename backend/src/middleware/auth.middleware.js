import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
  // Verificar si la conexión ya se cerró
  if (req.socket.destroyed) {
    console.log("Connection already destroyed, skipping protectRoute");
    return;
  }

  try {
    console.log(" protectRoute middleware executing for:", req.path);
    
    const token = req.cookies.jwt;
    console.log(" Token from cookies:", token ? "Present" : "Missing");
    
    if (!token) {
      console.log(" No token provided");
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    console.log(" Token decoded successfully, userId:", decoded.userId);
    
    if (!decoded) {
      console.log(" Invalid token decoding");
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");
    console.log(" User found in DB:", user ? `Yes (${user.fullName})` : "No");
    
    if (!user) {
      console.log(" User not found in database");
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    console.log(" protectRoute completed successfully");
    next();
  } catch (error) {
    console.log(" Error in protectRoute middleware:", error.message);
    
    // Verificar si la respuesta ya fue enviada o la conexión se cerró
    if (res.headersSent || req.socket.destroyed) {
      console.log("Response already sent or connection destroyed, skipping error response");
      return;
    }
    
    // Manejo específico para ECONNRESET
    if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
      console.log("Connection reset in protectRoute");
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};
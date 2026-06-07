import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
  if (req.socket.destroyed) {
    console.log("Connection already destroyed, skipping protectRoute");
    return;
  }

  // 👈 EXCLUIR la ruta de logout de la autenticación
  if (req.path === "/logout") {
    console.log("⏩ Excluyendo /logout de autenticación");
    return next();
  }

  try {
    console.log("🔐 protectRoute middleware executing for:", req.path);
    
    const token = req.cookies.jwt;
    console.log("📌 Token from cookies:", token ? "Present" : "Missing");
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    console.log("✅ Token decoded successfully, userId:", decoded.userId);
    
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");
    console.log("✅ User found in DB:", user ? `Yes (${user.fullName})` : "No");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Actualizar lastSeen cada request activo (solo si ha pasado más de 1 minuto)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    if (!user.lastSeen || user.lastSeen < oneMinuteAgo) {
      user.lastSeen = new Date();
      user.lastSeenStatus = "online";
      await user.save();
      
      // Notificar cambio de estado
      const { io } = await import("../lib/socket.js");
      io.emit("userStatusChanged", {
        userId: user._id,
        status: "online",
        lastSeen: user.lastSeen
      });
    }

    req.user = user;
    console.log("✅ protectRoute completed successfully");
    next();
  } catch (error) {
    console.log("❌ Error in protectRoute middleware:", error.message);
    
    if (res.headersSent || req.socket.destroyed) {
      console.log("Response already sent or connection destroyed, skipping error response");
      return;
    }
    
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
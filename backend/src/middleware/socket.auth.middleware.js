import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

// ✅ Cache simple para evitar consultas repetidas
const userCache = new Map();
const CACHE_TTL = 60000; // 1 minuto

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // ✅ Extraer token de cookies
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("❌ Socket rejected: No token");
      return next(new Error("Unauthorized - No Token Provided"));
    }

    // ✅ Verificar token
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded) {
      console.log("❌ Socket rejected: Invalid token");
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // ✅ Buscar usuario con cache
    let user = userCache.get(decoded.userId);
    if (!user) {
      user = await User.findById(decoded.userId).select("-password").lean();
      if (user) {
        userCache.set(decoded.userId, user);
        setTimeout(() => userCache.delete(decoded.userId), CACHE_TTL);
      }
    }
    
    if (!user) {
      console.log("❌ Socket rejected: User not found");
      return next(new Error("User not found"));
    }

    socket.user = user;
    socket.userId = user._id.toString();

    console.log(`✅ Socket autenticado: ${user.fullName}`);

    next();
  } catch (error) {
    console.log("❌ Socket auth error:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};
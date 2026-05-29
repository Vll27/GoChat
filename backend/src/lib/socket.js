import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import User from "../models/User.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

export const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;
  userSocketMap[userId] = socket.id;

  await User.findByIdAndUpdate(userId, {
    lastSeen: new Date(),
    lastSeenStatus: "online"
  });

  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  io.emit("userStatusChanged", {
    userId: userId,
    status: "online",
    lastSeen: new Date()
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.user.fullName);
    
    const lastSeenTime = new Date();
    const disconnectedUserId = userId;
    const disconnectedUserName = socket.user.fullName;
    
    await User.findByIdAndUpdate(disconnectedUserId, {
      lastSeen: lastSeenTime,
      lastSeenStatus: "offline"
    });
    
    delete userSocketMap[disconnectedUserId];
    
    // Emitir eventos a TODOS los usuarios conectados
    const onlineUsersList = Object.keys(userSocketMap);
    
    io.emit("getOnlineUsers", onlineUsersList);
    io.emit("userStatusChanged", {
      userId: disconnectedUserId,
      status: "offline",
      lastSeen: lastSeenTime
    });
    io.emit("userOffline", {
      userId: disconnectedUserId,
      lastSeen: lastSeenTime
    });
    
    console.log(`✅ Usuario ${disconnectedUserName} ahora OFFLINE a las ${lastSeenTime}`);
    console.log(`📡 Usuarios online restantes: ${onlineUsersList.length}`);
  });
});

export { io, app, server };
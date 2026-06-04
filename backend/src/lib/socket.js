import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ENV.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e7,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

io.use(socketAuthMiddleware);

const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  const userIdStr = userId?.toString?.() || userId;
  return userSocketMap.get(userIdStr);
}

function setUserSocket(userId, socketId) {
  const userIdStr = userId.toString();
  userSocketMap.set(userIdStr, socketId);
}

function removeUserSocket(userId) {
  const userIdStr = userId.toString();
  userSocketMap.delete(userIdStr);
}

function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

io.on("connection", async (socket) => {
  console.log(`Usuario conectado: ${socket.user.fullName} (${socket.userId})`);

  const userId = socket.userId;
  const userIdStr = userId.toString();
  
  setUserSocket(userId, socket.id);

  const updatePendingMessagesToDelivered = async () => {
    try {
      console.log(`Buscando mensajes sent para usuario ${userIdStr}`);
      
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "sent"
      }).lean();
      
      console.log(`Mensajes sent encontrados: ${pendingMessages.length}`);
      
      if (pendingMessages.length === 0) {
        return;
      }
      
      const updateResult = await Message.updateMany(
        {
          receiverId: userId,
          status: "sent"
        },
        {
          $set: { status: "delivered" }
        }
      );
      
      console.log(`Actualizados ${updateResult.modifiedCount} mensajes a delivered`);
      
      const messagesBySender = new Map();
      
      for (const msg of pendingMessages) {
        const senderIdStr = msg.senderId.toString();
        if (!messagesBySender.has(senderIdStr)) {
          messagesBySender.set(senderIdStr, []);
        }
        messagesBySender.get(senderIdStr).push(msg._id.toString());
      }
      
      for (const [senderId, messageIds] of messagesBySender.entries()) {
        const senderSocketId = getReceiverSocketId(senderId);
        
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered_ack", {
            messageIds: messageIds,
            receiverId: userIdStr,
            timestamp: new Date().toISOString()
          });
          console.log(`Notificadas ${messageIds.length} entregas a emisor ${senderId}`);
        } else {
          console.log(`Emisor ${senderId} no esta online, no se envia notificacion`);
        }
      }
    } catch (error) {
      console.error("Error actualizando mensajes pendientes:", error);
    }
  };

  await updatePendingMessagesToDelivered();

  await User.findByIdAndUpdate(userId, {
    lastSeen: new Date(),
    lastSeenStatus: "online"
  });

  const onlineUsers = getOnlineUsers();
  io.emit("getOnlineUsers", onlineUsers);
  io.emit("userStatusChanged", {
    userId: userId,
    status: "online",
    lastSeen: new Date()
  });

  socket.on("request_pending_messages", async () => {
    try {
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "sent"
      }).lean();
      
      if (pendingMessages.length > 0) {
        console.log(`Enviando ${pendingMessages.length} mensajes pendientes a ${socket.user.fullName}`);
        socket.emit("pending_messages_batch", pendingMessages);
      }
    } catch (error) {
      console.error("Error en request_pending_messages:", error);
    }
  });

  socket.on("markPendingMessagesAsDelivered", async ({ senderId }) => {
    try {
      console.log(`Marcando mensajes de ${senderId} para usuario ${userIdStr} como delivered`);
      
      const result = await Message.updateMany(
        {
          senderId: senderId,
          receiverId: userId,
          status: "sent"
        },
        {
          $set: { status: "delivered" }
        }
      );
      
      if (result.modifiedCount > 0) {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered_ack", {
            messageIds: [],
            receiverId: userIdStr,
            timestamp: new Date().toISOString()
          });
          console.log(`Evento message_delivered_ack enviado a emisor ${senderId}`);
        }
        console.log(`${result.modifiedCount} mensajes marcados como delivered`);
      }
    } catch (error) {
      console.error("Error en markPendingMessagesAsDelivered:", error);
    }
  });

  socket.on("message_received_ack", async ({ messageId }) => {
    try {
      console.log(`[ACK] Procesando ACK para mensaje ${messageId} de usuario ${userIdStr}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[ACK] Mensaje ${messageId} no encontrado`);
        return;
      }
      
      console.log(`[ACK] Mensaje encontrado - sender: ${message.senderId}, receiver: ${message.receiverId}, current status: ${message.status}`);
      
      // Actualizar a delivered SIEMPRE que el estado sea "sent"
      // No importa si el receptor tiene otro chat abierto
      if (message.status === "sent") {
        message.status = "delivered";
        await message.save();
        console.log(`[ACK] Mensaje ${messageId} actualizado a delivered`);
        
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered_ack", {
            messageIds: [message._id.toString()],
            receiverId: userIdStr,
            timestamp: new Date().toISOString()
          });
          console.log(`[ACK] Evento message_delivered_ack enviado a emisor ${message.senderId}`);
        } else {
          console.log(`[ACK] Emisor ${message.senderId} no esta online, no se envia notificacion`);
        }
      } else {
        console.log(`[ACK] Mensaje ${messageId} ya estaba en estado ${message.status}, no se actualiza`);
      }
    } catch (error) {
      console.error("[ACK] Error en message_received_ack:", error);
    }
  });

  socket.on("message_read", async ({ messageId }) => {
    try {
      console.log(`[READ] Procesando lectura para mensaje ${messageId} de usuario ${userIdStr}`);
      
      const message = await Message.findById(messageId);
      if (message && message.receiverId.toString() === userIdStr && message.status !== "read") {
        const oldStatus = message.status;
        message.status = "read";
        await message.save();
        console.log(`[READ] Mensaje ${messageId} actualizado de ${oldStatus} a read`);
        
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_status_updated", {
            messageId: message._id.toString(),
            status: "read"
          });
          console.log(`[READ] Evento message_status_updated enviado a emisor ${message.senderId}`);
        }
      }
    } catch (error) {
      console.error("Error en message_read:", error);
    }
  });

  socket.on("chat_opened", async ({ senderId }) => {
    try {
      console.log(`[CHAT_OPENED] Usuario ${userIdStr} abrio chat con emisor ${senderId}`);
      
      const result = await Message.updateMany(
        {
          senderId: senderId,
          receiverId: userId,
          status: { $in: ["sent", "delivered"] }
        },
        { $set: { status: "read" } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`[CHAT_OPENED] Actualizados ${result.modifiedCount} mensajes a read`);
        
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("chat_marked_read", {
            byUserId: userIdStr,
            count: result.modifiedCount
          });
          console.log(`[CHAT_OPENED] Evento chat_marked_read enviado a emisor ${senderId}`);
        }
      } else {
        console.log(`[CHAT_OPENED] No se encontraron mensajes para marcar como leidos`);
      }
    } catch (error) {
      console.error("Error en chat_opened:", error);
    }
  });

  socket.on("typing_start", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_typing", {
        userId: socket.userId,
        fullName: socket.user.fullName
      });
    }
  });

  socket.on("typing_stop", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_stopped_typing", {
        userId: socket.userId
      });
    }
  });

  socket.on("disconnect", async () => {
    console.log(`Usuario desconectado: ${socket.user.fullName}`);
    
    const lastSeenTime = new Date();
    
    await User.findByIdAndUpdate(userId, {
      lastSeen: lastSeenTime,
      lastSeenStatus: "offline"
    });
    
    removeUserSocket(userId);
    
    const onlineUsers = getOnlineUsers();
    io.emit("getOnlineUsers", onlineUsers);
    io.emit("userStatusChanged", {
      userId: userId,
      status: "offline",
      lastSeen: lastSeenTime
    });
    
    console.log(`Usuarios online: ${onlineUsers.length}`);
  });
});

export { io, app, server };
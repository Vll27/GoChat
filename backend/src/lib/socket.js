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

  // ==================== EVENTOS PARA EDITAR Y ELIMINAR ====================

  socket.on("edit_message", async ({ messageId, newText }) => {
    try {
      console.log(`[EDIT] Usuario ${socket.userId} editando mensaje ${messageId}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[EDIT] Mensaje ${messageId} no encontrado`);
        return;
      }
      
      if (message.senderId.toString() !== socket.userId) {
        console.log(`[EDIT] Usuario no autorizado para editar mensaje ${messageId}`);
        return;
      }
      
      if (!message.originalText) {
        message.originalText = message.text;
      }
      
      message.text = newText;
      message.editedAt = new Date();
      await message.save();
      
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_edited", {
          messageId: message._id.toString(),
          newText: message.text,
          editedAt: message.editedAt
        });
        console.log(`[EDIT] Evento message_edited enviado a receptor ${message.receiverId}`);
      }
      
      socket.emit("message_edit_confirmed", {
        messageId: message._id.toString(),
        newText: message.text,
        editedAt: message.editedAt
      });
      
    } catch (error) {
      console.error("[EDIT] Error:", error);
    }
  });

  socket.on("delete_message", async ({ messageId, forEveryone = false }) => {
    try {
      console.log(`[DELETE] Usuario ${socket.userId} eliminando mensaje ${messageId}, paraTodos: ${forEveryone}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[DELETE] Mensaje ${messageId} no encontrado`);
        return;
      }
      
      const isSender = message.senderId.toString() === socket.userId;
      const isReceiver = message.receiverId.toString() === socket.userId;
      
      if (!isSender && !isReceiver) {
        console.log(`[DELETE] Usuario no autorizado`);
        return;
      }
      
      if (forEveryone && !isSender) {
        console.log(`[DELETE] Solo el emisor puede eliminar para todos`);
        return;
      }
      
      if (forEveryone) {
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.text = "Mensaje eliminado";
        message.image = null;
        await message.save();
        
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message_deleted", {
            messageId: message._id.toString(),
            deletedForEveryone: true
          });
          console.log(`[DELETE] Evento message_deleted enviado a receptor ${message.receiverId}`);
        }
      } else {
        // Eliminar solo para mí - marcamos isDeleted pero no cambiamos el texto para el otro usuario
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();
      }
      
      socket.emit("message_delete_confirmed", {
        messageId: message._id.toString(),
        deletedForEveryone: forEveryone
      });
      
    } catch (error) {
      console.error("[DELETE] Error:", error);
    }
  });

  // ==================== EVENTOS PARA REACCIONES ====================

  socket.on("react_to_message", async ({ messageId, emoji }) => {
    try {
      console.log(`[REACTION] Usuario ${socket.userId} reaccionando a mensaje ${messageId} con ${emoji}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[REACTION] Mensaje ${messageId} no encontrado`);
        return;
      }
      
      const existingReaction = message.reactions.find(
        (r) => r.userId.toString() === socket.userId
      );
      
      if (existingReaction) {
        existingReaction.emoji = emoji;
        existingReaction.createdAt = new Date();
      } else {
        message.reactions.push({
          userId: socket.userId,
          emoji,
          createdAt: new Date(),
        });
      }
      
      await message.save();
      
      const updatedMessage = await Message.findById(messageId)
        .populate("reactions.userId", "fullName email profilePic")
        .lean();
      
      const reactionData = {
        messageId: message._id.toString(),
        reactions: updatedMessage.reactions,
      };
      
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_reaction_updated", reactionData);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_reaction_updated", reactionData);
      }
      
      console.log(`[REACTION] Reacción actualizada para mensaje ${messageId}`);
      
    } catch (error) {
      console.error("[REACTION] Error:", error);
    }
  });

  socket.on("remove_reaction", async ({ messageId }) => {
    try {
      console.log(`[REACTION] Usuario ${socket.userId} eliminando reacción de mensaje ${messageId}`);
      
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`[REACTION] Mensaje ${messageId} no encontrado`);
        return;
      }
      
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== socket.userId
      );
      
      await message.save();
      
      const updatedMessage = await Message.findById(messageId)
        .populate("reactions.userId", "fullName email profilePic")
        .lean();
      
      const reactionData = {
        messageId: message._id.toString(),
        reactions: updatedMessage.reactions,
      };
      
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_reaction_updated", reactionData);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_reaction_updated", reactionData);
      }
      
      console.log(`[REACTION] Reacción eliminada del mensaje ${messageId}`);
      
    } catch (error) {
      console.error("[REACTION] Error:", error);
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
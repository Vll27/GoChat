import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { Readable } from "stream";

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
{
        folder: "chat-images",
        resource_type: "auto",
        timeout: 60000
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { search } = req.query;

    const me = await User.findById(loggedInUserId).select("contacts").lean();
    if (!me) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!me.contacts?.length) {
      return res.status(200).json([]);
    }

    const filter = { _id: { $in: me.contacts } };
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const contacts = await User.find(filter).select("-password").lean();
    res.status(200).json(contacts);
  } catch (error) {
    console.log("Error en getAllContacts:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { query } = req.query;

    if (!query?.trim()) {
      return res.status(200).json([]);
    }

    const filter = {
      _id: { $ne: loggedInUserId },
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    };

    const results = await User.find(filter).select("-password").limit(20).lean();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error en searchUsers:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;
    const { limit = 20, before } = req.query;
    
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    const orderedMessages = messages.reverse();
    
    const hasMore = messages.length === parseInt(limit);
    const nextCursor = hasMore && messages.length > 0 
      ? messages[0].createdAt 
      : null;
    
    res.status(200).json({
      messages: orderedMessages,
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.log("Error en getMessagesByUserId: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const imageFile = req.file;

    // Validación unificada
    const finalValidText = text || message || "";
    const finalValidImage = imageFile || image || null;

    if (!finalValidText && !finalValidImage) {
      return res.status(400).json({ message: "Se requiere texto, imagen o video." });
    }
    
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "No puedes enviarte mensajes a ti mismo." });
    }
    
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receptor no encontrado." });
    }

    let imageUrl = null;
    let mediaType;

    // Lógica híbrida para subir buffer (tuya) o base64 (de tu compañero) detectando videos
    if (imageFile?.buffer) {
      const uploadResponse = await uploadBufferToCloudinary(imageFile.buffer);
      imageUrl = uploadResponse.secure_url;
      mediaType = imageFile.mimetype.startsWith("video/") ? "video" : "image";
    } else if (typeof image === "string" && image.trim() !== "") {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat-images",
        timeout: 60000,
        resource_type: "auto"
      });
      imageUrl = uploadResponse.secure_url;
      mediaType = uploadResponse.resource_type === "video" ? "video" : "image";
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: finalValidText,
      image: imageUrl,
      mediaType,
      status: "sent",
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    
    if (receiverSocketId) {
      const senderInfo = await User.findById(senderId).select("fullName email profilePic").lean();
      
      const messageWithSender = {
        ...newMessage.toObject(),
        sender: senderInfo
      };
      
      io.to(receiverSocketId).emit("newMessage", messageWithSender);
      console.log(`Mensaje enviado a receptor ${receiverId} (socket: ${receiverSocketId})`);
    } else {
      console.log(`Receptor ${receiverId} no esta online, mensaje guardado como sent`);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error en sendMessage: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const lastMessages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
    
    if (lastMessages.length === 0) {
      return res.status(200).json([]);
    }
    
    const partnerIds = [...new Set(
      lastMessages.flatMap(msg => 
        msg.senderId.toString() === userId.toString() 
          ? [msg.receiverId.toString()] 
          : [msg.senderId.toString()]
      )
    )];
    
    const partners = await User.find({ _id: { $in: partnerIds } })
      .select("fullName email profilePic lastSeen lastSeenStatus")
      .lean();
      
    const partnerMap = new Map(partners.map(p => [p._id.toString(), p]));
    
    const chats = [];
    const seenChats = new Set();
    
    for (const msg of lastMessages) {
      const partnerId = msg.senderId.toString() === userId.toString() 
        ? msg.receiverId.toString() 
        : msg.senderId.toString();
      
      if (seenChats.has(partnerId)) continue;
      seenChats.add(partnerId);
      
      const partner = partnerMap.get(partnerId);
      if (!partner) continue;
      
      chats.push({
        _id: partnerId,
        user: partner,
        lastMessage: msg,
        unreadCount: 0
      });
    }
    
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error en getChatPartners: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const validStatuses = ["sent", "delivered", "read"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado no valido" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    if (status === "delivered" || status === "read") {
      if (message.receiverId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "No autorizado" });
      }
    }

    message.status = status;
    await message.save();

    const targetUserId = status === "read" || status === "delivered" 
      ? message.senderId 
      : message.receiverId;
    
    const targetSocketId = getReceiverSocketId(targetUserId.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit("message_status_updated", {
        messageId: message._id.toString(),
        status: status
      });
    }

    res.status(200).json({ message: "Estado actualizado", status: message.status });
  } catch (error) {
    console.error("Error en updateMessageStatus:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const userId = req.user._id;

    const result = await Message.updateMany(
      {
        senderId: senderId,
        receiverId: userId,
        status: { $in: ["sent", "delivered"] }
      },
      { $set: { status: "read" } }
    );

    const targetSocketId = getReceiverSocketId(senderId);
    if (targetSocketId && result.modifiedCount > 0) {
      io.to(targetSocketId).emit("chat_marked_read", {
        byUserId: userId.toString(),
        count: result.modifiedCount
      });
    }

    res.status(200).json({ 
      message: "Mensajes marcados como leidos", 
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error("Error en markMessagesAsRead:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// ==================== FUNCIONES PARA EDITAR Y ELIMINAR ====================

export const getMessageInfo = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate("senderId", "fullName email profilePic")
      .populate("receiverId", "fullName email profilePic")
      .lean();

    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const isParticipant = message.senderId._id.toString() === userId.toString() ||
                          message.receiverId._id.toString() === userId.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const messageInfo = {
      _id: message._id,
      text: message.text,
      image: message.image,
      status: message.status,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isEdited: message.editedAt !== null,
      isDeleted: message.isDeleted,
      sender: {
        _id: message.senderId._id,
        fullName: message.senderId.fullName,
        email: message.senderId.email,
        profilePic: message.senderId.profilePic,
      },
      receiver: {
        _id: message.receiverId._id,
        fullName: message.receiverId.fullName,
        email: message.receiverId.email,
        profilePic: message.receiverId.profilePic,
      }
    };

    res.status(200).json(messageInfo);
  } catch (error) {
    console.error("Error en getMessageInfo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "El texto del mensaje es requerido" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "No puedes editar mensajes de otros usuarios" });
    }

    if (!message.originalText) {
      message.originalText = message.text;
    }

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message_edited", {
        messageId: message._id.toString(),
        newText: message.text,
        editedAt: message.editedAt,
        isEdited: true
      });
    }

    res.status(200).json({
      message: "Mensaje editado exitosamente",
      data: {
        _id: message._id,
        text: message.text,
        editedAt: message.editedAt,
        originalText: message.originalText
      }
    });
  } catch (error) {
    console.error("Error en editMessage:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.query;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: "No autorizado" });
    }

    if (forEveryone === 'true' || forEveryone === true) {
      if (!isSender) {
        return res.status(403).json({ message: "Solo el emisor puede eliminar el mensaje para todos" });
      }
      
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
      }
    } else {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
    }

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_deleted", {
        messageId: message._id.toString(),
        deletedForEveryone: forEveryone === 'true' || forEveryone === true
      });
    }

    res.status(200).json({ 
      message: "Mensaje eliminado exitosamente",
      deletedForEveryone: forEveryone === 'true' || forEveryone === true
    });
  } catch (error) {
    console.error("Error en deleteMessage:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const copyMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    console.log(`Usuario ${userId} copió mensaje ${messageId}`);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error en copyMessage:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ==================== FUNCIONES PARA REACCIONES ====================

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: "El emoji es requerido" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex !== -1) {
      message.reactions[existingReactionIndex].emoji = emoji;
      message.reactions[existingReactionIndex].createdAt = new Date();
    } else {
      message.reactions.push({
        userId,
        emoji,
        createdAt: new Date(),
      });
    }

    await message.save();

    res.status(200).json({
      message: "Reacción agregada/actualizada",
      reactions: message.reactions,
    });

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const reactionData = {
      messageId: message._id.toString(),
      reactions: message.reactions,
    };

    if (senderSocketId) {
      io.to(senderSocketId).emit("message_reaction_updated", reactionData);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message_reaction_updated", reactionData);
    }

  } catch (error) {
    console.error("Error en addReaction:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    await message.save();

    res.status(200).json({
      message: "Reacción eliminada",
      reactions: message.reactions,
    });

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());

    const reactionData = {
      messageId: message._id.toString(),
      reactions: message.reactions,
    };

    if (senderSocketId) {
      io.to(senderSocketId).emit("message_reaction_updated", reactionData);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message_reaction_updated", reactionData);
    }

  } catch (error) {
    console.error("Error en removeReaction:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate("reactions.userId", "fullName email profilePic")
      .lean();

    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const isParticipant = message.senderId.toString() === userId.toString() ||
                          message.receiverId.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const groupedReactions = {};
    message.reactions.forEach((reaction) => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      groupedReactions[reaction.emoji].count++;
      groupedReactions[reaction.emoji].users.push({
        userId: reaction.userId._id,
        fullName: reaction.userId.fullName,
        email: reaction.userId.email,
        profilePic: reaction.userId.profilePic,
      });
    });

    res.status(200).json({
      reactions: message.reactions,
      groupedReactions: Object.values(groupedReactions),
    });
  } catch (error) {
    console.error("Error en getMessageReactions:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
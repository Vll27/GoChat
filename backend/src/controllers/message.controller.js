import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { Readable } from "stream";

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "chat-images", timeout: 60000 },
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

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();

    res.status(200).json(messages);
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

    const finalValidText = text || message || "";
    const finalValidImage = imageFile || image || null;

    if (!finalValidText && !finalValidImage) {
      return res.status(400).json({ message: "Se requiere texto o imagen." });
    }
    
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "No puedes enviarte mensajes a ti mismo." });
    }
    
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receptor no encontrado." });
    }

    let imageUrl = null;
    if (imageFile?.buffer) {
      const uploadResponse = await uploadBufferToCloudinary(imageFile.buffer);
      imageUrl = uploadResponse.secure_url;
    } else if (typeof image === "string" && image.trim() !== "") {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat-images",
        timeout: 60000
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: finalValidText,
      image: imageUrl,
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
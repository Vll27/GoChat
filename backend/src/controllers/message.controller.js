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
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { search } = req.query;

    const me = await User.findById(loggedInUserId).select("contacts");
    if (!me) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!me.contacts || me.contacts.length === 0) {
      return res.status(200).json([]);
    }

    const filter = { _id: { $in: me.contacts } };
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const contacts = await User.find(filter).select("-password");
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

    if (!query || query.trim() === "") {
      return res.status(200).json([]);
    }

    const filter = {
      _id: { $ne: loggedInUserId },
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    };

    const results = await User.find(filter).select("-password");
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
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error en el controlador getMessages: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    // 1. Flexibilidad: Extraemos texto e imagen directamente del body por si viajan como JSON
    const { text, image, message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const imageFile = req.file;

    // Sincronizamos variaciones de nombres (por si el frontend manda 'message' en vez de 'text')
    const finalValidText = text || message || "";
    // Evaluamos si viene un string de imagen en el body o un archivo binario real
    const finalValidImage = imageFile || image || null;

    // 2. Validación adaptada
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

    // 3. Manejo inteligente de Cloudinary (Acepta buffer binario O string base64)
    let imageUrl = null;
    if (imageFile?.buffer) {
      // Si subieron un archivo real por Multer
      const uploadResponse = await uploadBufferToCloudinary(imageFile.buffer);
      imageUrl = uploadResponse.secure_url;
    } else if (typeof image === "string" && image.trim() !== "") {
      // Si mandaron un Base64 o link directo desde el JSON del body
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat-images",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: finalValidText,
      image: imageUrl,
    });

    await newMessage.save();

    // 4. Lógica de Sockets e Notificaciones (Queda intacta y funcional)
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId.toString());

    console.log("Enviando mensaje - Emisor:", req.user.fullName, "Receptor:", receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      io.to(receiverSocketId).emit("messageNotification", {
        message: newMessage,
        senderName: req.user.fullName,
        isFromActiveChat: false
      });
    }

    if (receiverSocketId) io.to(receiverSocketId).emit("chatsUpdated");
    if (senderSocketId) io.to(senderSocketId).emit("chatsUpdated");

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error en el controlador sendMessage: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const recentConversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(loggedInUserId) },
            { receiverId: new mongoose.Types.ObjectId(loggedInUserId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$senderId", new mongoose.Types.ObjectId(loggedInUserId)] },
              then: "$receiverId",
              else: "$senderId"
            }
          },
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $sort: { "lastMessage.createdAt": -1 }
      },
      { $limit: 50 }
    ]);

    if (recentConversations.length === 0) {
      return res.status(200).json([]);
    }

    const partnerIds = recentConversations.map(conv => conv._id);
    
    const chatPartners = await User.find({ 
      _id: { $in: partnerIds } 
    }).select("-password");

    const partnerMap = new Map();
    chatPartners.forEach(partner => {
      partnerMap.set(partner._id.toString(), partner);
    });

    const chats = recentConversations.map(conv => {
      const partner = partnerMap.get(conv._id.toString());
      if (!partner) return null;

      return {
        _id: partner._id,
        user: {
          _id: partner._id,
          fullName: partner.fullName,
          email: partner.email,
          profilePic: partner.profilePic,
          lastSeen: partner.lastSeen || null,
          lastSeenStatus: partner.lastSeenStatus || "offline"
        },
        lastMessage: {
          _id: conv.lastMessage._id,
          text: conv.lastMessage.text,
          image: conv.lastMessage.image,
          senderId: conv.lastMessage.senderId,
          receiverId: conv.lastMessage.receiverId,
          createdAt: conv.lastMessage.createdAt,
          updatedAt: conv.lastMessage.updatedAt
        },
        unreadCount: 0
      };
    }).filter(chat => chat !== null);

    res.status(200).json(chats);
  } catch (error) {
    console.error("Error en getChatPartners: ", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
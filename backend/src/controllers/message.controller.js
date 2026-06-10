import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { Readable } from "stream";

// Utilidad perimetral para evitar ataques ReDoS (Regex Denial of Service)
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "chat-images" },
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

    const cleanSearch = search && typeof search === "string" ? search.trim() : "";

    const me = await User.findById(loggedInUserId).select("contacts");
    if (!me) return res.status(404).json({ message: "Usuario autenticado no encontrado." });

    if (!me.contacts || me.contacts.length === 0) {
      return res.status(200).json([]);
    }

    const filter = { _id: { $in: me.contacts } };
    
    if (cleanSearch) {
      const safeSearch = escapeRegex(cleanSearch);
      filter.$or = [
        { fullName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const contacts = await User.find(filter).select("-password");
    res.status(200).json(contacts);
  } catch (error) {
    console.error("❌ Error en getAllContacts:", error.message);
    res.status(500).json({ message: "Error interno del servidor al obtener la lista de contactos." });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { query } = req.query;

    const cleanQuery = query && typeof query === "string" ? query.trim() : "";

    if (!cleanQuery) {
      return res.status(200).json([]);
    }

    const safeQuery = escapeRegex(cleanQuery);
    const filter = {
      _id: { $ne: loggedInUserId },
      // CORREGIDO: Se cambiaron los "=" por ":" para cumplir con la sintaxis de objetos de JS 👈
      $or: [
        { fullName: { $regex: safeQuery, $options: "i" } },
        { email: { $regex: safeQuery, $options: "i" } },
      ],
    };

    const results = await User.find(filter).select("-password");
    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Error en searchUsers:", error.message);
    res.status(500).json({ message: "Error interno del servidor durante la búsqueda de usuarios." });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const cleanUserToChatId = userToChatId && typeof userToChatId === "string" ? userToChatId.trim() : "";

    if (!cleanUserToChatId) {
      return res.status(400).json({ message: "Se requiere un ID de conversación válido." });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: cleanUserToChatId },
        { senderId: cleanUserToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error en el controlador getMessages:", error.message);
    res.status(500).json({ message: "Error interno del servidor al recuperar el historial de mensajes." });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const imageFile = req.file;

    // Saneamiento de cadenas de texto de entrada
    const rawText = text || message || "";
    const cleanText = typeof rawText === "string" ? rawText.trim() : "";
    const cleanReceiverId = receiverId && typeof receiverId === "string" ? receiverId.trim() : "";

    const finalValidImage = imageFile || (typeof image === "string" ? image.trim() : null);

    if (!cleanText && !finalValidImage) {
      return res.status(400).json({ message: "Se requiere obligatoriamente texto o una imagen." });
    }
    
    if (!cleanReceiverId) {
      return res.status(400).json({ message: "El ID del receptor es inválido o está vacío." });
    }

    if (senderId.equals(cleanReceiverId)) {
      return res.status(400).json({ message: "No puedes enviarte mensajes a ti mismo." });
    }
    
    const receiverExists = await User.exists({ _id: cleanReceiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "El usuario receptor no existe en la plataforma." });
    }

    let imageUrl = null;
    if (imageFile?.buffer) {
      const uploadResponse = await uploadBufferToCloudinary(imageFile.buffer);
      imageUrl = uploadResponse.secure_url;
    } else if (typeof finalValidImage === "string" && finalValidImage !== "") {
      const uploadResponse = await cloudinary.uploader.upload(finalValidImage, {
        folder: "chat-images",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId: cleanReceiverId,
      text: cleanText,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(cleanReceiverId);
    const senderSocketId = getReceiverSocketId(senderId.toString());

    console.log("Enviando mensaje - Emisor:", req.user.fullName, "Receptor:", cleanReceiverId);

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
    console.error("❌ Error en el controlador sendMessage:", error.message);
    res.status(500).json({ message: "Error interno del servidor al procesar y enviar el mensaje." });
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
      { $sort: { createdAt: -1 } },
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
      { $sort: { "lastMessage.createdAt": -1 } },
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
    console.error("❌ Error en getChatPartners:", error.message);
    res.status(500).json({ message: "Error interno del servidor al construir los canales de chat activos." });
  }
};
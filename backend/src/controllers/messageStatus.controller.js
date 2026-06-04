import Message from "../models/Message.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Obtener estadísticas de estados de mensajes para un chat
export const getMessageStatusStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: myId, receiverId: userId },
            { senderId: userId, receiverId: myId }
          ]
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      sent: 0,
      delivered: 0,
      read: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error en getMessageStatusStats:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Obtener mensajes no leídos de un usuario específico
export const getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { senderId } = req.params;

    const unreadMessages = await Message.find({
      senderId: senderId,
      receiverId: userId,
      status: { $in: ["sent", "delivered"] }
    }).sort({ createdAt: 1 });

    res.status(200).json(unreadMessages);
  } catch (error) {
    console.error("Error en getUnreadMessages:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Obtener conteo total de mensajes no leídos por cada contacto
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          status: { $in: ["sent", "delivered"] }
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    unreadCounts.forEach(item => {
      result[item._id.toString()] = item.count;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error en getUnreadCounts:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
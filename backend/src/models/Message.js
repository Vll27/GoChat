import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
  },
  { 
    timestamps: true,
    // ✅ Optimización para consultas frecuentes
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Índices compuestos críticos
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, status: 1 });

// ✅ TTL index para limpiar mensajes viejos (opcional, 1 año)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
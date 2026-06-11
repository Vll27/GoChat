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
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
mediaType: {
      type: String,
      enum: ["image", "video"],
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    // ==================== REACCIONES ====================
    reactions: {
      type: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
    // ==================== EDICIÓN ====================
    editedAt: {
      type: Date,
      default: null,
    },
    originalText: {
      type: String,
      default: null,
    },
    // ==================== ELIMINACIÓN ====================
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ==================== VIRTUALES ====================

messageSchema.virtual('isEdited').get(function() {
  return this.editedAt !== null && this.editedAt !== undefined;
});

messageSchema.virtual('isDeletedForEveryone').get(function() {
  return this.deletedForEveryone === true;
});

// ==================== ÍNDICES ====================

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, status: 1 });
messageSchema.index({ deletedForEveryone: 1 });
messageSchema.index({ "reactions.userId": 1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
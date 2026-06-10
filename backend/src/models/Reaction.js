import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    emoji: {
      type: String,
      required: true,
      enum: ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para evitar reacciones duplicadas del mismo usuario al mismo mensaje
reactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;
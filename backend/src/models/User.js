import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // users who sent a contact request to this user
    pendingRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // accepted contacts
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
      // ✅ CAMPO NUEVO - AGREGAR ESTO:
    token_acceso: {
      type: String,
      unique: true,
      sparse: true, // Permite que usuarios no tengan token
    },
  },
  
  { timestamps: true } // createdAt & updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;

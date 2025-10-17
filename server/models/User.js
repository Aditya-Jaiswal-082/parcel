// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "agent", "admin"],
    default: "user"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // -- ADDED FOR PASSWORD RESET --
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

module.exports = mongoose.model("User", userSchema);

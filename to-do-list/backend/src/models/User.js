import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      default: null,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
    providers: {
      type: [String],
      enum: ["local", "google", "github"],
      default: [],
    },
    preferredLanguage: {
      type: String,
      enum: ["vi", "en"],
      default: "vi",
    },
    themePreference: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    customStatuses: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => value.length <= 8,
        message: "customStatuses tối đa 8 phần tử",
      },
    },
    lastOnlineAt: {
      type: Date,
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
   
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;

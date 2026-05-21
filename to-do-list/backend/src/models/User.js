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
    avatarPublicId: {
      type: String,
      default: null,
    },
    notificationPreferences: {
      emailOverdue: {
        type: Boolean,
        default: true,
      },
      emailDigest: {
        type: Boolean,
        default: true,
      },
      digestHour: {
        type: Number,
        default: 8,
        min: 0,
        max: 23,
        validate: {
          validator: Number.isInteger,
          message: "digestHour phải là một số nguyên từ 0 đến 23",
        },
      },
      timezone: {
        type: String,
        default: "Asia/Ho_Chi_Minh",
        validate: {
          validator: function (v) {
            try {
              Intl.DateTimeFormat(undefined, { timeZone: v });
              return true;
            } catch (e) {
              return false;
            }
          },
          message: "Múi giờ IANA không hợp lệ",
        },
      },
      unsubscribedAt: {
        type: Date,
        default: null,
      },
    },
   
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;

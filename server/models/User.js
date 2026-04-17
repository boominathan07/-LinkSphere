import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    username: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    plan: { type: String, enum: ["free", "pro", "business"], default: "free" },
    profileImage: { type: String, default: "" },
    bio: { type: String, default: "" },
    socialLinks: {
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" }
    },
    theme: { type: String, default: "obsidian-pulse" },
    customFont: { type: String, default: "geist" },
    bodyFont: { type: String, default: "geist" },
    buttonColor: { type: String, default: "#6C63FF" },
    animationStyle: { type: String, default: "none" },
    customBgColor: { type: String, default: "#0D0D1A" },
    customBgImage: { type: String, default: "" },
    buttonStyle: { type: String, default: "rounded" },
    customDomain: { type: String },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: { type: String },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String },
    emailVerifyExpires: { type: Date },
    is2FAEnabled: { type: Boolean, default: false },
    twoFASecret: { type: String },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: "" },
    totalProfileViews: { type: Number, default: 0 },
    customDomainVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    refreshToken: { type: String },
    notificationPreferences: {
      weeklyReport: { type: Boolean, default: true },
      newSubscriberAlerts: { type: Boolean, default: true },
      emailVerifyReminder: { type: Boolean, default: true }
    },
    activeSessions: [
      {
        sessionId: { type: String },
        device: { type: String, default: "Unknown device" },
        location: { type: String, default: "Unknown location" },
        lastSeenAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;

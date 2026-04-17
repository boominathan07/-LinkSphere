import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import * as otplib from "otplib";
import AuditLog from "../models/AuditLog.js";
import Click from "../models/Click.js";
import EmailCapture from "../models/EmailCapture.js";
import Link from "../models/Link.js";
import ProfileView from "../models/ProfileView.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import WebhookLog from "../models/WebhookLog.js";
import cloudinary, { isConfigured as isCloudinaryConfigured } from "../config/cloudinary.js";
import { getDeviceFromUserAgent } from "../utils/deviceHelper.js";
import { getGeoFromIp } from "../utils/geoHelper.js";
import { CACHE_TTL, getCache, invalidateCacheByPrefix, setCache } from "../utils/cacheHelper.js";
import { buildInvoicePdfBuffer } from "../utils/pdfHelper.js";

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m"
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d"
  });
}

async function signAndPersistRefreshToken(user) {
  const refreshToken = signRefreshToken(user);
  await User.updateOne({ _id: user._id }, { $set: { refreshToken } });
  return refreshToken;
}

function getSessionMeta(req) {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  const geo = getGeoFromIp(ip);
  const deviceInfo = getDeviceFromUserAgent(req.headers["user-agent"]);
  return {
    device: `${deviceInfo.device}/${deviceInfo.browser || "unknown"}`.toLowerCase(),
    location: [geo.city, geo.country].filter(Boolean).join(", ") || "Unknown"
  };
}

async function upsertActiveSession(userId, sessionId, req) {
  const meta = getSessionMeta(req);
  const user = await User.findById(userId);
  if (!user) return;
  const sessions = Array.isArray(user.activeSessions) ? [...user.activeSessions] : [];
  const index = sessions.findIndex((item) => item.sessionId === sessionId);
  if (index >= 0) {
    sessions[index].lastSeenAt = new Date();
    sessions[index].device = meta.device;
    sessions[index].location = meta.location;
  } else {
    sessions.push({
      sessionId,
      device: meta.device,
      location: meta.location,
      createdAt: new Date(),
      lastSeenAt: new Date()
    });
  }
  user.activeSessions = sessions.slice(-10);
  await user.save();
}

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const { authenticator } = otplib;

async function hydrateUser(userId) {
  return User.findById(userId).select("-password -refreshToken");
}

export const authController = {
register: async (req, res) => {
  try {
    let { name, email, password, username, plan = "free" } = req.body;
    
    // Clean the plan value - remove any quotes or special characters
    if (typeof plan === 'string') {
      plan = plan.toLowerCase().trim().replace(/["']/g, '');
    }
    
    // Validate plan - if invalid, default to "free"
    const validPlans = ["free", "pro", "business"];
    if (!validPlans.includes(plan)) {
      plan = "free";
    }
    
    // Validation
    if (!name || !email || !password || !username) {
      return res.status(400).json({ message: "name, email, username and password are required" });
    }

    // Check existing user
    const existing = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
    });
    
    if (existing) {
      return res.status(409).json({ message: "email or username already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      plan: plan,  // Cleaned plan value
      password: passwordHash,
      isEmailVerified: true,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    const emailVerifyToken = jwt.sign(
      { sub: user._id.toString(), email, scope: "verify-email" }, 
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    user.emailVerifyToken = emailVerifyToken;
    await user.save();
    
    const accessToken = signAccessToken(user);
    const refreshToken = await signAndPersistRefreshToken(user);
    setRefreshCookie(res, refreshToken);
    const sessionId = randomUUID();
    await upsertActiveSession(user._id, sessionId, req);

    return res.status(201).json({ 
      accessToken, 
      verifyToken: emailVerifyToken, 
      sessionId, 
      user: await hydrateUser(user._id) 
    });
    
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
},

  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "account blocked by admin" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await signAndPersistRefreshToken(user);
    setRefreshCookie(res, refreshToken);
    const sessionId = randomUUID();
    await upsertActiveSession(user._id, sessionId, req);

    return res.json({ accessToken, sessionId, user: await hydrateUser(user._id) });
  },

  refresh: async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "refresh token required" });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "invalid refresh token" });
    }

    const nextRefreshToken = await signAndPersistRefreshToken(user);
    setRefreshCookie(res, nextRefreshToken);
    const sessionId = String(req.headers["x-session-id"] || randomUUID());
    await upsertActiveSession(user._id, sessionId, req);

    return res.json({ accessToken: signAccessToken(user), sessionId });
  },

  me: async (req, res) => res.json({ user: await hydrateUser(req.user.sub) }),

  logout: async (req, res) => {
    const user = await User.findById(req.user.sub);
    if (user) {
      const sessionId = String(req.headers["x-session-id"] || "");
      const nextSessions = (user.activeSessions || []).filter((item) => item.sessionId !== sessionId);
      await User.updateOne({ _id: user._id }, { $set: { refreshToken: null, activeSessions: nextSessions } });
    }
    res.clearCookie("refreshToken");
    return res.json({ message: "logged out" });
  },

  google: async (req, res) => {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required for google auth" });
    }
    let user = await User.findOne({ email });
    if (!user) {
      const baseUsername = email.split("@")[0];
      const escapedBase = baseUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const collisionCount = await User.countDocuments({ username: new RegExp(`^${escapedBase}`) });
      user = await User.create({
        name: name || baseUsername,
        email,
        username: `${baseUsername}${collisionCount || ""}`.toLowerCase(),
        isEmailVerified: true
      });
    }
    const accessToken = signAccessToken(user);
    const refreshToken = await signAndPersistRefreshToken(user);
    setRefreshCookie(res, refreshToken);
    const sessionId = randomUUID();
    await upsertActiveSession(user._id, sessionId, req);
    return res.json({ accessToken, sessionId, user: await hydrateUser(user._id) });
  },

  forgotPassword: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If email exists, reset instructions are sent." });
    }
    const resetToken = jwt.sign({ sub: user._id.toString(), scope: "reset" }, process.env.JWT_SECRET, { expiresIn: "30m" });
    return res.json({ message: "Reset token generated", resetToken });
  },

  resetPassword: async (req, res) => {
    const { password } = req.body;
    const token = req.params.token || req.body?.token;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.scope !== "reset") {
      return res.status(400).json({ message: "invalid reset token scope" });
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.password = await bcrypt.hash(password, 12);
    await user.save();
    return res.json({ message: "password reset successful" });
  },

  verifyEmail: async (req, res) => {
    const { token } = req.params;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(payload.sub);
    if (!user && payload.email) {
      user = await User.findOne({ email: payload.email });
    }
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (user.emailVerifyToken && user.emailVerifyToken !== token) {
      return res.status(400).json({ message: "verification token mismatch" });
    }
    user.isEmailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    await user.save();
    return res.json({ message: "email verified" });
  },

  checkUsername: async (req, res) => {
    const username = String(req.params.username || "").trim().toLowerCase();
    if (username.length < 3) {
      return res.status(400).json({ message: "username must be at least 3 characters" });
    }
    const exists = await User.exists({ username });
    return res.json({ available: !exists });
  },

  resendVerification: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If account exists, verification email has been re-sent." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: "email is already verified" });
    }
    const verifyToken = jwt.sign({ sub: user._id.toString(), email: user.email, scope: "verify-email" }, process.env.JWT_SECRET, {
      expiresIn: "24h"
    });
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    return res.json({ message: "Verification email sent", verifyToken });
  },

  setup2FA: async (req, res) => {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (user.plan === "free") {
      return res.status(403).json({ message: "2FA is available for Pro and Business plans" });
    }
    user.twoFASecret = authenticator.generateSecret();
    await user.save();
    return res.json({
      secret: user.twoFASecret,
      otpauthUrl: `otpauth://totp/LinkSphere:${user.email}?secret=${user.twoFASecret}&issuer=LinkSphere`
    });
  },

  verify2FA: async (req, res) => {
    const { code } = req.body;
    const user = await User.findById(req.user.sub);
    if (!user || !user.twoFASecret) {
      return res.status(400).json({ message: "2FA not configured" });
    }
    if (!code || !authenticator.check(String(code), user.twoFASecret)) {
      return res.status(400).json({ message: "invalid 2FA code" });
    }
    user.is2FAEnabled = true;
    await user.save();
    return res.json({ message: "2FA enabled" });
  },

  disable2FA: async (req, res) => {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.is2FAEnabled = false;
    user.twoFASecret = null;
    await user.save();
    return res.json({ message: "2FA disabled" });
  },

  sessions: async (req, res) => {
    const user = await User.findById(req.user.sub).select("activeSessions");
    const currentSessionId = String(req.headers["x-session-id"] || "");
    const items = (user?.activeSessions || [])
      .map((session) => ({
        id: session.sessionId,
        device: session.device,
        location: session.location,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        active: session.sessionId === currentSessionId
      }))
      .sort((a, b) => new Date(b.lastSeenAt || b.createdAt).getTime() - new Date(a.lastSeenAt || a.createdAt).getTime());
    return res.json({ items });
  },

  revokeSession: async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.activeSessions = (user.activeSessions || []).filter((session) => session.sessionId !== id);
    await user.save();
    return res.json({ message: "session revoked" });
  }
};

export const linksController = {
  list: async (req, res) => {
    const items = await Link.find({ userId: req.user.sub }).sort({ order: 1, createdAt: -1 });
    return res.json({ items });
  },

  uploadThumbnail: async (req, res) => {
    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!imageUrl) {
      return res.status(400).json({ message: "imageUrl is required" });
    }
    if (!imageUrl.startsWith("data:image/") && !/^https?:\/\//i.test(imageUrl)) {
      return res.status(400).json({ message: "Only image URLs or image data URLs are allowed" });
    }
    if (imageUrl.startsWith("data:image/") && imageUrl.length > 8 * 1024 * 1024) {
      return res.status(413).json({ message: "Thumbnail image is too large" });
    }
    let finalUrl = imageUrl;
    if (isCloudinaryConfigured) {
      try {
        const uploaded = await cloudinary.uploader.upload(imageUrl, {
          folder: "linksphere/link-thumbs",
          transformation: [{ width: 256, height: 256, crop: "fill", quality: "auto:good", fetch_format: "auto" }]
        });
        finalUrl = uploaded.secure_url;
      } catch (error) {
        if (String(error?.message || "").includes("Must supply api_key")) {
          return res.status(500).json({
            message:
              "Cloudinary configuration is invalid (missing api_key). Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
          });
        }
        return res.status(500).json({ message: error?.message || "thumbnail upload failed" });
      }
    }
    return res.json({ imageUrl: finalUrl, provider: isCloudinaryConfigured ? "cloudinary" : "direct" });
  },

  create: async (req, res) => {
    const { title, url, isActive = true } = req.body;
    if (!title || !url) {
      return res.status(400).json({ message: "title and url are required" });
    }
    const allowed = [
      "title",
      "url",
      "icon",
      "thumbnailImage",
      "isActive",
      "scheduleStart",
      "scheduleEnd",
      "expiresAt",
      "customSlug",
      "groupLabel",
      "utmSource",
      "utmMedium",
      "utmCampaign"
    ];
    const payload = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const planUser = await User.findById(req.user.sub).select("plan");
    const isFree = !planUser || planUser.plan === "free";
    if (isFree) {
      ["customSlug", "scheduleStart", "scheduleEnd", "expiresAt", "utmSource", "utmMedium", "utmCampaign", "groupLabel"].forEach((k) => {
        delete payload[k];
      });
    }

    const order = await Link.countDocuments({ userId: req.user.sub });
    const item = await Link.create({ userId: req.user.sub, ...payload, isActive, order });
    await invalidateCacheByPrefix(`cache:${req.user.sub}:analytics:`);
    await invalidateCacheByPrefix(`cache:public:${req.user.sub}:`);
    return res.status(201).json({ item });
  },

  update: async (req, res) => {
    const allowed = [
      "title",
      "url",
      "icon",
      "thumbnailImage",
      "isActive",
      "scheduleStart",
      "scheduleEnd",
      "expiresAt",
      "customSlug",
      "groupLabel",
      "utmSource",
      "utmMedium",
      "utmCampaign"
    ];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const planUser = await User.findById(req.user.sub).select("plan");
    const isFree = !planUser || planUser.plan === "free";
    if (isFree) {
      ["customSlug", "scheduleStart", "scheduleEnd", "expiresAt", "utmSource", "utmMedium", "utmCampaign", "groupLabel"].forEach((k) => {
        delete updates[k];
      });
    }
    const item = await Link.findOneAndUpdate({ _id: req.params.id, userId: req.user.sub }, updates, { new: true });
    if (!item) {
      return res.status(404).json({ message: "link not found" });
    }
    await invalidateCacheByPrefix(`cache:${req.user.sub}:analytics:`);
    await invalidateCacheByPrefix(`cache:public:${req.user.sub}:`);
    return res.json({ item });
  },

  toggle: async (req, res) => {
    const item = await Link.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!item) {
      return res.status(404).json({ message: "link not found" });
    }
    item.isActive = !item.isActive;
    await item.save();
    await invalidateCacheByPrefix(`cache:${req.user.sub}:analytics:`);
    await invalidateCacheByPrefix(`cache:public:${req.user.sub}:`);
    return res.json({ item });
  },

  reorder: async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ message: "ids array is required" });
    }

    await Promise.all(
      ids.map((id, index) => Link.updateOne({ _id: id, userId: req.user.sub }, { $set: { order: index } }))
    );
    await invalidateCacheByPrefix(`cache:${req.user.sub}:analytics:`);
    await invalidateCacheByPrefix(`cache:public:${req.user.sub}:`);
    return res.json({ message: "reordered" });
  },

  remove: async (req, res) => {
    const item = await Link.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!item) {
      return res.status(404).json({ message: "link not found" });
    }
    await invalidateCacheByPrefix(`cache:${req.user.sub}:analytics:`);
    await invalidateCacheByPrefix(`cache:public:${req.user.sub}:`);
    return res.json({ message: "deleted" });
  }
};

export const analyticsController = {
  summary: async (req, res) => {
    const empty = {
      totalClicks: 0,
      views: 0,
      ctr: 0,
      clicksWowPct: 0,
      viewsWowPct: 0,
      activeLinksCount: 0,
      subscriberCount: 0,
      topLink: null
    };
    try {
      const userId = req.user.sub;
      const cacheKey = `cache:${userId}:analytics:summary`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const oid = new mongoose.Types.ObjectId(userId);
      const now = new Date();
      const startThisWeek = new Date(now);
      startThisWeek.setDate(startThisWeek.getDate() - 7);
      const startPrevWeek = new Date(startThisWeek);
      startPrevWeek.setDate(startPrevWeek.getDate() - 7);

      const [totalClicks, user, clicksThisWeek, clicksPrevWeek, viewsThisWeek, viewsPrevWeek, activeLinksCount, subscriberCount] =
        await Promise.all([
          Click.countDocuments({ userId: oid }),
          User.findById(userId).select("totalProfileViews"),
          Click.countDocuments({ userId: oid, createdAt: { $gte: startThisWeek } }),
          Click.countDocuments({ userId: oid, createdAt: { $gte: startPrevWeek, $lt: startThisWeek } }),
          ProfileView.countDocuments({ userId: oid, createdAt: { $gte: startThisWeek } }),
          ProfileView.countDocuments({ userId: oid, createdAt: { $gte: startPrevWeek, $lt: startThisWeek } }),
          Link.countDocuments({ userId: oid, isActive: true }),
          EmailCapture.countDocuments({ ownerId: oid })
        ]);

      const views = user?.totalProfileViews || 0;
      const ctr = views > 0 ? Number(((totalClicks / views) * 100).toFixed(1)) : 0;

      const pct = (cur, prev) => {
        if (prev === 0) return cur > 0 ? 100 : 0;
        return Number((((cur - prev) / prev) * 100).toFixed(1));
      };

      const links = await Link.find({ userId }).select("clicks title");
      const topLink = links.sort((a, b) => b.clicks - a.clicks)[0] || null;

      const payload = {
        totalClicks,
        views,
        ctr,
        clicksWowPct: pct(clicksThisWeek, clicksPrevWeek),
        viewsWowPct: pct(viewsThisWeek, viewsPrevWeek),
        activeLinksCount,
        subscriberCount,
        topLink
      };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_SUMMARY);
      return res.json(payload);
    } catch (err) {
      console.error("analytics summary", err);
      return res.json(empty);
    }
  },

  weekly: async (req, res) => {
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:weekly`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const since = new Date();
      since.setDate(since.getDate() - 6);

      const rows = await Click.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            clicks: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const payload = { points: rows.map((row) => ({ day: row._id, clicks: row.clicks })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics weekly", err);
      return res.json({ points: [] });
    }
  },

  geo: async (req, res) => {
    const empty = { countries: [], cities: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:geo`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const rows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$country", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 15 }
      ]);
      const cityRows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$city", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 10 }
      ]);
      const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
      const payload = {
        countries: rows.map((row) => ({
          country: row._id || "Unknown",
          clicks: row.value,
          percent: Number(((row.value / total) * 100).toFixed(1))
        })),
        cities: cityRows.map((row) => ({ city: row._id || "Unknown", clicks: row.value }))
      };
      await setCache(cacheKey, payload, CACHE_TTL.GEO_DATA);
      return res.json(payload);
    } catch (err) {
      console.error("analytics geo", err);
      return res.json(empty);
    }
  },

  perLink: async (req, res) => {
    const empty = { items: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:per-link`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const oid = new mongoose.Types.ObjectId(req.user.sub);
      const start7 = new Date();
      start7.setDate(start7.getDate() - 7);
      const start14 = new Date();
      start14.setDate(start14.getDate() - 14);

      const [links, last7Agg, prev7Agg] = await Promise.all([
        Link.find({ userId: req.user.sub }).select("title url clicks createdAt").sort({ clicks: -1 }).lean(),
        Click.aggregate([
          { $match: { userId: oid, createdAt: { $gte: start7 } } },
          { $group: { _id: "$linkId", c: { $sum: 1 } } }
        ]),
        Click.aggregate([
          { $match: { userId: oid, createdAt: { $gte: start14, $lt: start7 } } },
          { $group: { _id: "$linkId", c: { $sum: 1 } } }
        ])
      ]);

      const last7 = Object.fromEntries(last7Agg.map((r) => [String(r._id), r.c]));
      const prev7 = Object.fromEntries(prev7Agg.map((r) => [String(r._id), r.c]));

      const trendOf = (cur, prev) => {
        if (cur === 0 && prev === 0) return "flat";
        if (prev === 0 && cur > 0) return "up";
        if (cur > prev * 1.05) return "up";
        if (cur < prev * 0.95) return "down";
        return "flat";
      };

      const items = links.map((link) => {
        const id = String(link._id);
        const c7 = last7[id] || 0;
        const p7 = prev7[id] || 0;
        return {
          _id: link._id,
          title: link.title,
          url: link.url,
          clicks: link.clicks,
          createdAt: link.createdAt,
          clicksLast7d: c7,
          clicksPrev7d: p7,
          trend: trendOf(c7, p7)
        };
      });

      const payload = { items };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics perLink", err);
      return res.json(empty);
    }
  },

  devices: async (req, res) => {
    const empty = { items: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:devices`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const rows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$device", value: { $sum: 1 } } }
      ]);
      const payload = { items: rows.map((row) => ({ device: row._id || "unknown", clicks: row.value })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics devices", err);
      return res.json(empty);
    }
  },

  browsers: async (req, res) => {
    const empty = { items: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:browsers`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const rows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$browser", value: { $sum: 1 } } }
      ]);
      const payload = { items: rows.map((row) => ({ browser: row._id || "unknown", clicks: row.value })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics browsers", err);
      return res.json(empty);
    }
  },

  os: async (req, res) => {
    const empty = { items: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:os`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const rows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$os", value: { $sum: 1 } } }
      ]);
      const payload = { items: rows.map((row) => ({ os: row._id || "unknown", clicks: row.value })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics os", err);
      return res.json(empty);
    }
  },

  referrers: async (req, res) => {
    const empty = { items: [] };
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:referrers`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const rows = await Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$referrer", value: { $sum: 1 } } },
        { $sort: { value: -1 } }
      ]);
      const payload = { items: rows.map((row) => ({ referrer: row._id || "direct", clicks: row.value })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics referrers", err);
      return res.json(empty);
    }
  },

  monthly: async (req, res) => {
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:monthly`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      const rows = await Click.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const payload = { points: rows.map((row) => ({ month: row._id, clicks: row.clicks })) };
      await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
      return res.json(payload);
    } catch (err) {
      console.error("analytics monthly", err);
      return res.json({ points: [] });
    }
  },

  hourly: async (req, res) => {
    const emptyPoints = Array.from({ length: 24 }, (_, h) => ({ hour: h, clicks: 0 }));
    try {
      const cacheKey = `cache:${req.user.sub}:analytics:hourly`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const rows = await Click.aggregate([
        { $match: { userId, createdAt: { $gte: startOfDay } } },
        { $group: { _id: { $hour: "$createdAt" }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const byHour = Object.fromEntries(rows.map((row) => [row._id, row.clicks]));
      const payload = { points: emptyPoints.map((p) => ({ ...p, clicks: byHour[p.hour] || 0 })) };
      await setCache(cacheKey, payload, 300);
      return res.json(payload);
    } catch (err) {
      console.error("analytics hourly", err);
      return res.json({ points: emptyPoints });
    }
  },

  realtime: async (req, res) => {
    const fallback = { clicksLast30Min: 0, windowMinutes: 30, maxClicksPerHourToday: 0 };
    try {
      const userId = new mongoose.Types.ObjectId(req.user.sub);
      const since30 = new Date(Date.now() - 30 * 60 * 1000);
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const [last30, hourlyToday] = await Promise.all([
        Click.aggregate([
          { $match: { userId, createdAt: { $gte: since30 } } },
          { $group: { _id: null, clicks: { $sum: 1 } } }
        ]),
        Click.aggregate([
          { $match: { userId, createdAt: { $gte: startOfDay } } },
          { $group: { _id: { $hour: "$createdAt" }, clicks: { $sum: 1 } } }
        ])
      ]);
      const clicksLast30Min = last30[0]?.clicks || 0;
      const maxClicksPerHourToday = hourlyToday.length ? Math.max(...hourlyToday.map((h) => h.clicks), 0) : 0;
      return res.json({ ...fallback, clicksLast30Min, maxClicksPerHourToday });
    } catch (err) {
      console.error("analytics realtime", err);
      return res.json(fallback);
    }
  },

  recentActivity: async (req, res) => {
    const cacheKey = `cache:${req.user.sub}:analytics:recent-activity`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const userId = new mongoose.Types.ObjectId(req.user.sub);
    const rows = await Click.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "links",
          localField: "linkId",
          foreignField: "_id",
          as: "link"
        }
      },
      { $unwind: { path: "$link", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          country: 1,
          city: 1,
          device: 1,
          createdAt: 1,
          referrer: 1,
          linkTitle: "$link.title"
        }
      }
    ]);
    const payload = { items: rows };
    await setCache(cacheKey, payload, CACHE_TTL.PUBLIC_PROFILE);
    return res.json(payload);
  },

  audience: async (req, res) => {
    const cacheKey = `cache:${req.user.sub}:analytics:audience`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const userId = new mongoose.Types.ObjectId(req.user.sub);
    const [countries, cities, deviceOs, peakHours, sessionStats] = await Promise.all([
      Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$country", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 20 }
      ]),
      Click.aggregate([
        { $match: { userId } },
        { $group: { _id: { country: "$country", city: "$city" }, clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }
      ]),
      Click.aggregate([
        { $match: { userId } },
        { $group: { _id: { device: "$device", os: "$os" }, clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }
      ]),
      Click.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { dow: { $dayOfWeek: "$createdAt" }, hour: { $hour: "$createdAt" } },
            clicks: { $sum: 1 }
          }
        }
      ]),
      Click.aggregate([
        { $match: { userId, sessionId: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$sessionId", count: { $sum: 1 } } },
        {
          $group: {
            _id: null,
            newVisitors: { $sum: { $cond: [{ $eq: ["$count", 1] }, 1, 0] } },
            returningVisitors: { $sum: { $cond: [{ $gt: ["$count", 1] }, 1, 0] } }
          }
        }
      ])
    ]);

    const citiesByCountry = {};
    for (const row of cities) {
      const country = normalizeCountryName(row._id?.country);
      if (!citiesByCountry[country]) {
        citiesByCountry[country] = [];
      }
      if (citiesByCountry[country].length < 10) {
        citiesByCountry[country].push({ city: row._id?.city || "Unknown", clicks: row.clicks });
      }
    }

    const payload = {
      countries: countries.map((row) => ({ country: normalizeCountryName(row._id), clicks: row.clicks })),
      citiesByCountry,
      deviceOsMatrix: deviceOs.map((row) => ({ device: row._id?.device || "unknown", os: row._id?.os || "unknown", clicks: row.clicks })),
      peakHours: peakHours.map((row) => ({ dayOfWeek: row._id?.dow || 1, hour: row._id?.hour || 0, clicks: row.clicks })),
      visitors: {
        newVisitors: sessionStats[0]?.newVisitors || 0,
        returningVisitors: sessionStats[0]?.returningVisitors || 0
      }
    };
    await setCache(cacheKey, payload, CACHE_TTL.ANALYTICS_CHARTS);
    return res.json(payload);
  },

  exportCsv: async (req, res) => {
    const planUser = await User.findById(req.user.sub).select("plan");
    if (!planUser || planUser.plan === "free") {
      return res.status(403).json({ message: "csv export is available for Pro and Business plans" });
    }
    const rows = await Click.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(500);
    const header = "timestamp,country,city,device,browser,os,referrer\n";
    const lines = rows
      .map(
        (row) =>
          `${row.createdAt.toISOString()},${row.country || ""},${row.city || ""},${row.device || ""},${row.browser || ""},${row.os || ""},${row.referrer || ""}`
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=linksphere-analytics.csv");
    return res.send(`${header}${lines}`);
  }
};

function normalizePublicUsername(value) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

function normalizeCountryName(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "unknown") return "Unknown";
  if (/^[A-Za-z]{2}$/.test(raw)) {
    try {
      const formatter = new Intl.DisplayNames(["en"], { type: "region" });
      return formatter.of(raw.toUpperCase()) || raw.toUpperCase();
    } catch {
      return raw.toUpperCase();
    }
  }
  return raw;
}

export const publicController = {
  profile: async (req, res) => {
    const normalizedUsername = normalizePublicUsername(req.params.username);
    const cacheKey = `cache:public:username:${normalizedUsername}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const user = await User.findOne({ username: normalizedUsername }).select(
      "name username bio plan profileImage socialLinks customBgColor customBgImage customFont bodyFont buttonStyle buttonColor animationStyle isEmailVerified theme"
    );
    if (!user) {
      return res.status(404).json({ message: "profile not found" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "account suspended" });
    }

    const now = new Date();
    const links = await Link.find({
      userId: user._id,
      isActive: true,
      $or: [{ scheduleStart: { $exists: false } }, { scheduleStart: null }, { scheduleStart: { $lte: now } }],
      $and: [{ $or: [{ scheduleEnd: { $exists: false } }, { scheduleEnd: null }, { scheduleEnd: { $gte: now } }] }],
      $nor: [{ expiresAt: { $lte: now } }]
    })
      .sort({ order: 1 })
      .select("title url clicks icon");

    const payload = { user, links };
    await setCache(cacheKey, payload, CACHE_TTL.PUBLIC_PROFILE);
    return res.json(payload);
  },

  click: async (req, res) => {
    const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
    const dedupeKey = `cache:click:${req.params.linkId}:${ip}`;
    const seen = await getCache(dedupeKey);
    if (seen) {
      return res.status(200).json({ message: "cooldown active" });
    }

    const link = await Link.findById(req.params.linkId);
    if (!link) {
      return res.status(404).json({ message: "link not found" });
    }

    const geo = getGeoFromIp(ip);
    const deviceInfo = getDeviceFromUserAgent(req.headers["user-agent"]);

    const sessionId = String(req.body?.sessionId || req.headers["x-session-id"] || `${ip}-${deviceInfo.device}-${deviceInfo.browser}`);

    await Click.create({
      linkId: link._id,
      userId: link.userId,
      ip,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      sessionId,
      referrer: req.headers.referer || "direct"
    });

    link.clicks += 1;
    await link.save();
    await setCache(dedupeKey, true, CACHE_TTL.ANALYTICS_CHARTS);
    await invalidateCacheByPrefix(`cache:${link.userId}:analytics:`);
    return res.status(201).json({ message: "click tracked" });
  },

  view: async (req, res) => {
    const ua = String(req.headers["user-agent"] || "").toLowerCase();
    const knownBot = /(bot|spider|crawl|slurp|facebookexternalhit|whatsapp|preview)/.test(ua);
    if (knownBot) {
      return res.status(202).json({ message: "bot view skipped" });
    }
    const user = await User.findOne({ username: normalizePublicUsername(req.params.username) });
    if (!user) {
      return res.status(404).json({ message: "profile not found" });
    }
    user.totalProfileViews += 1;
    await user.save();
    await ProfileView.create({ userId: user._id });
    await invalidateCacheByPrefix(`cache:${user._id.toString()}:analytics:`);
    return res.status(201).json({ message: "view tracked" });
  },

  emailCapture: async (req, res) => {
    const { visitorEmail, visitorName } = req.body;
    if (!visitorEmail) {
      return res.status(400).json({ message: "visitorEmail is required" });
    }
    const user = await User.findOne({ username: normalizePublicUsername(req.params.username) });
    if (!user) {
      return res.status(404).json({ message: "profile not found" });
    }
    const item = await EmailCapture.create({
      ownerId: user._id,
      visitorEmail,
      visitorName,
      source: "public-profile"
    });
    return res.status(201).json({ item });
  }
};

export const adminController = {
  stats: async (_req, res) => {
    const cacheKey = "cache:admin:stats";
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newToday,
      proUsers,
      businessUsers,
      canceledSubscriptions,
      signupTrend,
      flaggedAccounts,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ plan: "pro", subscriptionStatus: "active" }),
      User.countDocuments({ plan: "business", subscriptionStatus: "active" }),
      User.countDocuments({ subscriptionStatus: "canceled" }),
      User.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, users: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.find({ isBlocked: true }).select("name email plan createdAt").sort({ updatedAt: -1 }).limit(5),
      User.find({ isEmailVerified: false }).select("name email plan createdAt").sort({ createdAt: -1 }).limit(5)
    ]);

    const mrr = proUsers * 299 + businessUsers * 799;
    const churn = totalUsers ? Number(((canceledSubscriptions / totalUsers) * 100).toFixed(2)) : 0;
    const revenueTrend = [
      { plan: "pro", amount: proUsers * 299 },
      { plan: "business", amount: businessUsers * 799 }
    ];

    const payload = {
      totalUsers,
      newToday,
      proUsers,
      bizUsers: businessUsers,
      businessUsers,
      mrr,
      churn,
      churnPercent: churn,
      signupTrend: signupTrend.map((row) => ({ day: row._id, users: row.users })),
      revenueTrend,
      flaggedAccounts,
      pendingVerifications
    };
    await setCache(cacheKey, payload, CACHE_TTL.ADMIN_STATS);
    return res.json(payload);
  },

  users: async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const filter = String(req.query.filter || "all").toLowerCase();
    const sortBy = String(req.query.sortBy || "joined");
    const sortOrder = String(req.query.sortOrder || "desc") === "asc" ? 1 : -1;

    const match = {};
    if (search) {
      match.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }
    if (["free", "pro", "business"].includes(filter)) {
      match.plan = filter;
    }
    if (filter === "blocked") {
      match.isBlocked = true;
    }

    const sortFieldMap = {
      joined: "createdAt",
      name: "name",
      email: "email",
      plan: "plan",
      links: "linksCount",
      clicks: "clicksCount",
      status: "isBlocked"
    };
    const dbSortField = sortFieldMap[sortBy] || "createdAt";

    const [countRows, rows] = await Promise.all([
      User.aggregate([{ $match: match }, { $count: "total" }]),
      User.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "links",
            localField: "_id",
            foreignField: "userId",
            as: "links"
          }
        },
        { $addFields: { linksCount: { $size: "$links" } } },
        {
          $lookup: {
            from: "clicks",
            localField: "_id",
            foreignField: "userId",
            as: "clickRows"
          }
        },
        { $addFields: { clicksCount: { $size: "$clickRows" } } },
        {
          $project: {
            password: 0,
            refreshToken: 0,
            links: 0,
            clickRows: 0
          }
        },
        { $sort: { [dbSortField]: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ])
    ]);

    const total = countRows[0]?.total || 0;
    return res.json({
      items: rows,
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    });
  },

  userDetail: async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const userId = new mongoose.Types.ObjectId(String(user._id));
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [links, clickTrendRows, deviceRows, totalClicks] = await Promise.all([
      Link.find({ userId: user._id }).select("title url clicks isActive createdAt").sort({ clicks: -1, createdAt: -1 }),
      Click.aggregate([
        { $match: { userId, createdAt: { $gte: since14 } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            clicks: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Click.aggregate([
        { $match: { userId } },
        { $group: { _id: "$device", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }
      ]),
      Click.countDocuments({ userId })
    ]);
    const clickTrend = clickTrendRows.map((row) => ({ day: row._id, clicks: row.clicks }));
    const deviceBreakdown = deviceRows.map((row) => ({ device: row._id || "unknown", clicks: row.clicks }));
    return res.json({
      user,
      links,
      analytics: {
        totalClicks,
        profileViews: user.totalProfileViews || 0,
        clickTrend,
        deviceBreakdown
      }
    });
  },

  setPlan: async (req, res) => {
    const { plan } = req.body;
    if (!["free", "pro", "business"].includes(plan)) {
      return res.status(400).json({ message: "invalid plan" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { plan }, { new: true }).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    await AuditLog.create({
      adminId: req.user.sub,
      action: "set-plan",
      targetUserId: user._id,
      details: { plan },
      ip: req.ip
    });
    return res.json({ user });
  },

  toggleBlock: async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    await AuditLog.create({
      adminId: req.user.sub,
      action: "toggle-block",
      targetUserId: user._id,
      details: { isBlocked: user.isBlocked },
      ip: req.ip
    });
    return res.json({ user: await hydrateUser(user._id) });
  },

  removeUser: async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    await Promise.all([
      Link.deleteMany({ userId: user._id }),
      Click.deleteMany({ userId: user._id }),
      EmailCapture.deleteMany({ ownerId: user._id }),
      Subscription.deleteMany({ userId: user._id })
    ]);
    await AuditLog.create({
      adminId: req.user.sub,
      action: "delete-user",
      targetUserId: user._id,
      details: { email: user.email },
      ip: req.ip
    });
    return res.json({ message: "user deleted" });
  },

  auditLog: async (req, res) => {
    const { adminId, action, from, to, targetUserId } = req.query;
    const match = {};
    if (adminId) {
      match.adminId = new mongoose.Types.ObjectId(String(adminId));
    }
    if (action) {
      match.action = String(action);
    }
    if (targetUserId) {
      match.targetUserId = new mongoose.Types.ObjectId(String(targetUserId));
    }
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(String(from));
      if (to) match.createdAt.$lte = new Date(String(to));
    }
    const items = await AuditLog.find(match).sort({ createdAt: -1 }).limit(200);
    return res.json({ items });
  },

  analytics: async (_req, res) => {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [clickTrend, byCountry, topLinks, topUsers] = await Promise.all([
      Click.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Click.aggregate([
        { $group: { _id: "$country", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 10 }
      ]),
      Link.find().sort({ clicks: -1 }).limit(10).select("title clicks userId"),
      Click.aggregate([
        { $group: { _id: "$userId", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userId: "$_id",
            clicks: 1,
            name: "$user.name",
            email: "$user.email"
          }
        }
      ])
    ]);
    return res.json({
      clickTrend: clickTrend.map((row) => ({ day: row._id, clicks: row.clicks })),
      topCountries: byCountry.map((row) => ({ country: row._id || "Unknown", clicks: row.clicks })),
      topLinks: topLinks.map((row) => ({ id: row._id, title: row.title, clicks: row.clicks, userId: row.userId })),
      topUsers
    });
  },

  topLinks: async (_req, res) => {
    const items = await Link.find().sort({ clicks: -1 }).limit(20).select("title clicks userId");
    return res.json({ items });
  },

  admins: async (_req, res) => {
    const items = await User.find({ role: "admin" }).select("name email").sort({ name: 1 });
    return res.json({ items });
  },

  actionTypes: async (_req, res) => {
    const rows = await AuditLog.aggregate([{ $group: { _id: "$action" } }, { $sort: { _id: 1 } }]);
    return res.json({ items: rows.map((row) => row._id).filter(Boolean) });
  }
};

function resolvePlanFromCheckoutBody(body) {
  const { plan: rawPlan, priceId } = body || {};
  let plan = String(rawPlan || "pro").toLowerCase();
  if (priceId) {
    const pid = String(priceId);
    if (pid === process.env.STRIPE_PRO_PRICE_ID) plan = "pro";
    else if (pid === process.env.STRIPE_BUSINESS_PRICE_ID) plan = "business";
  }
  if (!["pro", "business"].includes(plan)) {
    return null;
  }
  return plan;
}

function stripePriceIdForPlan(plan) {
  if (plan === "business") return process.env.STRIPE_BUSINESS_PRICE_ID;
  return process.env.STRIPE_PRO_PRICE_ID;
}

function buildInvoiceRowsForUser(user) {
  const uid = user._id.toString();
  const plan = user?.plan || "free";
  const amount = plan === "business" ? 799 : 299;
  const now = Date.now();
  return [0, 1, 2].map((i) => ({
    id: `inv_${uid}_${i}`,
    amount,
    currency: "inr",
    status: "paid",
    createdAt: new Date(now - (5 + i * 30) * 24 * 60 * 60 * 1000).toISOString()
  }));
}

export const paymentController = {
  checkout: async (req, res) => {
    const plan = resolvePlanFromCheckoutBody(req.body);
    if (!plan) {
      return res.status(400).json({ message: "invalid plan or priceId for checkout" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const priceId = req.body?.priceId || stripePriceIdForPlan(plan);

    if (stripe && priceId && process.env.CLIENT_URL) {
      try {
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { userId: user._id.toString() }
          });
          customerId = customer.id;
          await User.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customerId } });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${process.env.CLIENT_URL}/dashboard/billing?checkout=success`,
          cancel_url: `${process.env.CLIENT_URL}/dashboard/billing?checkout=cancel`,
          metadata: { userId: user._id.toString(), plan }
        });

        return res.status(201).json({
          checkoutUrl: session.url,
          mode: "stripe",
          sessionId: session.id
        });
      } catch (err) {
        console.error("stripe checkout", err);
        return res.status(502).json({ message: err.message || "checkout failed" });
      }
    }

    return res.status(201).json({
      checkoutUrl: `https://checkout.stripe.com/pay/mock-${plan}`,
      mode: "mock"
    });
  },

  webhook: async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({ received: true, mode: "mock" });
    }

    const signature = req.headers["stripe-signature"];
    let event;
    try {
      const payload = req.rawBody || req.body;
      event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    res.status(200).json({ received: true });

    const existing = await WebhookLog.findOne({ stripeEventId: event.id }).select("processed");
    if (existing?.processed) return;
    await WebhookLog.updateOne(
      { stripeEventId: event.id },
      { $setOnInsert: { stripeEventId: event.id, type: event.type, payload: event, processed: false } },
      { upsert: true }
    );

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const customerId = event.data.object.customer;
          if (customerId) {
            await User.updateOne({ stripeCustomerId: customerId }, { $set: { plan: "pro", subscriptionStatus: "active" } });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const customerId = event.data.object.customer;
          if (customerId) {
            await User.updateOne({ stripeCustomerId: customerId }, { $set: { plan: "free", subscriptionStatus: "canceled" } });
          }
          break;
        }
        case "invoice.payment_failed": {
          const customerId = event.data.object.customer;
          if (customerId) {
            await User.updateOne({ stripeCustomerId: customerId }, { $set: { subscriptionStatus: "past_due" } });
          }
          break;
        }
        default:
          break;
      }

      await WebhookLog.updateOne({ stripeEventId: event.id }, { processed: true, processedAt: new Date(), error: null });
    } catch (error) {
      await WebhookLog.updateOne({ stripeEventId: event.id }, { error: error.message });
    }
  },

  status: async (req, res) => {
    const user = await User.findById(req.user.sub).select("plan currentPeriodEnd subscriptionStatus");
    const [linksUsed, emailCaptures] = await Promise.all([
      Link.countDocuments({ userId: req.user.sub }),
      EmailCapture.countDocuments({ ownerId: req.user.sub })
    ]);
    const plan = user?.plan || "free";
    const linkLimit = plan === "free" ? 3 : null;
    return res.json({
      plan,
      status: user?.subscriptionStatus || (plan === "free" ? "inactive" : "active"),
      nextRenewalDate: user?.currentPeriodEnd || null,
      usage: {
        linksUsed,
        linksLimit: linkLimit,
        emailCaptures
      }
    });
  },

  cancel: async (req, res) => {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.plan = "free";
    user.subscriptionStatus = "canceled";
    user.currentPeriodEnd = null;
    await user.save();
    return res.json({ message: "subscription cancelled", plan: "free" });
  },

  invoices: async (req, res) => {
    const user = await User.findById(req.user.sub).select("plan");
    const items = buildInvoiceRowsForUser(user || { _id: req.user.sub, plan: "free" });
    return res.json({ items });
  },

  invoicePdf: async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const uid = user._id.toString();
    if (!String(id).startsWith(`inv_${uid}_`)) {
      return res.status(404).json({ message: "invoice not found" });
    }
    const rows = buildInvoiceRowsForUser(user);
    const row = rows.find((r) => r.id === id);
    if (!row) {
      return res.status(404).json({ message: "invoice not found" });
    }

    const buf = await buildInvoicePdfBuffer({
      invoiceId: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: new Date(row.createdAt),
      billToName: user.name,
      billToEmail: user.email
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${row.id}.pdf"`);
    return res.send(buf);
  },

  portal: async (req, res) => {
    const user = await User.findById(req.user.sub);
    if (!user?.stripeCustomerId || !stripe) {
      return res.json({
        url: "https://billing.stripe.com/p/mock_portal",
        mode: "mock"
      });
    }
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/billing`
      });
      return res.json({ url: session.url, mode: "stripe" });
    } catch (err) {
      console.error("stripe portal", err);
      return res.status(502).json({ message: err.message || "portal failed" });
    }
  }
};

export const settingsController = {
  profile: async (req, res) => {
    const user = await hydrateUser(req.user.sub);
    return res.json({ user });
  },

  updateProfile: async (req, res) => {
    const allowed = [
      "name",
      "username",
      "bio",
      "theme",
      "customFont",
      "bodyFont",
      "customBgColor",
      "customBgImage",
      "buttonStyle",
      "buttonColor",
      "animationStyle",
      "profileImage",
      "socialLinks",
      "onboardingCompleted"
    ];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (typeof updates.username === "string") {
      updates.username = updates.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(updates.username)) {
        return res.status(400).json({ message: "username must be 3-30 chars and use letters, numbers, or underscore" });
      }
      const existing = await User.findOne({ username: updates.username, _id: { $ne: req.user.sub } }).select("_id");
      if (existing) {
        return res.status(409).json({ message: "username already exists" });
      }
    }
    const user = await User.findByIdAndUpdate(req.user.sub, updates, { new: true }).select("-password -refreshToken");
    return res.json({ user });
  },

  updateTheme: async (req, res) => {
    const allowed = ["theme", "customFont", "bodyFont", "customBgColor", "customBgImage", "buttonStyle", "buttonColor", "animationStyle"];
    const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "no theme fields provided" });
    }
    const user = await User.findByIdAndUpdate(req.user.sub, updates, { new: true }).select("-password -refreshToken");
    return res.json({ user });
  },

uploadAvatar: async (req, res) => {
  try {
    console.log("=== UPLOAD DEBUG ===");
    console.log("File received:", req.file ? "YES" : "NO");
    console.log("File mimetype:", req.file?.mimetype);
    console.log("Cloudinary configured:", isCloudinaryConfigured);
    
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Check file type
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }
    
    // Check Cloudinary
    if (!isCloudinaryConfigured) {
      return res.status(501).json({ message: "Cloudinary not configured" });
    }
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "linksphere/avatars",
          transformation: [{ width: 512, height: 512, crop: "fill" }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    
    console.log("Cloudinary upload success:", result.secure_url);
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { profileImage: result.secure_url },
      { new: true }
    ).select("-password -refreshToken");
    
    return res.json({ 
      user, 
      imageUrl: result.secure_url, 
      provider: "cloudinary" 
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: error.message || "Upload failed" });
  }
},

  uploadCover: async (req, res) => {
    const current = await User.findById(req.user.sub).select("plan");
    if (!current || current.plan === "free") {
      return res.status(403).json({ message: "cover upload is available for Pro and Business plans" });
    }

    if (req.file?.buffer) {
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      if (!isCloudinaryConfigured) {
        return res.status(501).json({ message: "Cloudinary is not configured on the server" });
      }
      try {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "linksphere/covers",
              transformation: [{ width: 1600, height: 900, crop: "fill", quality: "auto:good", fetch_format: "auto" }]
            },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          Readable.from(req.file.buffer).pipe(stream);
        });
        const finalUrl = uploaded.secure_url;
        const user = await User.findByIdAndUpdate(req.user.sub, { customBgImage: finalUrl }, { new: true }).select("-password -refreshToken");
        return res.json({ user, imageUrl: finalUrl, provider: "cloudinary" });
      } catch (err) {
        console.error("cover upload", err);
        if (String(err?.message || "").includes("Must supply api_key")) {
          return res.status(500).json({
            message:
              "Cloudinary configuration is invalid (missing api_key). Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
          });
        }
        return res.status(500).json({ message: err.message || "upload failed" });
      }
    }

    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!imageUrl) {
      return res.status(400).json({ message: "imageUrl or file is required" });
    }
    let finalUrl = imageUrl;
    if (isCloudinaryConfigured && imageUrl.includes("cloudinary.com")) {
      const uploaded = await cloudinary.uploader.upload(imageUrl, {
        folder: "linksphere/covers",
        transformation: [{ width: 1600, height: 900, crop: "fill", quality: "auto:good", fetch_format: "auto" }]
      });
      finalUrl = uploaded.secure_url;
    }
    const user = await User.findByIdAndUpdate(req.user.sub, { customBgImage: finalUrl }, { new: true }).select("-password -refreshToken");
    return res.json({ user, imageUrl: finalUrl, provider: isCloudinaryConfigured ? "cloudinary" : "direct" });
  },

  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.sub);
    if (!user || !user.password) {
      return res.status(400).json({ message: "password account not found" });
    }
    const valid = await bcrypt.compare(currentPassword || "", user.password);
    if (!valid) {
      return res.status(400).json({ message: "current password is incorrect" });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: "password updated" });
  },

  sessions: async (_req, res) =>
    {
      const user = await User.findById(_req.user.sub).select("activeSessions");
      const currentSessionId = String(_req.headers["x-session-id"] || "");
      const items = (user?.activeSessions || [])
        .map((session) => ({
          id: session.sessionId,
          device: session.device,
          location: session.location,
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          active: session.sessionId === currentSessionId
        }))
        .sort((a, b) => new Date(b.lastSeenAt || b.createdAt).getTime() - new Date(a.lastSeenAt || a.createdAt).getTime());
      return res.json({ items });
    },

  revokeSession: async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    user.activeSessions = (user.activeSessions || []).filter((session) => session.sessionId !== id);
    await user.save();
    return res.json({ message: "session revoked" });
  },

  notifications: async (req, res) => {
    const user = await User.findById(req.user.sub).select("notificationPreferences");
    return res.json({
      preferences: user?.notificationPreferences || {
        weeklyReport: true,
        newSubscriberAlerts: true,
        emailVerifyReminder: true
      }
    });
  },

  updateNotifications: async (req, res) => {
    const existing = await User.findById(req.user.sub).select("notificationPreferences");
    const cur = existing?.notificationPreferences || {};
    const next = {
      weeklyReport: typeof req.body?.weeklyReport === "boolean" ? req.body.weeklyReport : cur.weeklyReport !== false,
      newSubscriberAlerts:
        typeof req.body?.newSubscriberAlerts === "boolean" ? req.body.newSubscriberAlerts : cur.newSubscriberAlerts !== false,
      emailVerifyReminder:
        typeof req.body?.emailVerifyReminder === "boolean" ? req.body.emailVerifyReminder : cur.emailVerifyReminder !== false
    };
    const user = await User.findByIdAndUpdate(req.user.sub, { notificationPreferences: next }, { new: true }).select(
      "notificationPreferences"
    );
    return res.json({ preferences: user.notificationPreferences });
  },

  deleteProfileAccount: async (req, res) => {
    const user = await User.findById(req.user.sub);
    const username = String(req.body?.username || "");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (username && username !== user.username) {
      return res.status(400).json({ message: "username confirmation mismatch" });
    }

    // Soft-delete marker before irreversible removal.
    await User.updateOne(
      { _id: user._id },
      { $set: { isBlocked: true, blockReason: "self-delete-request", emailVerifyToken: null, refreshToken: null } }
    );

    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Link.deleteMany({ userId: user._id }),
      Click.deleteMany({ userId: user._id }),
      EmailCapture.deleteMany({ ownerId: user._id }),
      Subscription.deleteMany({ userId: user._id }),
      AuditLog.deleteMany({ targetUserId: user._id })
    ]);
    res.clearCookie("refreshToken");
    return res.json({ message: "account deleted" });
  },

  deleteAccount: async (req, res) => settingsController.deleteProfileAccount(req, res),

  subscribers: async (req, res) => {
    const items = await EmailCapture.find({ ownerId: req.user.sub }).sort({ createdAt: -1 }).limit(500);
    return res.json({ items });
  }
};

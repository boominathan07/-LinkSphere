import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
  );
}

async function signAndPersistRefreshToken(user) {
  const refreshToken = signRefreshToken(user);
  await User.updateOne({ _id: user._id }, { $set: { refreshToken } });
  return refreshToken;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function hydrateUser(userId) {
  return User.findById(userId).select("-password -refreshToken");
}

export const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, username, plan = "free" } = req.body;

      console.log("Registration attempt:", { name, email, username });

      if (!name || !email || !password || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check existing user
      const existing = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
      });

      if (existing) {
        return res.status(409).json({ message: "Email or username already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        plan,
        password: passwordHash,
        isEmailVerified: true, // Skip email verification for now
        role: "user",
      });

      console.log("User created:", user._id);

      // Generate tokens
      const accessToken = signAccessToken(user);
      const refreshToken = await signAndPersistRefreshToken(user);
      setRefreshCookie(res, refreshToken);

      return res.status(201).json({
        success: true,
        accessToken,
        user: await hydrateUser(user._id),
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: error.message || "Registration failed" });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: "Account blocked by admin" });
      }

      const accessToken = signAccessToken(user);
      const refreshToken = await signAndPersistRefreshToken(user);
      setRefreshCookie(res, refreshToken);

      return res.json({
        success: true,
        accessToken,
        user: await hydrateUser(user._id),
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  },

  me: async (req, res) => {
    try {
      const user = await hydrateUser(req.user.sub);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  },

  logout: async (req, res) => {
    try {
      await User.updateOne({ _id: req.user.sub }, { $set: { refreshToken: null } });
      res.clearCookie("refreshToken");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  },

  refresh: async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const newRefreshToken = await signAndPersistRefreshToken(user);
      setRefreshCookie(res, newRefreshToken);

      res.json({ accessToken: signAccessToken(user) });
    } catch (error) {
      res.status(401).json({ message: "Invalid refresh token" });
    }
  },

  checkUsername: async (req, res) => {
    try {
      const username = req.params.username?.toLowerCase();
      if (!username || username.length < 3) {
        return res.json({ available: false });
      }

      const exists = await User.exists({ username });
      res.json({ available: !exists });
    } catch (error) {
      res.json({ available: false });
    }
  },

  google: async (req, res) => {
    res.json({ message: "Google auth coming soon" });
  },

  forgotPassword: async (req, res) => {
    res.json({ message: "Forgot password coming soon" });
  },

  resetPassword: async (req, res) => {
    res.json({ message: "Reset password coming soon" });
  },

  verifyEmail: async (req, res) => {
    res.json({ message: "Email verified" });
  },

  resendVerification: async (req, res) => {
    res.json({ message: "Verification email sent" });
  },

  setup2FA: async (req, res) => {
    res.json({ message: "2FA setup coming soon" });
  },

  verify2FA: async (req, res) => {
    res.json({ message: "2FA verify coming soon" });
  },

  disable2FA: async (req, res) => {
    res.json({ message: "2FA disabled" });
  },

  sessions: async (req, res) => {
    res.json({ items: [] });
  },

  revokeSession: async (req, res) => {
    res.json({ message: "Session revoked" });
  }
};
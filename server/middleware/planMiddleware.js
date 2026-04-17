import Link from "../models/Link.js";
import User from "../models/User.js";

export async function requireEmailVerified(req, res, next) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  const user = await User.findById(req.user.sub).select("isEmailVerified");
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!user.isEmailVerified) {
    return res.status(403).json({ message: "Verify your email before creating links." });
  }
  return next();
}

export async function enforceLinkPlanLimit(req, res, next) {
  const user = await User.findById(req.user.sub).select("plan");
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.plan === "free") {
    const linkCount = await Link.countDocuments({ userId: req.user.sub });
    if (linkCount >= 3) {
      return res.status(403).json({ message: "Free plan limit reached. Upgrade to add more links." });
    }
  }

  return next();
}

import { Router } from "express";
import { body, param } from "express-validator";
import multer from "multer";
import {
  authController,
  linksController,
  analyticsController,
  publicController,
  paymentController,
  settingsController,
  adminController
} from "../controllers/index.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import { enforceLinkPlanLimit, requireEmailVerified } from "../middleware/planMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = Router();

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ==================== AUTH ROUTES ====================
router.post(
  "/auth/register",
  [
    body("name").isString().isLength({ min: 2 }),
    body("email").isEmail(),
    body("password").isString().isLength({ min: 8 }),
    body("username").isString().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    validateRequest
  ],
  authController.register
);

router.post(
  "/auth/login",
  [
    body("email").isEmail(),
    body("password").isString().notEmpty(),
    validateRequest
  ],
  authController.login
);

router.post("/auth/google", authController.google);
router.post("/auth/refresh", authController.refresh);
router.get("/auth/me", requireAuth, authController.me);
router.post("/auth/logout", requireAuth, authController.logout);
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);
router.get("/auth/verify-email/:token", authController.verifyEmail);
router.get("/auth/check-username/:username", authController.checkUsername);
router.post("/auth/resend-verification", authController.resendVerification);
router.post("/auth/2fa/setup", requireAuth, authController.setup2FA);
router.post("/auth/2fa/verify", requireAuth, authController.verify2FA);
router.post("/auth/2fa/disable", requireAuth, authController.disable2FA);
router.get("/auth/sessions", requireAuth, authController.sessions);
router.delete("/auth/sessions/:id", requireAuth, authController.revokeSession);

// ==================== LINKS ROUTES ====================
router.get("/links", requireAuth, linksController.list);
router.post("/links/thumbnail", requireAuth, linksController.uploadThumbnail);
router.post(
  "/links",
  requireAuth,
  requireEmailVerified,
  enforceLinkPlanLimit,
  [
    body("title").isString().isLength({ min: 1, max: 60 }),
    body("url").isURL({ require_protocol: true }),
    validateRequest
  ],
  linksController.create
);
router.put("/links/:id", requireAuth, linksController.update);
router.put("/links/reorder", requireAuth, linksController.reorder);
router.patch("/links/:id/toggle", requireAuth, linksController.toggle);
router.delete("/links/:id", requireAuth, linksController.remove);

// ==================== ANALYTICS ROUTES ====================
router.get("/analytics/summary", requireAuth, analyticsController.summary);
router.get("/analytics/weekly", requireAuth, analyticsController.weekly);
router.get("/analytics/geo", requireAuth, analyticsController.geo);
router.get("/analytics/per-link", requireAuth, analyticsController.perLink);
router.get("/analytics/devices", requireAuth, analyticsController.devices);
router.get("/analytics/browsers", requireAuth, analyticsController.browsers);
router.get("/analytics/os", requireAuth, analyticsController.os);
router.get("/analytics/referrers", requireAuth, analyticsController.referrers);
router.get("/analytics/monthly", requireAuth, analyticsController.monthly);
router.get("/analytics/hourly", requireAuth, analyticsController.hourly);
router.get("/analytics/realtime", requireAuth, analyticsController.realtime);
router.get("/analytics/recent-activity", requireAuth, analyticsController.recentActivity);
router.get("/analytics/audience", requireAuth, analyticsController.audience);
router.get("/analytics/export/csv", requireAuth, analyticsController.exportCsv);

// ==================== PUBLIC ROUTES ====================
router.get("/public/:username", publicController.profile);
router.post("/public/click/:linkId", publicController.click);
router.post("/public/view/:username", publicController.view);
router.post("/public/email/:username", publicController.emailCapture);

// ==================== PROFILE & SETTINGS ROUTES ====================
router.get("/settings/profile", requireAuth, settingsController.profile);
router.put("/settings/profile", requireAuth, settingsController.updateProfile);
router.put("/profile/update", requireAuth, settingsController.updateProfile); // Alias for compatibility
router.patch("/profile/theme", requireAuth, settingsController.updateTheme);
router.post("/profile/avatar", requireAuth, upload.single("file"), settingsController.uploadAvatar);
router.post("/profile/cover", requireAuth, upload.single("file"), settingsController.uploadCover);
router.put("/settings/password", requireAuth, settingsController.changePassword);
router.get("/settings/sessions", requireAuth, settingsController.sessions);
router.delete("/settings/sessions/:id", requireAuth, settingsController.revokeSession);
router.get("/settings/notifications", requireAuth, settingsController.notifications);
router.put("/settings/notifications", requireAuth, settingsController.updateNotifications);
router.delete("/settings/account", requireAuth, settingsController.deleteAccount);
router.get("/settings/subscribers", requireAuth, settingsController.subscribers);

// ==================== PAYMENT ROUTES ====================
router.post("/payment/checkout", requireAuth, paymentController.checkout);
router.post("/payment/webhook", paymentController.webhook);
router.get("/payment/status", requireAuth, paymentController.status);
router.post("/payment/cancel", requireAuth, paymentController.cancel);
router.get("/payment/invoices", requireAuth, paymentController.invoices);
router.get("/payment/invoices/:id/pdf", requireAuth, paymentController.invoicePdf);
router.post("/payment/portal", requireAuth, paymentController.portal);

// ==================== ADMIN ROUTES ====================
router.get("/admin/stats", requireAuth, requireAdmin, adminController.stats);
router.get("/admin/users", requireAuth, requireAdmin, adminController.users);
router.get("/admin/users/:id", requireAuth, requireAdmin, adminController.userDetail);
router.put("/admin/users/:id/plan", requireAuth, requireAdmin, adminController.setPlan);
router.patch("/admin/users/:id/block", requireAuth, requireAdmin, adminController.toggleBlock);
router.delete("/admin/users/:id", requireAuth, requireAdmin, adminController.removeUser);
router.get("/admin/audit-log", requireAuth, requireAdmin, adminController.auditLog);
router.get("/admin/analytics", requireAuth, requireAdmin, adminController.analytics);
router.get("/admin/top-links", requireAuth, requireAdmin, adminController.topLinks);
router.get("/admin/admins", requireAuth, requireAdmin, adminController.admins);
router.get("/admin/action-types", requireAuth, requireAdmin, adminController.actionTypes);

// ==================== HEALTH CHECK ====================
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
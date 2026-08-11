// routes/authRoutes.js
import express from "express";
import {
  login, logout, refresh, authMiddleware, storePushToken, sendManualTestNotification,
  forgotPassword, resetPassword, getMe, getContext, changePassword, googleLogin
} from "../Controller/AuthController.js"

const router = express.Router();

// ------------------- AUTH ROUTES -------------------

// Get current user profile (validates existing token)
router.get("/me", authMiddleware, getMe);

// Get unified permission context (permissions + filtered navigation + capabilities)
router.get("/me/context", authMiddleware, getContext);

// Login
router.post("/login", (req, res, next) => {
  next();
}, login);

// Google OAuth Login
router.post("/google", googleLogin);

// Refresh access token
router.post("/refresh", refresh);

// Logout
router.post("/logout", logout);



// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password", resetPassword);

// Change password
router.post("/change-password", authMiddleware, changePassword);

// FCM Token Registration
router.post("/store-push-token", authMiddleware, storePushToken);

// Manual Test Notification
router.post("/test-notification", authMiddleware, sendManualTestNotification);

export default router;


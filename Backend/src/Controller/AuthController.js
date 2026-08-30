import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import models from "../models/Collection.js";

const Employee = models.employees;
const Agent = models.agents;
const session = models.sessions;

import { generateSecret, generateJti } from "../utils/tokenGenrator.js";
import { getDeviceInfo } from "../utils/deviceInfo.js";
import { getGlobalModels } from "../models/global/index.js";

/* -------------------------------- LOGIN -------------------------------- */

export const login = async (req, res, next) => {
  const t0 = performance.now();
  const timings = {};
  try {
    const { workEmail, email, password, platform = "web" } = req.body;
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['deviceuuid'];
    const emailToUse = workEmail || email;

    if (!emailToUse || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!deviceUUID) {
      return res.status(400).json({ message: "Device UUID header is required" });
    }

    let tenantId = 'admin';
    let dbName = process.env.DEFAULT_TENANT_DB || 'tenant_admin';
    let user = null;
    let userType = "employee";

    // 1. Try Global UserLogin central auth first
    const tGlobalStart = performance.now();
    try {
      const { UserLogin, Tenant } = getGlobalModels();
      const globalUser = await UserLogin.findOne({ email: emailToUse.toLowerCase() });
      timings.globalUserLookup = +(performance.now() - tGlobalStart).toFixed(2);

      if (globalUser) {
        const tBcrypt = performance.now();
        const isValidGlobal = await globalUser.comparePassword(password);
        timings.bcryptCompare = +(performance.now() - tBcrypt).toFixed(2);

        if (!isValidGlobal) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        tenantId = globalUser.tenantId;
        dbName = globalUser.dbName;
        let tenantSlug = tenantId;
        let tenantRec = null;
        let tenantModules = ['*'];

        const tTenantRes = performance.now();
        try {
          tenantRec = await Tenant.findOne({ tenantId: globalUser.tenantId }).populate('enabledModules').lean();
          if (tenantRec?.slug) tenantSlug = tenantRec.slug;
          if (tenantRec?.dbName) dbName = tenantRec.dbName;
          if (Array.isArray(tenantRec?.enabledModules) && tenantRec.enabledModules.length > 0) {
            tenantModules = tenantRec.enabledModules.map((mod) => {
              if (typeof mod === 'string') return mod;
              if (mod && typeof mod === 'object') return mod.moduleId || mod._id?.toString() || mod.name?.toLowerCase();
              return null;
            }).filter(Boolean);
          }
        } catch (_) { }
        timings.tenantResolve = +(performance.now() - tTenantRes).toFixed(2);

        let resolvedName = globalUser.name;
        let resolvedRole = globalUser.role || 'Employee';
        let resolvedIsSuperAdmin = !!globalUser.isSuperAdmin;
        let resolvedDept = null;
        let resolvedDesig = null;
        let resolvedManager = null;

        if (dbName) {
          const tTenantConn = performance.now();
          try {
            const { default: TenantConnectionManager } = await import("../tenant/TenantConnectionManager.js");
            const { conn, models: tenantModels } = await TenantConnectionManager.getTenantConnection(dbName, tenantModules);
            timings.tenantConnection = +(performance.now() - tTenantConn).toFixed(2);

            const tEmpLookup = performance.now();
            const EmpModel = tenantModels?.employees || conn.models.employees || conn.model('employees', Employee.schema);
            const RoleModel = tenantModels?.roles || conn.models.roles || conn.model('roles', models.roles.schema);
            let empDoc = null;
            if (globalUser.employeeId) {
              empDoc = await EmpModel.findById(globalUser.employeeId)
                .populate('professionalInfo.role')
                .lean();
            }
            if (!empDoc && emailToUse) {
              empDoc = await EmpModel.findOne({
                $or: [
                  { 'authInfo.email': emailToUse },
                  { 'basicInfo.email': emailToUse },
                  { userLoginId: globalUser._id },
                  { 'authInfo.userLoginId': globalUser._id }
                ]
              }).populate('professionalInfo.role').lean();
              if (empDoc) {
                globalUser.employeeId = empDoc._id;
                UserLogin.updateOne({ _id: globalUser._id }, { $set: { employeeId: empDoc._id } }).catch(() => {});
              }
            }
            timings.empLookup = +(performance.now() - tEmpLookup).toFixed(2);

            if (empDoc?.basicInfo) {
              resolvedName = [empDoc.basicInfo.firstName, empDoc.basicInfo.lastName].filter(Boolean).join(' ');
            }

            if (empDoc?.professionalInfo?.role) {
              const r = empDoc.professionalInfo.role;
              if (typeof r === 'object' && r !== null && r.name) {
                resolvedRole = r.name;
                if (r.isSuperAdmin) resolvedIsSuperAdmin = true;
              } else {
                const roleIdStr = (r?._id || r)?.toString();
                if (roleIdStr) {
                  try {
                    const roleDoc = await RoleModel.findById(roleIdStr).lean();
                    if (roleDoc) {
                      resolvedRole = roleDoc.name;
                      if (roleDoc.isSuperAdmin) resolvedIsSuperAdmin = true;
                    } else {
                      const roleByName = await RoleModel.findOne({ name: roleIdStr }).lean();
                      if (roleByName) {
                        resolvedRole = roleByName.name;
                        if (roleByName.isSuperAdmin) resolvedIsSuperAdmin = true;
                      }
                    }
                  } catch (_) { }
                }
              }
            }

            if (empDoc?.isSuperAdmin) {
              resolvedIsSuperAdmin = true;
            }
            resolvedDept = empDoc?.professionalInfo?.department;
            resolvedDesig = empDoc?.professionalInfo?.designation;
            resolvedManager = empDoc?.professionalInfo?.reportingManager;

            // Sync back to Global UserLogin asynchronously to ensure cache coherence
            if (globalUser.role !== resolvedRole || globalUser.isSuperAdmin !== resolvedIsSuperAdmin) {
              UserLogin.updateOne(
                { _id: globalUser._id },
                { $set: { role: resolvedRole, isSuperAdmin: resolvedIsSuperAdmin } }
              ).catch(e => console.error('[UserLogin sync on login error]', e.message));
            }
          } catch (err) {
            console.error('[Tenant Employee lookup on login failed]', err.message);
          }
        }

        user = {
          _id: globalUser.employeeId || globalUser._id,
          name: resolvedName || emailToUse.split('@')[0],
          role: resolvedRole,
          userType: globalUser.userType,
          isSuperAdmin: resolvedIsSuperAdmin,
          tenantSlug,
          enabledModules: tenantModules,
          professionalInfo: {
            role: resolvedRole,
            department: resolvedDept,
            designation: resolvedDesig,
            reportingManager: resolvedManager
          }
        };
        userType = globalUser.userType || "employee";
      }
    } catch (_) {
      // Fallback if Global DB model initialization is pending
    }

    // 2. Fallback: Validate against legacy local models if not authenticated via Global UserLogin
    if (!user) {
      const tLegacy = performance.now();
      user = await Employee.findOne({
        "authInfo.workEmail": emailToUse,
      });

      if (!user) {
        user = await Agent.findOne({ email: emailToUse, isActive: true }).populate("client");
        if (user) {
          userType = "agent";
        }
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      let isValid = false;
      if (userType === "employee") {
        isValid = await bcrypt.compare(password, user.authInfo.password);
      } else {
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          isValid = await user.comparePassword(password);
        } else {
          isValid = password === user.password;
        }
      }

      timings.legacyAuth = +(performance.now() - tLegacy).toFixed(2);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    // 3. Build payload with multi-tenant context claims
    let payload = {
      id: user._id,
      platform,
      userType,
      tenantId,
      tenantSlug: user.tenantSlug || (tenantId === 'default' || tenantId === 'admin' ? 'admin' : tenantId),
      dbName,
      enabledModules: user.enabledModules || ['*'],
      isSuperAdmin: !!(user.isSuperAdmin || (typeof user.role === 'object' && user.role?.isSuperAdmin)),
    };

    if (userType === "employee") {
      payload.role = user.professionalInfo?.role || user.role || 'Employee';
      payload.department = user.professionalInfo?.department;
      payload.designation = user.professionalInfo?.designation;
      const empName = [user.basicInfo?.firstName, user.basicInfo?.lastName].filter(Boolean).join(' ');
      payload.name = empName || user.name || 'User';
      payload.managerId = user.professionalInfo?.reportingManager;
    } else {
      payload.role = user.role || 'agent';
      payload.name = user.name;
      payload.clientId = user.client?._id;
    }

    // 3. Generate secrets + jti
    const tToken = performance.now();
    const accessSecret = generateSecret();
    const refreshSecret = generateSecret();
    const jti = generateJti();

    // 4. Create tokens (mobile tokens last 100 years: "36500d")
    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: platform === "mobile" ? "36500d" : "1h",
    });

    const refreshToken = jwt.sign(
      { id: payload.id, platform, jti },
      refreshSecret,
      { expiresIn: platform === "mobile" ? "36500d" : "7d" }
    );
    timings.tokenSign = +(performance.now() - tToken).toFixed(2);

    // 5. Create session
    const tSession = performance.now();
    const userSession = await session.create({
      userId: payload.id,
      userModel: userType === "employee" ? "employees" : "agents",
      platform,
      deviceUUID,
      generatedToken: {
        token: accessToken,
        secret: accessSecret,
        expiry: platform === "mobile" ? "36500d" : "1h",
      },
      refreshToken: {
        token: refreshToken,
        secret: refreshSecret,
        jti,
        expiry: platform === "mobile" ? "36500d" : "7d",
      },
      deviceInfo: getDeviceInfo(req, platform),
      status: "Active",
    });
    timings.sessionCreate = +(performance.now() - tSession).toFixed(2);

    // 6. Set cookies (web)
    if (platform === "web") {
      res.cookie("auth_token", accessToken, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    const totalTimeMs = +(performance.now() - t0).toFixed(2);
    timings.total = totalTimeMs;
    console.log(`[LOGIN_TIMING] User: ${emailToUse} | Total: ${totalTimeMs}ms | Breakdown:`, JSON.stringify(timings));

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      sessionId: userSession._id,
      platform,
      _timings: process.env.NODE_ENV === 'development' ? timings : undefined
    });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- GOOGLE LOGIN ----------------------------- */

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken, platform = "web" } = req.body;
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['deviceuuid'];

    if (!idToken) {
      return res.status(400).json({ message: "ID Token is required" });
    }

    if (!deviceUUID) {
      return res.status(400).json({ message: "Device UUID header is required" });
    }

    // 1. Verify Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified) {
      return res.status(400).json({ message: "Google account is not verified" });
    }

    const email = payload.email.toLowerCase();

    // 2. Find Employee by authInfo.googleEmail == email
    const user = await Employee.findOne({
      "authInfo.googleEmail": email,
    });

    if (!user) {
      return res.status(403).json({ message: "No employee account is linked to this Google email" });
    }

    if (!user.authInfo.googleLoginEnabled) {
      return res.status(403).json({ message: "Google login is disabled for this account" });
    }

    const userType = "employee";

    // 3. Build payload (same as password login)
    let tokenPayload = {
      id: user._id,
      platform,
      userType,
      role: user.professionalInfo.role,
      department: user.professionalInfo.department,
      designation: user.professionalInfo.designation,
      name: user.basicInfo.firstName,
      managerId: user.professionalInfo.reportingManager,
    };

    // 4. Generate secrets + jti
    const accessSecret = generateSecret();
    const refreshSecret = generateSecret();
    const jti = generateJti();

    // 5. Create tokens
    const accessToken = jwt.sign(tokenPayload, accessSecret, {
      expiresIn: platform === "mobile" ? "36500d" : "1h",
    });

    const refreshToken = jwt.sign(
      { id: tokenPayload.id, platform, jti },
      refreshSecret,
      { expiresIn: platform === "mobile" ? "36500d" : "7d" }
    );

    // 6. Create session with authMethod: "google"
    const userSession = await session.create({
      userId: tokenPayload.id,
      userModel: "employees",
      platform,
      deviceUUID,
      authMethod: "google",
      generatedToken: {
        token: accessToken,
        secret: accessSecret,
        expiry: platform === "mobile" ? "36500d" : "1h",
      },
      refreshToken: {
        token: refreshToken,
        secret: refreshSecret,
        jti,
        expiry: platform === "mobile" ? "36500d" : "7d",
      },
      deviceInfo: getDeviceInfo(req, platform),
      status: "Active",
    });

    // 7. Set cookies (web)
    if (platform === "web") {
      res.cookie("auth_token", accessToken, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      sessionId: userSession._id,
      platform,
    });
  } catch (err) {
    console.error("Google SSO verification failed:", err);
    return res.status(401).json({ message: "Google authentication failed or expired" });
  }
};

/* ----------------------------- AUTH MIDDLEWARE ----------------------------- */

export const authMiddleware = async (req, res, next) => {
  try {
    // Bypass authentication entirely for public profile images (to allow browser <img> tags to load them without cookies/CORS header constraints)
    const isProfileImage =
      req.path?.includes('/serve/profile/') ||
      req.path?.includes('/render/profile/') ||
      req.originalUrl?.includes('/api/files/serve/profile/') ||
      req.originalUrl?.includes('/api/files/render/profile/');

    if (isProfileImage) {
      return next();
    }

    const isPublicCareers =
      req.path?.includes('/read/job_openings') ||
      req.path?.includes('/create/candidates') ||
      req.path?.includes('/read/candidates') ||
      req.path?.includes('/update/candidates') ||
      req.originalUrl?.includes('/api/populate/read/job_openings') ||
      req.originalUrl?.includes('/api/populate/create/candidates') ||
      req.originalUrl?.includes('/api/populate/read/candidates') ||
      req.originalUrl?.includes('/api/populate/update/candidates');

    if (isPublicCareers) {
      req.user = {
        id: "000000000000000000000000",
        role: "guest",
        userType: "employee"
      };
      return next();
    }

    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.split(" ")[1];
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['X-Device-UUID'] || req.headers['deviceuuid'];
    const source = req.headers['x-source'];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    // Skip device UUID check for external sources or file rendering requests
    if (!deviceUUID && source !== 'external') {
      const isFileServing =
        req.path?.startsWith('/serve/') ||
        req.path?.startsWith('/render/') ||
        req.originalUrl?.includes('/api/files/serve/') ||
        req.originalUrl?.includes('/api/files/render/');

      if (!isFileServing) {
        return res.status(401).json({ message: "Device UUID required" });
      }
    }

    // Decode to get userId
    const decoded = jwt.decode(token);
    const resolvedUserId = decoded?.id || decoded?.agentId || decoded?.userId;
    if (!resolvedUserId)
      return res.status(401).json({ message: "Invalid token" });

    // For external sources or agent tokens, verify with JWT_SECRET or proceed
    if (source === 'external' || decoded?.role === 'agent' || decoded?.agentId) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (_) {
        if (source === 'external') {
          req.user = decoded;
          return next();
        }
      }
    }

    const sessionQuery = {
      userId: resolvedUserId,
      status: "Active",
    };
    if (decoded.platform) {
      sessionQuery.platform = decoded.platform;
    }
    if (deviceUUID) {
      sessionQuery.deviceUUID = deviceUUID;
    }

    const userSession = await session.findOne(sessionQuery).sort({ lastUsedAt: -1, createdAt: -1 });

    if (!userSession)
      return res.status(401).json({ message: "Session not found" });

    // Verify with stored secret
    jwt.verify(token, userSession.generatedToken.secret);

    const now = new Date();
    const lastUsed = userSession.lastUsedAt || new Date(0);
    // Debounce session update to once every 1 minute
    if (now.getTime() - lastUsed.getTime() > 60000) {
      userSession.lastUsedAt = now;
      // Save asynchronously so it doesn't block the request response time
      userSession.save().catch(err => console.error("[SessionSave] Failed to update lastUsedAt:", err.message));
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired", expired: true });
    }
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/* -------------------------------- REFRESH -------------------------------- */

export const refresh = async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies?.refresh_token || req.body.refreshToken;

    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token" });

    // Decode first (no verify)
    const decoded = jwt.decode(refreshToken);
    if (!decoded?.id || !decoded?.jti)
      return res.status(401).json({ message: "Invalid refresh token" });

    const deviceUUID = req.headers['x-device-uuid'] || req.headers['X-Device-UUID'];
    if (!deviceUUID) return res.status(401).json({ message: "Device UUID required" });

    const userSession = await session.findOne({
      userId: decoded.id,
      platform: decoded.platform,
      deviceUUID,
      status: "Active",
    });

    if (!userSession)
      return res.status(401).json({ message: "Session not found" });

    // Verify signature
    jwt.verify(refreshToken, userSession.refreshToken.secret);

    // jti check (REPLAY PROTECTION) - Skip for mobile
    if (decoded.platform !== "mobile" && decoded.jti !== userSession.refreshToken.jti) {
      userSession.status = "DeActive";
      await userSession.save();
      return res
        .status(403)
        .json({ message: "Refresh token reuse detected" });
    }

    // Rotate everything (for web only; for mobile, we preserve the refresh secret to prevent network failures during rotation)
    const newAccessSecret = generateSecret();
    const newRefreshSecret = decoded.platform === "mobile" ? userSession.refreshToken.secret : generateSecret();
    const newJti = generateJti();

    // Re-fetch user to get latest role (role may have changed since last login)
    let user = await Employee.findById(decoded.id).lean();
    let userType = "employee";

    if (!user) {
      user = await Agent.findById(decoded.id).populate("client").lean();
      if (user) {
        userType = "agent";
      }
    }

    if (!user) return res.status(401).json({ message: "User not found" });

    let newPayload = {
      id: decoded.id,
      platform: decoded.platform,
      userType,
    };

    if (userType === "employee") {
      newPayload.role = user.professionalInfo?.role;
      newPayload.department = user.professionalInfo?.department;
      newPayload.designation = user.professionalInfo?.designation;
      newPayload.name = user.basicInfo?.firstName;
      newPayload.managerId = user.professionalInfo?.reportingManager;
    } else {
      newPayload.role = user.role || 'agent';
      newPayload.name = user.name;
      newPayload.clientId = user.client?._id || user.client;
    }

    const newAccessToken = jwt.sign(
      newPayload,
      newAccessSecret,
      { expiresIn: decoded.platform === "mobile" ? "36500d" : "1h" }
    );

    const newRefreshToken = jwt.sign(
      { id: decoded.id, platform: decoded.platform, jti: newJti },
      newRefreshSecret,
      { expiresIn: decoded.platform === "mobile" ? "36500d" : "7d" }
    );

    userSession.generatedToken = {
      token: newAccessToken,
      secret: newAccessSecret,
      expiry: decoded.platform === "mobile" ? "36500d" : "1h",
    };

    userSession.refreshToken = {
      token: newRefreshToken,
      secret: newRefreshSecret,
      jti: newJti,
      expiry: decoded.platform === "mobile" ? "36500d" : "7d",
    };

    userSession.lastUsedAt = new Date();
    await userSession.save();

    if (decoded.platform === "web") {
      res.cookie("auth_token", newAccessToken);
      res.cookie("refresh_token", newRefreshToken);
    }

    return res.json({
      message: "Token refreshed",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------- LOGOUT -------------------------------- */

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(" ")[1];
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['X-Device-UUID'];


    if (!deviceUUID) return res.status(400).json({ message: "Device UUID required" });

    if (token) {
      const decoded = jwt.decode(token);

      if (decoded?.id) {
        const updateResult = await session.findOneAndUpdate(
          { userId: decoded.id, platform: decoded.platform, deviceUUID },
          { status: "DeActive" },
          { new: true }
        );

        if (!updateResult) {
          // Try without platform filter as fallback
          const fallbackResult = await session.findOneAndUpdate(
            { userId: decoded.id, deviceUUID },
            { status: "DeActive" },
            { new: true }
          );
        }
      }
    }

    res.clearCookie("auth_token");
    res.clearCookie("refresh_token");

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
};



export const storePushToken = async (req, res, next) => {
  try {
    const { sessionId, fcmToken } = req.body;


    if (!sessionId || !fcmToken) {
      return res.status(400).json({ message: "Session Id and FCM Token are required" });
    }

    const updatedSession = await session.findByIdAndUpdate(sessionId, {
      fcmToken,
      lastUsedAt: new Date()
    }, { new: true });

    if (!updatedSession) {
      return res.status(404).json({ message: "Session not found" });
    }


    return res.json({ message: "FCM Token stored successfully" });
  } catch (err) {
    console.error("Store push token error:", err);
    res.status(500).json({ message: "Failed to store push token" });
  }
};

/* ----------------------------- FORGOT PASSWORD ----------------------------- */

export const forgotPassword = async (req, res, next) => {
  try {
    const { workEmail } = req.body;
    if (!workEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const employee = await Employee.findOne({ "authInfo.workEmail": workEmail });
    if (!employee) {
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }

    const crypto = await import("node:crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    employee.authInfo.passwordResetToken = resetTokenHash;
    employee.authInfo.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await employee.save();

    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}&email=${workEmail}`;

    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });

      await transporter.sendMail({
        from: `"Support" <${process.env.SMTP_FROM || "noreply@portal.com"}>`,
        to: workEmail,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, ignore this email.</p>
        `,
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
    }

    return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- RESET PASSWORD ------------------------------ */

export const resetPassword = async (req, res, next) => {
  try {
    const { token, workEmail, password } = req.body;
    if (!token || !workEmail || !password) {
      return res.status(400).json({ message: "Token, email, and new password are required" });
    }

    const crypto = await import("node:crypto");
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const employee = await Employee.findOne({
      "authInfo.workEmail": workEmail,
      "authInfo.passwordResetToken": resetTokenHash,
      "authInfo.passwordResetExpires": { $gt: new Date() },
    });

    if (!employee) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const bcrypt = await import("bcrypt");
    const salt = await bcrypt.genSalt(10);
    employee.authInfo.password = await bcrypt.hash(password, salt);
    employee.authInfo.passwordResetToken = undefined;
    employee.authInfo.passwordResetExpires = undefined;
    await employee.save();

    return res.status(200).json({ message: "Password has been reset successfully. Please log in." });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- CHANGE PASSWORD ------------------------------ */

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, userType, email, dbName, tenantId, tenantSlug } = req.user || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
    }

    let globalUser = null;
    let tenantEmployee = null;
    let agentUser = null;
    let isPasswordValid = false;

    // 1. Check Global UserLogin first (Central Auth)
    try {
      const { UserLogin } = getGlobalModels();
      if (UserLogin) {
        const query = [];
        if (id) query.push({ _id: id }, { employeeId: id });
        if (email) query.push({ email: email.toLowerCase() });
        if (query.length > 0) {
          globalUser = await UserLogin.findOne({ $or: query });
          if (globalUser) {
            isPasswordValid = await globalUser.comparePassword(currentPassword);
          }
        }
      }
    } catch (e) {
      console.warn("[changePassword] Global UserLogin lookup:", e.message);
    }

    // 2. Check Tenant Employee / Local Employee
    const effectiveDb = dbName || (tenantSlug && tenantSlug !== 'admin' ? `tenant_${tenantSlug}` : process.env.DEFAULT_TENANT_DB || 'tenant_admin');
    try {
      const { default: TenantConnectionManager } = await import("../tenant/TenantConnectionManager.js");
      const { conn, models: tenantModels } = await TenantConnectionManager.getTenantConnection(effectiveDb);
      const EmpModel = tenantModels?.employees || conn.models.employees || conn.model('employees', Employee.schema);

      const empQuery = [];
      if (id) empQuery.push({ _id: id });
      if (globalUser?.employeeId) empQuery.push({ _id: globalUser.employeeId });
      if (email) empQuery.push({ 'authInfo.workEmail': email.toLowerCase() }, { 'basicInfo.email': email.toLowerCase() });

      if (empQuery.length > 0) {
        tenantEmployee = await EmpModel.findOne({ $or: empQuery });
        if (!isPasswordValid && tenantEmployee?.authInfo?.password) {
          isPasswordValid = await bcrypt.compare(currentPassword, tenantEmployee.authInfo.password);
        }
      }
    } catch (e) {
      // Fallback to default Employee model
      try {
        const empQuery = [];
        if (id) empQuery.push({ _id: id });
        if (email) empQuery.push({ 'authInfo.workEmail': email.toLowerCase() }, { 'basicInfo.email': email.toLowerCase() });
        if (empQuery.length > 0) {
          tenantEmployee = await Employee.findOne({ $or: empQuery });
          if (!isPasswordValid && tenantEmployee?.authInfo?.password) {
            isPasswordValid = await bcrypt.compare(currentPassword, tenantEmployee.authInfo.password);
          }
        }
      } catch (_) { }
    }

    // 3. Check Agent User
    if (!globalUser && !tenantEmployee) {
      try {
        const agentQuery = [];
        if (id) agentQuery.push({ _id: id });
        if (email) agentQuery.push({ email: email.toLowerCase() });
        if (agentQuery.length > 0) {
          agentUser = await Agent.findOne({ $or: agentQuery });
          if (agentUser) {
            if (agentUser.password?.startsWith('$2b$') || agentUser.password?.startsWith('$2a$')) {
              isPasswordValid = await agentUser.comparePassword(currentPassword);
            } else {
              isPasswordValid = currentPassword === agentUser.password;
            }
          }
        }
      } catch (_) { }
    }

    if (!globalUser && !tenantEmployee && !agentUser) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);

    // Update Global UserLogin
    if (globalUser) {
      globalUser.password = hashed;
      await globalUser.save();
    }

    // Update Tenant Employee
    if (tenantEmployee) {
      if (!tenantEmployee.authInfo) tenantEmployee.authInfo = {};
      tenantEmployee.authInfo.password = hashed;
      await tenantEmployee.save();
    }

    // Update Agent
    if (agentUser) {
      agentUser.password = hashed;
      await agentUser.save();
    }

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const sendManualTestNotification = async (req, res) => {
  try {
    const { message, title } = req.body;
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['X-Device-UUID'];

    if (!deviceUUID) {
      return res.status(400).json({ message: "Device UUID required" });
    }

    const userSession = await session.findOne({
      userId: req.user.id,
      deviceUUID,
      status: "Active"
    });

    if (!userSession?.fcmToken) {
      return res.status(404).json({ message: "No FCM token found for this device" });
    }

    const { default: fcmService } = await import('../utils/notification/fcmService.js');
    const NotificationReceptionist = getTenantModel('NotificationReceptionist');
    const NotificationContent = getTenantModel('NotificationContent');

    // 1. Create a dummy content record so sendMulticast has something to reference
    const contentDoc = await NotificationContent.create({
      type: 'system',
      title: title || 'Test Notification 📱',
      message: message || 'This is a manual test notification from your HR system.',
      sender: req.user.id
    });

    // 2. Create receptionist record
    const receptionistDoc = await NotificationReceptionist.create({
      notificationId: contentDoc._id,
      receiver: req.user.id,
      fcmStatus: 'pending'
    });

    // 3. Send via FCM
    await fcmService.sendMulticast(contentDoc, [receptionistDoc], [userSession.fcmToken]);

    return res.json({ message: "Test notification dispatched to Firebase successfully", notificationId: contentDoc._id });
  } catch (error) {
    console.error('Manual test notification error:', error);
    res.status(500).json({ message: "Failed to send test notification" });
  }
};

/* ----------------------------- GET ME / PROFILE ----------------------------- */

export const getMe = async (req, res, next) => {
  try {
    const { id, userType } = req.user;
    let user;
    const EmpModel = req.tenantContext?.getModel ? req.tenantContext.getModel('employees') : Employee;
    const AgentModel = req.tenantContext?.getModel ? req.tenantContext.getModel('agents') : Agent;

    if (userType === "employee") {
      user = await EmpModel.findById(id).populate('professionalInfo.role');
    } else if (userType === "agent") {
      user = await AgentModel.findById(id).populate("client");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let userData = {
      id: user._id,
      userType,
    };

    if (userType === "employee") {
      const r = user.professionalInfo?.role;
      const resolvedRole = (typeof r === 'object' && r !== null) ? (r.name || r.title || r._id?.toString()) : (r || req.user.role);
      userData.role = resolvedRole;
      userData.isSuperAdmin = !!(user.isSuperAdmin || (typeof r === 'object' && r?.isSuperAdmin));
      userData.department = user.professionalInfo?.department;
      userData.designation = user.professionalInfo?.designation;
      userData.name = [user.basicInfo?.firstName, user.basicInfo?.lastName].filter(Boolean).join(' ') || user.name;
      userData.managerId = user.professionalInfo?.reportingManager;
      userData.workEmail = user.authInfo?.workEmail;
    } else {
      userData.role = user.role || 'agent';
      userData.name = user.name;
      userData.clientId = user.client?._id;
      userData.workEmail = user.email;
    }

    return res.json({ user: userData });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- GET CONTEXT ----------------------------- */
/*
 * GET /api/auth/me/context
 *
 * Returns the unified permission context for the authenticated user:
 *   - user profile (id, name, role, department, designation)
 *   - permissions map (modelName → { action: boolean })
 *   - filtered navigation tree (sidebar filtered by permissions + dept/desig)
 *   - role capabilities
 *   - cache version for invalidation detection
 *
 * This is the ONLY endpoint the frontend needs to call to set up its
 * permission-aware UI. access_policies is the sole source of truth.
 */
export const getContext = async (req, res, next) => {
  try {
    const { id, role, userType } = req.user;
    const { getRoleMeta, getCacheVersion } = await import("../utils/cache.js");

    let eTag;
    let roleId = role;

    if (userType === "employee") {
      // Employees still need version-based ETag for cache invalidation
      const roleMeta = role ? getRoleMeta(role) : null;
      const cacheVersion = getCacheVersion();
      eTag = `W/"${id}-${role || "employee"}-${roleMeta?.permissionVersion || 1}-${cacheVersion}"`;
    } else {
      // Resolve role if missing from JWT (old tokens)
      if (!roleId) {
        const emp = await Employee.findById(id)
          .select("professionalInfo.role")
          .lean();
        roleId = emp?.professionalInfo?.role;
        if (!roleId) {
          return res.status(403).json({
            success: false,
            message: "User has no role assigned"
          });
        }
      }

      const roleMeta = getRoleMeta(roleId);
      const cacheVersion = getCacheVersion();
      eTag = `W/"${id}-${roleId}-${roleMeta?.permissionVersion || 1}-${cacheVersion}"`;
    }

    // Set ETag header
    res.setHeader("ETag", eTag);

    // If client already has the latest context version, return 304 immediately (<5ms response)
    if (req.headers["if-none-match"] === eTag) {
      return res.status(304).end();
    }

    // Agents get a minimal context (no sidebar, basic permissions)
    if (userType === "agent") {
      return res.json({
        success: true,
        data: {
          user: {
            id,
            name: req.user.name,
            role: { id: role, name: "Agent", level: 1, isSuperAdmin: false }
          },
          permissions: {},
          navigation: [],
          capabilities: [],
          _v: 0,
          _cachedAt: new Date().toISOString()
        }
      });
    }

    const { buildUserContext } = await import("../utils/contextBuilder.js");
    const context = await buildUserContext(id, roleId);



    return res.json({
      success: true,
      data: context
    });
  } catch (err) {
    console.error("[getContext] Error:", err.message);
    next(err);
  }
};

export const getActiveUsers = async (req, res, next) => {
  try {
    const { getActiveOnlineUserIds } = await import("../index.js");
    const onlineUserIds = getActiveOnlineUserIds ? getActiveOnlineUserIds() : [];
    return res.json({
      success: true,
      onlineUserIds
    });
  } catch (err) {
    next(err);
  }
};


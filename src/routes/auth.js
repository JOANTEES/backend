const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const { Pool } = require("pg");
const { Resend } = require("resend"); // Added for password reset
const emailService = require("../utils/emailService"); // Added for email notifications
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Helper function to set refresh token expiration (7 days from now)
const getRefreshTokenExpiration = () => {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7); // 7 days from now
  return expiration;
};

// Resend configuration (only initialize if API key is provided)
let resend = null;
console.log("📧 [RESEND-INIT] Initializing Resend email service...");
console.log(
  "📧 [RESEND-INIT] RESEND_API_KEY present:",
  !!process.env.RESEND_API_KEY
);
console.log(
  "📧 [RESEND-INIT] RESEND_DOMAIN:",
  process.env.RESEND_DOMAIN || "Not set (will use default)"
);

if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ [RESEND-INIT] Resend initialized successfully");
  } catch (error) {
    console.error(
      "❌ [RESEND-INIT] Failed to initialize Resend:",
      error.message
    );
  }
} else {
  console.log(
    "⚠️ [RESEND-INIT] RESEND_API_KEY not found - email service disabled"
  );
}

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const getResetTokenExpiration = () => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1); // 1 hour from now
  return expiration;
};

// Register user
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("first_name").notEmpty().trim(),
    body("last_name").notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password, first_name, last_name } = req.body;

      // Check if user already exists
      const userExists = await pool.query(
        "SELECT id, oauth_provider FROM users WHERE email = $1",
        [email]
      );

      if (userExists.rows.length > 0) {
        const existingUser = userExists.rows[0];

        // If user exists with OAuth, suggest they use OAuth login
        if (existingUser.oauth_provider) {
          return res.status(400).json({
            success: false,
            message: `An account with this email already exists. Please use 'Sign in with ${
              existingUser.oauth_provider.charAt(0).toUpperCase() +
              existingUser.oauth_provider.slice(1)
            }' instead.`,
            errorCode: "OAUTH_ACCOUNT_EXISTS",
          });
        }

        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await pool.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role",
        [email, passwordHash, first_name, last_name, "customer"]
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          role: newUser.rows[0].role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Generate refresh token
      const refreshToken = generateRefreshToken();
      const refreshTokenExpiresAt = getRefreshTokenExpiration();

      // Store refresh token in database
      await pool.query(
        "UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2 WHERE id = $3",
        [refreshToken, refreshTokenExpiresAt, newUser.rows[0].id]
      );

      const user = newUser.rows[0];

      // Send welcome email (don't wait for it to complete)
      emailService.sendWelcomeEmail(user).catch((error) => {
        console.error(
          "❌ [EMAIL] Welcome email failed for user:",
          user.email,
          error
        );
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }
);

// Login user
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
        [email]
      );

      if (user.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const userData = user.rows[0];

      // Check if user is OAuth-only (no password)
      if (!userData.password_hash) {
        return res.status(400).json({
          success: false,
          message:
            "This account was created with Google. Please use 'Sign in with Google' instead.",
          errorCode: "OAUTH_ONLY_ACCOUNT",
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(
        password,
        userData.password_hash
      );

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.rows[0].id,
          email: user.rows[0].email,
          role: user.rows[0].role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Generate refresh token
      const refreshToken = generateRefreshToken();
      const refreshTokenExpiresAt = getRefreshTokenExpiration();

      // Update last_login timestamp and store refresh token
      await pool.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, refresh_token = $1, refresh_token_expires_at = $2 WHERE id = $3",
        [refreshToken, refreshTokenExpiresAt, user.rows[0].id]
      );

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.rows[0].id,
          email: user.rows[0].email,
          first_name: user.rows[0].first_name,
          last_name: user.rows[0].last_name,
          role: user.rows[0].role,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  }
);

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user data
    const user = await pool.query(
      "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1",
      [decoded.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      user: user.rows[0],
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting profile",
    });
  }
});

// Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Find user with this refresh token
    const user = await pool.query(
      "SELECT id, email, first_name, last_name, role, refresh_token, refresh_token_expires_at FROM users WHERE refresh_token = $1 AND is_active = true",
      [refreshToken]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const userData = user.rows[0];

    // Check if refresh token has expired
    if (new Date() > new Date(userData.refresh_token_expires_at)) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Generate new refresh token (token rotation for security)
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenExpiresAt = getRefreshTokenExpiration();

    // Update refresh token in database
    await pool.query(
      "UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [newRefreshToken, newRefreshTokenExpiresAt, userData.id]
    );

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token refresh",
    });
  }
});

// Logout user
router.post("/logout", async (req, res) => {
  try {
    // For now, we just return success
    // The frontend should clear the token from storage
    // In the future, we can implement token blacklisting here

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
});

// Helper to resolve a safe redirect target based on ALLOWED_ORIGINS
function resolveRedirectBase(req) {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "http://localhost:3000"
  )
    .split(",")
    .map((o) => o.trim());
  const fallback = process.env.FRONTEND_URL || "http://localhost:3000";
  const nextParam = (req.query?.next || req.query?.state || "").toString();

  // If next is a full URL and starts with an allowed origin, allow it
  if (
    nextParam &&
    allowedOrigins.some((origin) => nextParam.startsWith(origin))
  ) {
    return nextParam;
  }

  // If state indicates admin, choose appropriate admin origin based on environment
  if (req.query?.state === "admin") {
    // In development, prefer ANY localhost origin over production
    const localOrigin = allowedOrigins.find((o) => o.includes("localhost"));
    if (localOrigin) return localOrigin;

    // Fall back to production admin origin if no local development
    const adminOrigin = allowedOrigins.find((o) =>
      /(^https?:\/\/)?admin\./i.test(o)
    );
    if (adminOrigin) return adminOrigin;
  }

  return fallback;
}

// Google OAuth Routes

// Initiate Google OAuth (accepts optional state/next query)
router.get("/google", (req, res, next) => {
  const state =
    req.query?.next || req.query?.state
      ? String(req.query.next || req.query.state)
      : undefined;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
});

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/login?error=oauth_failed`
        );
      }

      // Generate JWT token for the user
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Generate refresh token
      const refreshToken = generateRefreshToken();
      const refreshTokenExpiresAt = getRefreshTokenExpiration();

      // Store refresh token in database
      await pool.query(
        "UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [refreshToken, refreshTokenExpiresAt, user.id]
      );

      // Choose redirect base from allowed origins using state/next
      const redirectBase = resolveRedirectBase(req);
      const redirectUrl = `${redirectBase}/auth/callback?token=${token}&refreshToken=${refreshToken}&success=true`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/login?error=oauth_callback_failed`);
    }
  }
);

// Get OAuth user info (for frontend to get user details after OAuth)
router.get("/oauth/user", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        errorCode: "NO_TOKEN",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user data including OAuth info
    const user = await pool.query(
      "SELECT id, email, first_name, last_name, role, oauth_provider, profile_picture_url, created_at FROM users WHERE id = $1",
      [decoded.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User info retrieved successfully",
      user: user.rows[0],
    });
  } catch (error) {
    console.error("OAuth user info error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting user info",
    });
  }
});

// Forgot Password - Send reset email
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
  ],
  async (req, res) => {
    try {
      console.log("🔐 [FORGOT-PASSWORD] Starting password reset request");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ [FORGOT-PASSWORD] Validation failed:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email } = req.body;
      console.log("📧 [FORGOT-PASSWORD] Requested email:", email);

      // Check if user exists
      const user = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (user.rows.length === 0) {
        console.log("👤 [FORGOT-PASSWORD] User not found for email:", email);
        // Don't reveal if email exists or not for security
        return res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      const userData = user.rows[0];
      console.log("✅ [FORGOT-PASSWORD] User found:", {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        has_password: !!userData.password_hash,
        oauth_provider: userData.oauth_provider,
      });

      // Check if user is OAuth-only
      if (!userData.password_hash) {
        console.log(
          "🚫 [FORGOT-PASSWORD] OAuth-only account detected for:",
          email
        );
        return res.status(400).json({
          success: false,
          message:
            "This account was created with Google. Please use 'Sign in with Google' instead.",
          errorCode: "OAUTH_ONLY_ACCOUNT",
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenExpiresAt = getResetTokenExpiration();
      console.log("🔑 [FORGOT-PASSWORD] Generated reset token:", {
        token: resetToken.substring(0, 10) + "...",
        expires_at: resetTokenExpiresAt,
      });

      // Store reset token in database
      await pool.query(
        "UPDATE users SET reset_token = $1, reset_token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [resetToken, resetTokenExpiresAt, userData.id]
      );
      console.log("💾 [FORGOT-PASSWORD] Reset token stored in database");

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      console.log("🔗 [FORGOT-PASSWORD] Reset URL generated:", resetUrl);

      // Check Resend configuration
      console.log("📧 [FORGOT-PASSWORD] Resend configuration check:", {
        resend_initialized: !!resend,
        resend_api_key: process.env.RESEND_API_KEY ? "✅ Set" : "❌ Missing",
        resend_domain:
          process.env.RESEND_DOMAIN || "Using default (onboarding@resend.dev)",
        frontend_url: process.env.FRONTEND_URL,
      });

      if (!resend) {
        console.log(
          "❌ [FORGOT-PASSWORD] Resend not initialized - missing API key"
        );
        return res.status(500).json({
          success: false,
          message: "Email service not configured. Please contact support.",
        });
      }

      try {
        console.log(
          "📤 [FORGOT-PASSWORD] Attempting to send email via Resend..."
        );

        const emailData = {
          from: `Joantee <noreply@${
            process.env.RESEND_DOMAIN || "resend.dev"
          }>`,
          to: [email],
          subject: "Password Reset Request - Joantee",
          html: `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
               <h1 style="color: white; margin: 0; font-size: 28px;">Joantee</h1>
               <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
             </div>
             
             <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
               <h2 style="color: #333; margin-top: 0;">Hello ${userData.first_name}!</h2>
               <p style="color: #666; line-height: 1.6; font-size: 16px;">You requested a password reset for your Joantee account. Click the button below to reset your password:</p>
               
               <div style="text-align: center; margin: 40px 0;">
                 <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Reset Password</a>
               </div>
               
               <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                 <p style="color: #666; margin: 0; font-size: 14px;"><strong>⏰ This link will expire in 1 hour</strong> for security reasons.</p>
                 <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
               </div>
               
               <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
               <p style="color: #999; font-size: 12px; margin: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
               <p style="color: #999; font-size: 12px; word-break: break-all; margin: 5px 0 0 0;">${resetUrl}</p>
             </div>
           </div>
         `,
        };

        console.log("📧 [FORGOT-PASSWORD] Email data prepared:", {
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          html_length: emailData.html.length,
        });

        const emailResult = await resend.emails.send(emailData);

        console.log("📧 [FORGOT-PASSWORD] Full Resend response:", emailResult);

        // Check if there's an error in the response
        if (emailResult.error) {
          console.error(
            "❌ [FORGOT-PASSWORD] Resend API error:",
            emailResult.error
          );
          return res.status(500).json({
            success: false,
            message: `Email service error: ${emailResult.error.message}`,
          });
        }

        console.log(
          "✅ [FORGOT-PASSWORD] Email sent successfully via Resend:",
          {
            email_id: emailResult?.id || emailResult?.data?.id,
            to: email,
            from: emailData.from,
            subject: emailData.subject,
            response_status: emailResult?.status || "unknown",
          }
        );

        res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      } catch (emailError) {
        console.error("❌ [FORGOT-PASSWORD] Email sending failed:", {
          error: emailError.message,
          stack: emailError.stack,
          name: emailError.name,
          code: emailError.code,
        });
        res.status(500).json({
          success: false,
          message: "Failed to send reset email. Please try again later.",
        });
      }
    } catch (error) {
      console.error("❌ [FORGOT-PASSWORD] Server error:", {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(500).json({
        success: false,
        message: "Server error during password reset request",
      });
    }
  }
);

// Verify Reset Token - Check if token is valid
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    // Find user with this reset token
    const user = await pool.query(
      "SELECT id, email, first_name, reset_token_expires_at FROM users WHERE reset_token = $1",
      [token]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
        errorCode: "INVALID_RESET_TOKEN",
      });
    }

    const userData = user.rows[0];

    // Check if token has expired
    if (new Date() > new Date(userData.reset_token_expires_at)) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
        errorCode: "RESET_TOKEN_EXPIRED",
      });
    }

    res.json({
      success: true,
      message: "Reset token is valid",
      user: {
        email: userData.email,
        first_name: userData.first_name,
      },
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token verification",
    });
  }
});

// Reset Password - Reset password with token
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token, password } = req.body;

      // Find user with this reset token
      const user = await pool.query(
        "SELECT id, email, first_name, reset_token_expires_at FROM users WHERE reset_token = $1",
        [token]
      );

      if (user.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid reset token",
          errorCode: "INVALID_RESET_TOKEN",
        });
      }

      const userData = user.rows[0];

      // Check if token has expired
      if (new Date() > new Date(userData.reset_token_expires_at)) {
        return res.status(400).json({
          success: false,
          message: "Reset token has expired",
          errorCode: "RESET_TOKEN_EXPIRED",
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password and clear reset token
      await pool.query(
        "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [hashedPassword, userData.id]
      );

      res.json({
        success: true,
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during password reset",
      });
    }
  }
);

module.exports = router;

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Pool } = require("pg");
const emailService = require("../utils/emailService");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user information from Google profile
        const googleId = profile.id;
        const email = profile.emails[0].value;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;
        const profilePicture = profile.photos[0]?.value;

        // Check if user already exists with this Google ID
        const existingUser = await pool.query(
          "SELECT * FROM users WHERE oauth_id = $1 AND oauth_provider = $2",
          [googleId, "google"]
        );

        if (existingUser.rows.length > 0) {
          // User exists, update last login and return user
          await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [existingUser.rows[0].id]
          );

          return done(null, existingUser.rows[0]);
        }

        // Check if user exists with same email but different auth method
        const emailUser = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );

        if (emailUser.rows.length > 0) {
          // User exists with email but different auth method
          // Link the Google account to existing user
          await pool.query(
            "UPDATE users SET oauth_provider = $1, oauth_id = $2, oauth_email = $3, profile_picture_url = $4, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $5",
            ["google", googleId, email, profilePicture, emailUser.rows[0].id]
          );

          const updatedUser = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [emailUser.rows[0].id]
          );

          return done(null, updatedUser.rows[0]);
        }

        // Create new user
        const newUser = await pool.query(
          "INSERT INTO users (email, first_name, last_name, oauth_provider, oauth_id, oauth_email, profile_picture_url, last_login) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *",
          [
            email,
            firstName,
            lastName,
            "google",
            googleId,
            email,
            profilePicture,
          ]
        );

        const user = newUser.rows[0];

        // Send welcome email for new Google user (don't wait for it to complete)
        emailService.sendWelcomeEmail(user).catch((error) => {
          console.error(
            "❌ [EMAIL] Welcome email failed for Google user:",
            user.email,
            error
          );
        });

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (user.rows.length > 0) {
      done(null, user.rows[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    console.error("Deserialize user error:", error);
    done(error, null);
  }
});

module.exports = passport;

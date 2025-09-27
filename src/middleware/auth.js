const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    // Get token from header
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

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    let errorMessage = "Invalid token";
    let errorCode = "INVALID_TOKEN";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Token has expired. Please refresh your token.";
      errorCode = "TOKEN_EXPIRED";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format.";
      errorCode = "INVALID_TOKEN_FORMAT";
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token not active yet.";
      errorCode = "TOKEN_NOT_ACTIVE";
    }

    res.status(401).json({
      success: false,
      message: errorMessage,
      errorCode: errorCode,
    });
  }
};

// Middleware to check if user is admin
const adminAuth = (req, res, next) => {
  try {
    // Get token from header
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

    // Check if user is admin
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
        errorCode: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    let errorMessage = "Invalid token";
    let errorCode = "INVALID_TOKEN";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Token has expired. Please refresh your token.";
      errorCode = "TOKEN_EXPIRED";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format.";
      errorCode = "INVALID_TOKEN_FORMAT";
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token not active yet.";
      errorCode = "TOKEN_NOT_ACTIVE";
    }

    res.status(401).json({
      success: false,
      message: errorMessage,
      errorCode: errorCode,
    });
  }
};

module.exports = { auth, adminAuth };

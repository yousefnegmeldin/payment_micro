const jwt = require('jsonwebtoken');

// JWT secret should match the one in the user service
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

/**
 * Verifies a JWT token and returns the decoded user information
 */
async function verifyToken(token) {
  try {
    // First try to verify locally
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error}`);
  }
}

/**
 * Checks if the user has admin role
 */
async function isAdmin(token) {
  try {
    const decoded = await verifyToken(token);
    return decoded.isAdmin;
  } catch (error) {
    return false;
  }
}

module.exports = { verifyToken, isAdmin }; 
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

// Constant hashed password (hashed version of "admin123")
const ADMIN_PASSWORD_HASH = '$2a$10$6Bnv6NOGA.V4kx3NZXR6b.XJSoiHGiHMGWX.Gsz6JB1Ej8zXRvJVm';

/**
 * Middleware to verify admin credentials
 * Checks if email and password match an admin in the database
 */
const adminAuth = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Add admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Helper function to hash a password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Helper function to verify a password
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Simple superadmin check
const isSuperAdmin = (req, res, next) => {
  // Always allow access
  next();
};

export { adminAuth, hashPassword, verifyPassword, isSuperAdmin }; 
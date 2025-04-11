import express from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth, isSuperAdmin, hashPassword, verifyPassword } from '../middleware/adminAuth.js';
import Admin from '../models/Admin.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { sendOtpEmail, sendPasswordResetConfirmationEmail } from '../utils/emailService.js';

const router = express.Router();

// @desc    Reset admin (removes existing admin and creates new one)
// @route   POST /api/admin/reset
// @access  Public
router.post('/reset', async (req, res) => {
  try {
    // Drop the entire admins collection
    await mongoose.connection.collection('admins').drop();
    
    res.json({
      success: true,
      message: 'Admin reset successful. You can now create a new admin using /setup'
    });
  } catch (error) {
    // If collection doesn't exist, that's fine
    if (error.code === 26) {
      return res.json({
        success: true,
        message: 'Admin reset successful. You can now create a new admin using /setup'
      });
    }
    
    console.error('Reset error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during reset'
    });
  }
});

// @desc    Create first admin (only works if no admin exists)
// @route   POST /api/admin/setup
// @access  Public
router.post('/setup', async (req, res) => {
  try {
    // Check if any admin exists
    const adminExists = await Admin.findOne();
    if (adminExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Admin already exists. Use login instead.' 
      });
    }

    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password and name'
      });
    }

    // Create admin
    const admin = new Admin({
      email,
      password,
      name,
      role: 'admin'
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ 
      success: false,
      message: error.code === 11000 ? 'Email already exists' : 'Server error'
    });
  }
});

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all admins (superadmin only)
// @route   GET /api/admin
// @access  Private/SuperAdmin
router.get('/', adminAuth, isSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
router.get('/profile', adminAuth, (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
router.put('/profile', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await Admin.findById(req.admin._id);

    // Update fields if provided
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password) admin.password = password;

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: error.code === 11000 ? 'Email already exists' : 'Server error'
    });
  }
});

// @desc    Delete admin (superadmin only)
// @route   DELETE /api/admin/:id
// @access  Private/SuperAdmin
router.delete('/:id', adminAuth, isSuperAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Prevent superadmin from being deleted
    if (admin.role === 'superadmin') {
      return res.status(400).json({ message: 'Cannot delete superadmin' });
    }

    await admin.remove();
    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get admin info
// @route   GET /api/admin/info
// @access  Public
router.get('/info', (req, res) => {
  res.json({
    success: true,
    admin: {
      id: 'admin',
      name: 'Admin User',
      role: 'admin'
    }
  });
});

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get real stats from your database
    const stats = {
      totalOrders: 0,  // Replace with actual count from Orders collection
      totalRevenue: 0, // Calculate from Orders
      totalProducts: 0, // Count from Products collection
      totalCategories: 0 // Count from Categories collection
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard stats' 
    });
  }
});

// @desc    Generate password hash (development only)
// @route   POST /api/admin/generate-hash
// @access  Public
router.post('/generate-hash', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const hash = await hashPassword(password);
    res.json({ hash });
  } catch (error) {
    console.error('Hash generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: Add admin manually 
router.post('/add', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    
    // Create new admin
    const newAdmin = new Admin({ name, email, password });
    await newAdmin.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Admin added successfully' 
    });
  } catch (err) {
    console.error('Add admin error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST: Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('Received forgot password request for email:', req.body.email);
    const { email, skipEmail } = req.body; // Added skipEmail option for testing
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }
    
    // Find admin by email
    try {
      console.log('Searching for admin with email:', email);
      const admin = await Admin.findOne({ email });
      
      if (!admin) {
        console.log('Admin not found with email:', email);
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      console.log('Admin found:', admin._id);
      
      // Generate 6-digit OTP
      try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        console.log(`Generated OTP ${otp} for admin ${admin._id}, expires at ${otpExpiresAt}`);
        
        // Save OTP to admin
        admin.otp = otp;
        admin.otpExpiresAt = otpExpiresAt;
        
        try {
          await admin.save();
          console.log('OTP saved to admin record');
          
          // Skip email sending for testing if requested
          if (skipEmail) {
            console.log('Skipping email sending (testing mode)');
            return res.json({
              success: true,
              message: 'OTP generated (email skipped for testing)',
              otp: otp // Only included when skipEmail is true
            });
          }
          
          console.log(`Attempting to send OTP ${otp} to ${email}`);
          
          try {
            // Send email with OTP
            const emailSent = await sendOtpEmail(email, otp);
            
            if (emailSent) {
              console.log('OTP email sent successfully');
              res.json({
                success: true,
                message: 'OTP sent to your email'
              });
            } else {
              // Email sending failed but OTP was generated
              console.error(`Failed to send OTP email to ${email}`);
              
              // For production troubleshooting, return the OTP temporarily
              res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again or contact support.',
                // Temporarily include OTP for troubleshooting
                otp: otp
              });
            }
          } catch (emailError) {
            console.error('Email sending error:', emailError);
            res.status(500).json({
              success: false,
              message: 'Failed to send OTP email. Please check your email configuration.',
              error: emailError.message,
              // Temporarily include OTP for troubleshooting
              otp: otp
            });
          }
        } catch (saveError) {
          console.error('Error saving OTP to admin:', saveError);
          return res.status(500).json({
            success: false,
            message: 'Error saving OTP',
            error: saveError.message
          });
        }
      } catch (otpError) {
        console.error('Error generating OTP:', otpError);
        res.status(500).json({
          success: false,
          message: 'Error generating OTP',
          error: otpError.message
        });
      }
    } catch (findError) {
      console.error('Error finding admin:', findError);
      res.status(500).json({
        success: false,
        message: 'Database error',
        error: findError.message
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }
    
    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check if OTP matches and is not expired
    if (admin.otp !== otp || !admin.otpExpiresAt || new Date() > admin.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST: Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password'
      });
    }
    
    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check if OTP matches and is not expired
    if (admin.otp !== otp || !admin.otpExpiresAt || new Date() > admin.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    // Update password
    admin.password = newPassword;
    admin.otp = null;
    admin.otpExpiresAt = null;
    await admin.save();
    
    // Send confirmation email
    await sendPasswordResetConfirmationEmail(email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 
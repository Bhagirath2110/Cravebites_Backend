import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import colors from 'colors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import connectDB from './config/db.js';
import cloudinary from './config/cloudinary.js';
const cors = require('cors');


// Routes
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Use MongoDB Atlas if MONGODB_URI is provided, otherwise use local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cravebites';

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${colors.cyan(req.method)} ${colors.yellow(req.url)}`.bold);
  next();
});

// Connect to MongoDB
connectDB(MONGODB_URI);

// Image upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file',
      headers: req.headers
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size should be less than 5MB' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    console.log('Uploading to Cloudinary...');
    
    // Upload to Cloudinary with specific options
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'cravebites',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });

    console.log('Cloudinary upload successful:', {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    });

    res.json({ 
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Error uploading image:', {
      message: error.message,
      stack: error.stack,
      cloudinaryError: error.response?.body,
      errorName: error.name,
      errorCode: error.code
    });
    
    // Check for specific Cloudinary errors
    if (error.name === 'Error' && error.message.includes('Invalid cloud_name')) {
      return res.status(500).json({ 
        message: 'Image upload service is not configured properly',
        error: 'Invalid Cloudinary configuration'
      });
    }
    
    res.status(500).json({ 
      message: 'Error uploading image',
      error: error.message
    });
  }
});

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Serve static assets in production
if (NODE_ENV === 'production') {
  // Set static folder
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '../CraveBites/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../CraveBites/dist/index.html'));
  });
} else {
  // Base route
  app.get('/', (req, res) => {
    res.json({ message: 'CraveBites API is running' });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(colors.red.bold('❌ Server Error:'), err.message);
  
  // Check for Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({ message: 'Validation Error', errors });
  }
  
  // Check for Mongoose cast error (invalid ID)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Server Error', 
    error: NODE_ENV === 'production' ? 'Something went wrong' : err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(colors.rainbow('=================================================='));
  console.log(colors.green.bold(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`));
  console.log(colors.cyan.bold(`🌐 API URL: http://localhost:${PORT}/api`));
  console.log(colors.rainbow('=================================================='));

}); 
import express from 'express';
import Category from '../models/Category.js';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create a new category
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, featured } = req.body;

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    // Upload image to Cloudinary or use default image
    let imageUrl = 'https://res.cloudinary.com/dhlfg6dpw/image/upload/v1709720000/cravebites/default-category.png';
    
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'cravebites/categories',
        resource_type: 'auto'
      });
      imageUrl = result.secure_url;
    }

    const category = new Category({
      name: name.trim(),
      description: description?.trim() || '',
      featured: featured || false,
      image: imageUrl
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

// Update a category
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, featured } = req.body;

    // Check if category with same name exists (excluding current category)
    const existingCategory = await Category.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id }
    });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    // Handle image upload if new image is provided
    let imageUrl = req.body.image; // Keep existing image if no new image is uploaded
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'cravebites/categories',
        resource_type: 'auto'
      });
      imageUrl = result.secure_url;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description?.trim() || '',
        featured: featured || false,
        image: imageUrl || 'https://res.cloudinary.com/dhlfg6dpw/image/upload/v1709720000/cravebites/default-category.png'
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

export default router; 
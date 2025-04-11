import Product from '../models/Product.js';
import Category from '../models/Category.js';

// Get all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.categoryId })
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Error fetching products by category', error: error.message });
  }
};

// Get single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      image, 
      category, 
      isVeg,
      isHotDeal,
      isCravebitesFavorite,
      isAddon
    } = req.body;

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Check if product with same name exists
    const existingProduct = await Product.findOne({ name: name.trim() });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image,
      category,
      isVeg: isVeg ?? false,
      isHotDeal: isHotDeal ?? false,
      isCravebitesFavorite: isCravebitesFavorite ?? false,
      isAddon: isAddon ?? false
    });

    const savedProduct = await product.save();
    await savedProduct.populate('category', 'name');
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      image, 
      category, 
      isVeg,
      isHotDeal,
      isCravebitesFavorite,
      isAddon
    } = req.body;

    // Validate category exists if provided
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    }

    // Check if product with same name exists (excluding current product)
    const existingProduct = await Product.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id }
    });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        image,
        category,
        isVeg: isVeg ?? false,
        isHotDeal: isHotDeal ?? false,
        isCravebitesFavorite: isCravebitesFavorite ?? false,
        isAddon: isAddon ?? false
      },
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
}; 
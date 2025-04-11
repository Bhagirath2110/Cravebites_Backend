import express from 'express';
import {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';

const router = express.Router();

// Get all products
router.get('/', getAllProducts);

// Get products by category
router.get('/category/:categoryId', getProductsByCategory);

// Get single product
router.get('/:id', getProductById);

// Create new product
router.post('/', createProduct);

// Update product
router.put('/:id', updateProduct);

// Delete product
router.delete('/:id', deleteProduct);

export default router; 
/**
 * Products Routes
 * API endpoints for product information with search, filter, and categories
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products/search - Search products
router.get('/search', productController.searchProducts);

// GET /api/products/categories - Get all categories
router.get('/categories', productController.getCategories);

// GET /api/products - List all products (with optional filters)
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Get single product
router.get('/:id', productController.getProductById);

module.exports = router;

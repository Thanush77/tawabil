/**
 * Products Routes
 * API endpoints for product information
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - List all products
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Get single product
router.get('/:id', productController.getProductById);

module.exports = router;

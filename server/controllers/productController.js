/**
 * Product Controller
 * Handles product-related API requests
 * Using Prisma for database operations
 */

const { prisma } = require('../config/prisma');
const fs = require('fs');
const path = require('path');

// Load products from JSON file (fallback when DB not available)
const loadProductsFromFile = () => {
    try {
        const filePath = path.join(__dirname, '../../data/products.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data).products;
    } catch (error) {
        console.error('Error loading products from file:', error);
        return [];
    }
};

/**
 * Get all products
 * GET /api/products
 */
exports.getAllProducts = async (req, res) => {
    try {
        // Try to get from database first
        let products = await prisma.product.findMany({
            where: { isAvailable: true }
        });

        // If no products in DB, load from JSON file
        if (!products || products.length === 0) {
            const fileProducts = loadProductsFromFile();
            products = fileProducts.map(p => ({
                productId: p.id,
                name: p.name,
                nameHindi: p.nameHindi,
                origin: p.origin,
                badge: p.badge,
                description: p.description,
                prices: p.prices,
                packSizes: p.packSizes,
                culinaryUses: p.culinaryUses,
                healthBenefits: p.healthBenefits,
                image: p.image
            }));
        } else {
            // Transform Prisma products to match expected format
            products = products.map(p => ({
                productId: p.productId,
                name: p.name,
                origin: p.origin,
                description: p.description,
                benefits: p.benefits,
                image: p.image,
                variants: p.variants
            }));
        }

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error('Error getting products:', error);
        // Fallback to file-based products
        const fileProducts = loadProductsFromFile();

        res.status(200).json({
            success: true,
            count: fileProducts.length,
            data: fileProducts.map(p => ({
                productId: p.id,
                name: p.name,
                nameHindi: p.nameHindi,
                origin: p.origin,
                badge: p.badge,
                description: p.description,
                prices: p.prices,
                packSizes: p.packSizes,
                culinaryUses: p.culinaryUses,
                healthBenefits: p.healthBenefits,
                image: p.image
            }))
        });
    }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try database first
        let product = await prisma.product.findFirst({
            where: {
                productId: id,
                isAvailable: true
            }
        });

        // Fallback to file
        if (!product) {
            const fileProducts = loadProductsFromFile();
            const fileProduct = fileProducts.find(p => p.id === id);

            if (!fileProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            product = {
                productId: fileProduct.id,
                name: fileProduct.name,
                nameHindi: fileProduct.nameHindi,
                origin: fileProduct.origin,
                badge: fileProduct.badge,
                description: fileProduct.description,
                prices: fileProduct.prices,
                packSizes: fileProduct.packSizes,
                culinaryUses: fileProduct.culinaryUses,
                healthBenefits: fileProduct.healthBenefits,
                storageTips: fileProduct.storageTips,
                purityIndicators: fileProduct.purityIndicators,
                image: fileProduct.image
            };
        }

        res.status(200).json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving product'
        });
    }
};

/**
 * Get product price
 * Utility function used by other controllers
 */
exports.getProductPrice = (productId, packSize) => {
    const fileProducts = loadProductsFromFile();
    const product = fileProducts.find(p => p.id === productId);

    if (!product || !product.prices[packSize]) {
        return null;
    }

    return product.prices[packSize];
};

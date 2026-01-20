/**
 * Product Controller
 * Handles product-related API requests
 * Using Prisma for database operations with enhanced search, filter, and sort
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

// Transform file products to consistent format
const transformFileProduct = (p) => ({
    productId: p.id,
    name: p.name,
    nameHindi: p.nameHindi,
    origin: p.origin,
    badge: p.badge,
    category: getCategoryFromProduct(p),
    description: p.description,
    prices: p.prices,
    packSizes: p.packSizes,
    culinaryUses: p.culinaryUses,
    healthBenefits: p.healthBenefits,
    storageTips: p.storageTips,
    purityIndicators: p.purityIndicators,
    image: p.image,
    inStock: true,
    rating: 4.5 + Math.random() * 0.5, // Simulated rating between 4.5-5.0
    reviewCount: Math.floor(50 + Math.random() * 100)
});

// Determine category based on product type
const getCategoryFromProduct = (product) => {
    const name = product.name.toLowerCase();
    if (name.includes('cardamom') || name.includes('pepper') || name.includes('cloves') ||
        name.includes('cinnamon') || name.includes('cumin') || name.includes('elaichi')) {
        return 'whole-spices';
    }
    if (name.includes('powder') || name.includes('ground')) {
        return 'ground-spices';
    }
    return 'whole-spices'; // Default
};

/**
 * Get all products with optional filters
 * GET /api/products
 * Query params: category, sort, search, limit
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { category, sort, search, limit } = req.query;

        // Try to get from database first
        let products = [];
        try {
            products = await prisma.product.findMany({
                where: { isAvailable: true }
            });
        } catch (dbError) {
            // Database not available, use file fallback
        }

        // If no products in DB, load from JSON file
        if (!products || products.length === 0) {
            const fileProducts = loadProductsFromFile();
            products = fileProducts.map(transformFileProduct);
        } else {
            // Transform Prisma products
            products = products.map(p => ({
                productId: p.productId,
                name: p.name,
                origin: p.origin,
                description: p.description,
                category: p.category,
                benefits: p.benefits,
                image: p.image,
                variants: p.variants,
                inStock: p.isAvailable,
                rating: 4.5,
                reviewCount: 50
            }));
        }

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.nameHindi && p.nameHindi.includes(search)) ||
                (p.description && p.description.toLowerCase().includes(searchLower)) ||
                (p.origin && p.origin.toLowerCase().includes(searchLower))
            );
        }

        // Apply category filter
        if (category && category !== 'all') {
            products = products.filter(p => p.category === category);
        }

        // Apply sorting
        if (sort) {
            switch (sort) {
                case 'price-asc':
                    products.sort((a, b) => {
                        const priceA = a.prices ? Math.min(...Object.values(a.prices)) : 0;
                        const priceB = b.prices ? Math.min(...Object.values(b.prices)) : 0;
                        return priceA - priceB;
                    });
                    break;
                case 'price-desc':
                    products.sort((a, b) => {
                        const priceA = a.prices ? Math.min(...Object.values(a.prices)) : 0;
                        const priceB = b.prices ? Math.min(...Object.values(b.prices)) : 0;
                        return priceB - priceA;
                    });
                    break;
                case 'name-asc':
                    products.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name-desc':
                    products.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'rating':
                    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                default:
                    break;
            }
        }

        // Apply limit
        if (limit && !isNaN(limit)) {
            products = products.slice(0, parseInt(limit));
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
            data: fileProducts.map(transformFileProduct)
        });
    }
};

/**
 * Search products
 * GET /api/products/search
 * Query params: q (search query), limit
 */
exports.searchProducts = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const searchLower = q.toLowerCase().trim();
        const fileProducts = loadProductsFromFile();

        let results = fileProducts
            .map(transformFileProduct)
            .filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.nameHindi && p.nameHindi.includes(q)) ||
                (p.description && p.description.toLowerCase().includes(searchLower)) ||
                (p.origin && p.origin.toLowerCase().includes(searchLower)) ||
                (p.culinaryUses && p.culinaryUses.some(u => u.toLowerCase().includes(searchLower)))
            )
            .slice(0, parseInt(limit));

        res.status(200).json({
            success: true,
            query: q,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching products'
        });
    }
};

/**
 * Get product categories
 * GET /api/products/categories
 */
exports.getCategories = async (req, res) => {
    try {
        const categories = [
            {
                id: 'all',
                name: 'All Products',
                icon: '🌿',
                count: 7
            },
            {
                id: 'whole-spices',
                name: 'Whole Spices',
                icon: '🫚',
                count: 7
            },
            {
                id: 'ground-spices',
                name: 'Ground Spices',
                icon: '🧂',
                count: 0
            },
            {
                id: 'dry-fruits',
                name: 'Dry Fruits',
                icon: '🥜',
                count: 0
            },
            {
                id: 'gift-packs',
                name: 'Gift Packs',
                icon: '🎁',
                count: 0
            }
        ];

        res.status(200).json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting categories'
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
        let product = null;
        try {
            product = await prisma.product.findFirst({
                where: {
                    productId: id,
                    isAvailable: true
                }
            });
        } catch (dbError) {
            // Database not available
        }

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

            product = transformFileProduct(fileProduct);
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

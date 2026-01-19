/**
 * Product Model
 * Stores product information with prices and stock
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameHindi: {
        type: String,
        trim: true
    },
    description: {
        type: String
    },
    origin: {
        type: String
    },
    badge: {
        type: String,
        enum: ['Premium', 'Organic', 'Ceylon', 'Freshest', 'Best Seller']
    },
    prices: {
        type: Map,
        of: Number,
        required: true
    },
    stock: {
        type: Map,
        of: Number,
        default: new Map()
    },
    packSizes: [{
        type: String
    }],
    culinaryUses: [{
        type: String
    }],
    healthBenefits: [{
        type: String
    }],
    image: {
        type: String
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster queries
productSchema.index({ active: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Method to check if pack size is available
productSchema.methods.isPackSizeAvailable = function(packSize) {
    return this.prices.has(packSize) && this.active;
};

// Method to get price for pack size
productSchema.methods.getPrice = function(packSize) {
    return this.prices.get(packSize);
};

// Method to check stock
productSchema.methods.hasStock = function(packSize, quantity) {
    const stock = this.stock.get(packSize);
    // If stock is not tracked, assume available
    if (stock === undefined) return true;
    return stock >= quantity;
};

// Static method to find active products
productSchema.statics.findActive = function() {
    return this.find({ active: true });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

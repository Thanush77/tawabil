/**
 * Customer Model
 * Stores customer information and order history
 */

const mongoose = require('mongoose');

// Saved Address Schema
const savedAddressSchema = new mongoose.Schema({
    label: {
        type: String,
        default: 'Home'
    },
    houseNo: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    },
    area: {
        type: String,
        required: true
    },
    landmark: String,
    pincode: {
        type: String,
        required: true
    },
    city: {
        type: String,
        default: 'Bengaluru'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Customer Schema
const customerSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10}$/,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    addresses: [savedAddressSchema],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    lastOrderDate: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    notes: String
}, {
    timestamps: true
});

// Index for search
customerSchema.index({ name: 'text', email: 'text' });

// Method to add address
customerSchema.methods.addAddress = function(address) {
    // If this is the first address, make it default
    if (this.addresses.length === 0) {
        address.isDefault = true;
    }

    // If new address is default, remove default from others
    if (address.isDefault) {
        this.addresses.forEach(addr => {
            addr.isDefault = false;
        });
    }

    this.addresses.push(address);
    return this.save();
};

// Method to get default address
customerSchema.methods.getDefaultAddress = function() {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Method to update order stats
customerSchema.methods.recordOrder = function(orderId, orderTotal) {
    this.orders.push(orderId);
    this.totalOrders += 1;
    this.totalSpent += orderTotal;
    this.lastOrderDate = new Date();
    return this.save();
};

// Static method to find or create customer
customerSchema.statics.findOrCreate = async function(phone, name, email = null) {
    let customer = await this.findOne({ phone });

    if (!customer) {
        customer = new this({
            phone,
            name,
            email
        });
        await customer.save();
    } else {
        // Update name and email if provided
        if (name && name !== customer.name) {
            customer.name = name;
        }
        if (email && email !== customer.email) {
            customer.email = email;
        }
        await customer.save();
    }

    return customer;
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;

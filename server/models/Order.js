/**
 * Order Model
 * Stores order information including items, customer details, and payment status
 */

const mongoose = require('mongoose');

// Order Item Schema (embedded)
const orderItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    packSize: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true
    }
}, { _id: false });

// Address Schema (embedded)
const addressSchema = new mongoose.Schema({
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
        required: true,
        match: /^560[0-9]{3}$/
    },
    city: {
        type: String,
        default: 'Bengaluru'
    },
    notes: String
}, { _id: false });

// Delivery Slot Schema (embedded)
const deliverySlotSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    displayDate: String,
    day: String,
    time: {
        type: String,
        default: '10 AM - 6 PM'
    }
}, { _id: false });

// Main Order Schema
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customer: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            match: /^[0-9]{10}$/
        },
        email: {
            type: String,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
    },
    address: {
        type: addressSchema,
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: [arr => arr.length > 0, 'Order must have at least one item']
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryCharge: {
        type: Number,
        required: true,
        default: 40,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['online', 'cod']
    },
    paymentStatus: {
        type: String,
        default: 'pending',
        enum: ['pending', 'paid', 'failed', 'refunded']
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled']
    },
    deliverySlot: deliverySlotSchema,
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String
    }],
    notes: String
}, {
    timestamps: true
});

// Indexes
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
    // Calculate item totals
    this.items.forEach(item => {
        item.total = item.price * item.quantity;
    });

    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);

    // Calculate total
    this.total = this.subtotal + this.deliveryCharge;

    // Add to status history if status changed
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }

    next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, note = '') {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note
    });
    return this.save();
};

// Method to mark as paid
orderSchema.methods.markAsPaid = function(paymentId, signature) {
    this.paymentStatus = 'paid';
    this.razorpayPaymentId = paymentId;
    this.razorpaySignature = signature;
    this.status = 'confirmed';
    return this.save();
};

// Static method to generate order ID
orderSchema.statics.generateOrderId = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TW-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Static method to find orders by phone
orderSchema.statics.findByPhone = function(phone) {
    return this.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

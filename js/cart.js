/* ========================================
   TAWABIL SPICES – CART MANAGEMENT SYSTEM
======================================== */

// ----------------------------------------
// CONFIGURATION
// ----------------------------------------
const CART_STORAGE_KEY = 'tawabil_cart';
const SAVED_ITEMS_KEY = 'tawabil_saved';
const API_BASE_URL = 'http://localhost:5000/api';
const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_ABOVE = 500;
const MIN_ORDER_AMOUNT = 200;

// ----------------------------------------
// CART MANAGER CLASS
// ----------------------------------------
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.savedItems = this.loadSavedItems();
        this.products = [];
        this.listeners = [];
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.updateCartBadge();
        this.renderMiniCart();
    }

    // Load products (try backend first, then fallback to static JSON)
    async loadProducts() {
        try {
            // Try backend API first
            const response = await fetch(`${API_BASE_URL}/products`, {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                this.products = data.products || data;
                this.isBackendAvailable = true;
                return this.products;
            }
            throw new Error('Backend unavailable');
        } catch (error) {
            // Fallback to static JSON file
            try {
                const response = await fetch('data/products.json');
                const data = await response.json();
                this.products = data.products;
                this.isBackendAvailable = false;
                return this.products;
            } catch (jsonError) {
                console.error('Error loading products:', jsonError);
                this.isBackendAvailable = false;
                return [];
            }
        }
    }

    // Get product by ID
    getProduct(productId) {
        return this.products.find(p => p.id === productId);
    }

    // Load cart from localStorage
    loadCart() {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    // Load saved items from localStorage
    loadSavedItems() {
        try {
            const stored = localStorage.getItem(SAVED_ITEMS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading saved items:', error);
            return [];
        }
    }

    // Save saved items to localStorage
    saveSavedItems() {
        try {
            localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(this.savedItems));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving saved items:', error);
        }
    }

    // Generate unique item ID
    generateItemId(productId, packSize) {
        return `${productId}_${packSize}`;
    }

    // Add item to cart
    addItem(productId, packSize, quantity = 1) {
        const product = this.getProduct(productId);
        if (!product) {
            console.error('Product not found:', productId);
            return false;
        }

        const price = product.prices[packSize];
        if (!price) {
            console.error('Price not found for pack size:', packSize);
            return false;
        }

        const itemId = this.generateItemId(productId, packSize);
        const existingItem = this.cart.find(item => item.id === itemId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: itemId,
                productId: productId,
                name: product.name,
                packSize: packSize,
                price: price,
                quantity: quantity,
                image: product.image
            });
        }

        this.saveCart();
        this.updateCartBadge();
        this.renderMiniCart();
        this.showNotification(`${product.name} (${packSize}) added to cart!`);
        return true;
    }

    // Update item quantity
    updateQuantity(itemId, quantity) {
        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(itemId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartBadge();
                this.renderMiniCart();
            }
            return true;
        }
        return false;
    }

    // Increment item quantity
    incrementQuantity(itemId) {
        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity += 1;
            this.saveCart();
            this.updateCartBadge();
            this.renderMiniCart();
            return true;
        }
        return false;
    }

    // Decrement item quantity
    decrementQuantity(itemId) {
        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            if (item.quantity <= 1) {
                this.removeItem(itemId);
            } else {
                item.quantity -= 1;
                this.saveCart();
                this.updateCartBadge();
                this.renderMiniCart();
            }
            return true;
        }
        return false;
    }

    // Remove item from cart
    removeItem(itemId) {
        const index = this.cart.findIndex(item => item.id === itemId);
        if (index !== -1) {
            const removed = this.cart.splice(index, 1)[0];
            this.saveCart();
            this.updateCartBadge();
            this.renderMiniCart();
            this.showNotification(`${removed.name} removed from cart`);
            return true;
        }
        return false;
    }

    // Save item for later
    saveForLater(itemId) {
        const index = this.cart.findIndex(item => item.id === itemId);
        if (index !== -1) {
            const item = this.cart.splice(index, 1)[0];
            this.savedItems.push(item);
            this.saveCart();
            this.saveSavedItems();
            this.updateCartBadge();
            this.renderMiniCart();
            this.showNotification(`${item.name} saved for later`);
            return true;
        }
        return false;
    }

    // Move item from saved to cart
    moveToCart(itemId) {
        const index = this.savedItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
            const item = this.savedItems.splice(index, 1)[0];

            // Check if item already exists in cart
            const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                this.cart.push(item);
            }

            this.saveCart();
            this.saveSavedItems();
            this.updateCartBadge();
            this.renderMiniCart();
            this.showNotification(`${item.name} moved to cart`);
            return true;
        }
        return false;
    }

    // Remove saved item
    removeSavedItem(itemId) {
        const index = this.savedItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.savedItems.splice(index, 1);
            this.saveSavedItems();
            return true;
        }
        return false;
    }

    // Get cart items
    getItems() {
        return this.cart;
    }

    // Get saved items
    getSavedItems() {
        return this.savedItems;
    }

    // Get item count
    getItemCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Get subtotal
    getSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get delivery charge
    getDeliveryCharge() {
        const subtotal = this.getSubtotal();
        if (subtotal >= FREE_DELIVERY_ABOVE) {
            return 0;
        }
        return subtotal > 0 ? DELIVERY_CHARGE : 0;
    }

    // Get total
    getTotal() {
        return this.getSubtotal() + this.getDeliveryCharge();
    }

    // Get cart summary
    getCartSummary() {
        const subtotal = this.getSubtotal();
        const deliveryCharge = this.getDeliveryCharge();
        const total = subtotal + deliveryCharge;
        const itemCount = this.getItemCount();
        const freeDeliveryRemaining = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);

        return {
            items: this.cart,
            itemCount,
            subtotal,
            deliveryCharge,
            total,
            freeDeliveryRemaining,
            isFreeDelivery: deliveryCharge === 0 && subtotal > 0,
            meetsMinOrder: subtotal >= MIN_ORDER_AMOUNT
        };
    }

    // Clear cart
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartBadge();
        this.renderMiniCart();
    }

    // Update cart badge
    updateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = this.getItemCount();

        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    // Render mini cart
    renderMiniCart() {
        const miniCartContainer = document.querySelector('.mini-cart-items');
        const miniCartEmpty = document.querySelector('.mini-cart-empty');
        const miniCartContent = document.querySelector('.mini-cart-content');
        const miniCartTotal = document.querySelector('.mini-cart-total-amount');

        if (!miniCartContainer) return;

        if (this.cart.length === 0) {
            if (miniCartEmpty) miniCartEmpty.style.display = 'block';
            if (miniCartContent) miniCartContent.style.display = 'none';
            return;
        }

        if (miniCartEmpty) miniCartEmpty.style.display = 'none';
        if (miniCartContent) miniCartContent.style.display = 'block';

        miniCartContainer.innerHTML = this.cart.slice(0, 3).map(item => `
            <div class="mini-cart-item" data-item-id="${item.id}">
                <div class="mini-cart-item-info">
                    <span class="mini-cart-item-name">${item.name}</span>
                    <span class="mini-cart-item-details">${item.packSize} x ${item.quantity}</span>
                </div>
                <span class="mini-cart-item-price">${formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');

        if (this.cart.length > 3) {
            miniCartContainer.innerHTML += `
                <div class="mini-cart-more">+${this.cart.length - 3} more items</div>
            `;
        }

        if (miniCartTotal) {
            miniCartTotal.textContent = formatCurrency(this.getTotal());
        }
    }

    // Show notification
    showNotification(message, type = 'success') {
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `cart-notification cart-notification-${type}`;
        notification.innerHTML = `
            <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success'
                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
            </svg>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add listener for cart changes
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    // Notify all listeners
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.getCartSummary()));
    }

    // Validate cart with server
    async validateCart() {
        try {
            const response = await fetch(`${API_BASE_URL}/cart/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: this.cart })
            });

            if (!response.ok) {
                throw new Error('Validation failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error validating cart:', error);
            // Return local calculation if server is unavailable
            return {
                valid: true,
                items: this.cart,
                summary: this.getCartSummary()
            };
        }
    }

    // Sync cart with server (for logged-in users in future)
    async syncWithServer() {
        try {
            const response = await fetch(`${API_BASE_URL}/cart/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: this.cart,
                    savedItems: this.savedItems
                })
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error syncing cart:', error);
            return null;
        }
    }

    // Create order on backend
    async createOrder(customerData, deliverySlot) {
        const cartSummary = this.getCartSummary();

        if (!cartSummary.meetsMinOrder) {
            throw new Error(`Minimum order amount is ${formatCurrency(MIN_ORDER_AMOUNT)}`);
        }

        const orderData = {
            customer: customerData,
            items: this.cart.map(item => ({
                productId: item.productId,
                name: item.name,
                packSize: item.packSize,
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: cartSummary.subtotal,
            deliveryCharge: cartSummary.deliveryCharge,
            total: cartSummary.total,
            deliverySlot: deliverySlot
        };

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create order');
            }

            const order = await response.json();
            return order;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    // Create Razorpay payment order
    async createPaymentOrder(orderId, amount) {
        try {
            const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderId,
                    amount: amount
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create payment order');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating payment order:', error);
            throw error;
        }
    }

    // Verify payment with backend
    async verifyPayment(paymentData) {
        try {
            const response = await fetch(`${API_BASE_URL}/payments/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                throw new Error('Payment verification failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw error;
        }
    }

    // Check if backend is available
    isServerAvailable() {
        return this.isBackendAvailable;
    }

    // Get order by ID
    async getOrder(orderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
            if (!response.ok) {
                throw new Error('Order not found');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching order:', error);
            return null;
        }
    }
}

// ----------------------------------------
// UTILITY FUNCTIONS
// ----------------------------------------

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Initialize global cart instance
let cart;

document.addEventListener('DOMContentLoaded', () => {
    cart = new CartManager();
    window.cart = cart; // Make available globally

    // Setup mini cart toggle
    setupMiniCart();

    // Setup add to cart buttons
    setupAddToCartButtons();
});

// Setup mini cart functionality
function setupMiniCart() {
    const cartIcon = document.querySelector('.cart-icon');
    const miniCart = document.querySelector('.mini-cart');

    if (!cartIcon || !miniCart) return;

    let isHovering = false;
    let hideTimeout;

    cartIcon.addEventListener('mouseenter', () => {
        isHovering = true;
        clearTimeout(hideTimeout);
        miniCart.classList.add('show');
    });

    cartIcon.addEventListener('mouseleave', () => {
        isHovering = false;
        hideTimeout = setTimeout(() => {
            if (!isHovering) {
                miniCart.classList.remove('show');
            }
        }, 300);
    });

    miniCart.addEventListener('mouseenter', () => {
        isHovering = true;
        clearTimeout(hideTimeout);
    });

    miniCart.addEventListener('mouseleave', () => {
        isHovering = false;
        hideTimeout = setTimeout(() => {
            miniCart.classList.remove('show');
        }, 300);
    });
}

// Setup add to cart buttons
function setupAddToCartButtons() {
    document.addEventListener('click', (e) => {
        const addToCartBtn = e.target.closest('.btn-add-to-cart');
        if (addToCartBtn) {
            e.preventDefault();

            const productId = addToCartBtn.dataset.productId;
            const productCard = addToCartBtn.closest('.product-card, .product-detail-card');

            if (productCard) {
                const selectedSize = productCard.querySelector('.size-option.selected');
                if (selectedSize) {
                    // Extract just the pack size (e.g., "50g" from "50g - ₹280")
                    const packSize = extractPackSize(selectedSize.textContent.trim());
                    cart.addItem(productId, packSize);
                } else {
                    // Default to first available size
                    const firstSize = productCard.querySelector('.size-option');
                    if (firstSize) {
                        const packSize = extractPackSize(firstSize.textContent.trim());
                        cart.addItem(productId, packSize);
                    }
                }
            }
        }
    });
}

// Extract pack size from text (e.g., "50g - ₹280" -> "50g")
function extractPackSize(text) {
    // Match patterns like "50g", "100g", "1kg", etc.
    const match = text.match(/^(\d+(?:g|kg))/i);
    return match ? match[1] : text.split(' ')[0];
}

// Update price display when pack size changes
function updatePriceDisplay(productCard, product) {
    const selectedSize = productCard.querySelector('.size-option.selected');
    const priceDisplay = productCard.querySelector('.product-price');

    if (selectedSize && priceDisplay && product) {
        const packSize = selectedSize.textContent.trim();
        const price = product.prices[packSize];
        if (price) {
            priceDisplay.textContent = formatCurrency(price);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CartManager, formatCurrency };
}

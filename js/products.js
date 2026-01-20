/**
 * Products Page - Dynamic Product Loading and Interactions
 * Handles search, filter, sort, view toggle, and quick view modal
 */

(function () {
    'use strict';

    // State management
    const state = {
        products: [],
        filteredProducts: [],
        currentCategory: 'all',
        currentSort: '',
        searchQuery: '',
        viewMode: 'list',
        selectedProduct: null,
        selectedSize: null
    };

    // DOM Elements
    const elements = {
        container: document.getElementById('productsContainer'),
        searchInput: document.getElementById('productSearch'),
        clearSearch: document.getElementById('clearSearch'),
        sortSelect: document.getElementById('productSort'),
        categoryFilters: document.getElementById('categoryFilters'),
        resultsCount: document.getElementById('resultsCount'),
        noResults: document.getElementById('noResults'),
        viewButtons: document.querySelectorAll('.view-btn'),
        modal: document.getElementById('quickViewModal')
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        await loadProducts();
        setupEventListeners();
        handleHashNavigation();
    }

    // Load products from API
    async function loadProducts() {
        try {
            showLoading();

            // Try API first, fallback to local data
            let data;
            try {
                const response = await fetch('/api/products');
                if (response.ok) {
                    data = await response.json();
                }
            } catch (e) {
                // API not available, load from local JSON
            }

            if (!data || !data.success) {
                // Load from local products.json
                const localResponse = await fetch('data/products.json');
                const localData = await localResponse.json();
                data = {
                    success: true,
                    data: localData.products.map(p => ({
                        productId: p.id,
                        name: p.name,
                        nameHindi: p.nameHindi,
                        origin: p.origin,
                        badge: p.badge,
                        category: 'whole-spices',
                        description: p.description,
                        prices: p.prices,
                        packSizes: p.packSizes,
                        culinaryUses: p.culinaryUses,
                        healthBenefits: p.healthBenefits,
                        storageTips: p.storageTips,
                        purityIndicators: p.purityIndicators,
                        image: p.image,
                        inStock: true,
                        rating: 4.5 + Math.random() * 0.5,
                        reviewCount: Math.floor(50 + Math.random() * 100)
                    }))
                };
            }

            state.products = data.data;
            state.filteredProducts = [...state.products];
            renderProducts();

        } catch (error) {
            console.error('Error loading products:', error);
            showError();
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Search input with debounce
        let searchTimeout;
        elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchQuery = e.target.value.trim();
                elements.clearSearch.style.display = state.searchQuery ? 'block' : 'none';
                filterAndRender();
            }, 300);
        });

        // Clear search
        elements.clearSearch.addEventListener('click', () => {
            elements.searchInput.value = '';
            state.searchQuery = '';
            elements.clearSearch.style.display = 'none';
            filterAndRender();
        });

        // Sort select
        elements.sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value;
            filterAndRender();
        });

        // Category filters
        elements.categoryFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentCategory = btn.dataset.category;
                filterAndRender();
            }
        });

        // View toggle
        elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.viewMode = btn.dataset.view;
                elements.container.className = state.viewMode === 'grid' ? 'products-grid-view' : 'products-list-view';
            });
        });

        // Modal close on overlay click
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                closeQuickView();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeQuickView();
        });
    }

    // Filter and sort products
    function filterAndRender() {
        let filtered = [...state.products];

        // Apply search
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.nameHindi && p.nameHindi.includes(state.searchQuery)) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                (p.origin && p.origin.toLowerCase().includes(query)) ||
                (p.culinaryUses && p.culinaryUses.some(u => u.toLowerCase().includes(query)))
            );
        }

        // Apply category filter
        if (state.currentCategory && state.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category === state.currentCategory);
        }

        // Apply sorting
        if (state.currentSort) {
            switch (state.currentSort) {
                case 'price-asc':
                    filtered.sort((a, b) => getMinPrice(a) - getMinPrice(b));
                    break;
                case 'price-desc':
                    filtered.sort((a, b) => getMinPrice(b) - getMinPrice(a));
                    break;
                case 'name-asc':
                    filtered.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name-desc':
                    filtered.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'rating':
                    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
            }
        }

        state.filteredProducts = filtered;
        renderProducts();
    }

    // Get minimum price from product
    function getMinPrice(product) {
        if (!product.prices) return 0;
        return Math.min(...Object.values(product.prices));
    }

    // Render products
    function renderProducts() {
        const products = state.filteredProducts;

        if (products.length === 0) {
            elements.container.innerHTML = '';
            elements.noResults.style.display = 'block';
            elements.resultsCount.textContent = 'No products found';
            return;
        }

        elements.noResults.style.display = 'none';
        elements.resultsCount.textContent = `Showing ${products.length} product${products.length > 1 ? 's' : ''}`;

        const html = products.map(product => createProductCard(product)).join('');
        elements.container.innerHTML = html;

        // Add event listeners to new cards
        setupCardListeners();
    }

    // Create product card HTML
    function createProductCard(product) {
        const minPrice = getMinPrice(product);
        const rating = product.rating ? product.rating.toFixed(1) : '4.5';
        const reviewCount = product.reviewCount || 50;
        const badgeClass = getBadgeClass(product.badge);

        return `
            <div class="product-card-enhanced" data-product-id="${product.productId}" id="${product.productId}">
                <div class="product-card-image" onclick="openQuickView('${product.productId}')">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
                    <div class="product-overlay">
                        <button class="quick-view-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Quick View
                        </button>
                    </div>
                    ${product.inStock !== false ? '<span class="stock-badge in-stock">In Stock</span>' : '<span class="stock-badge out-stock">Out of Stock</span>'}
                </div>
                <div class="product-card-body">
                    <div class="product-card-header">
                        <h3 class="product-title">${product.name}</h3>
                        ${product.nameHindi ? `<span class="product-hindi">${product.nameHindi}</span>` : ''}
                    </div>
                    <div class="product-origin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${product.origin}
                    </div>
                    <div class="product-rating">
                        <span class="stars">${getStarsHTML(rating)}</span>
                        <span class="rating-text">${rating}</span>
                        <span class="review-count">(${reviewCount} reviews)</span>
                    </div>
                    <p class="product-description">${truncateText(product.description, 100)}</p>
                    <div class="product-price-range">
                        <span class="price-label">Starting from</span>
                        <span class="price-value">₹${minPrice}</span>
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-primary btn-add-cart" data-product-id="${product.productId}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                            </svg>
                            Add to Cart
                        </button>
                        <button class="btn btn-icon btn-whatsapp-sm" onclick="orderViaWhatsApp('${product.name}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Get badge class based on type
    function getBadgeClass(badge) {
        const badgeMap = {
            'Premium': 'badge-premium',
            'Organic': 'badge-organic',
            'Ceylon': 'badge-ceylon',
            'Freshest': 'badge-fresh',
            'Best Seller': 'badge-bestseller',
            'Special': 'badge-special',
            'Strong': 'badge-strong'
        };
        return badgeMap[badge] || 'badge-primary';
    }

    // Generate star rating HTML
    function getStarsHTML(rating) {
        const full = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        let html = '';
        for (let i = 0; i < full; i++) html += '★';
        if (hasHalf) html += '½';
        for (let i = full + (hasHalf ? 1 : 0); i < 5; i++) html += '☆';
        return html;
    }

    // Truncate text
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    // Setup card event listeners
    function setupCardListeners() {
        // Add to cart buttons
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                openQuickView(productId);
            });
        });

        // Quick view on image click
        document.querySelectorAll('.product-card-image').forEach(img => {
            img.addEventListener('click', () => {
                const productId = img.closest('.product-card-enhanced').dataset.productId;
                openQuickView(productId);
            });
        });
    }

    // Open quick view modal
    window.openQuickView = function (productId) {
        const product = state.products.find(p => p.productId === productId);
        if (!product) return;

        state.selectedProduct = product;
        state.selectedSize = product.packSizes ? product.packSizes[1] || product.packSizes[0] : null;

        // Populate modal
        document.getElementById('modalImage').src = product.image;
        document.getElementById('modalImage').alt = product.name;
        document.getElementById('modalBadge').textContent = product.badge || '';
        document.getElementById('modalBadge').style.display = product.badge ? 'block' : 'none';
        document.getElementById('modalTitle').textContent = product.name;
        document.getElementById('modalOrigin').textContent = product.origin;
        document.getElementById('modalStars').innerHTML = getStarsHTML(product.rating || 4.5);
        document.getElementById('modalReviews').textContent = `${product.rating?.toFixed(1) || '4.5'} (${product.reviewCount || 50} reviews)`;
        document.getElementById('modalDescription').textContent = product.description;

        // Culinary uses
        const usesEl = document.getElementById('modalUses');
        usesEl.innerHTML = (product.culinaryUses || []).map(use => `<li>${use}</li>`).join('');

        // Health benefits
        const benefitsEl = document.getElementById('modalBenefits');
        benefitsEl.innerHTML = (product.healthBenefits || []).map(b => `<li>${b}</li>`).join('');

        // Pack sizes
        const sizesEl = document.getElementById('modalSizes');
        if (product.packSizes && product.prices) {
            sizesEl.innerHTML = product.packSizes.map((size, i) => `
                <div class="size-option ${i === 1 || (i === 0 && product.packSizes.length === 1) ? 'selected' : ''}" 
                     data-size="${size}" data-price="${product.prices[size]}">
                    ${size} - ₹${product.prices[size]?.toLocaleString()}
                </div>
            `).join('');

            // Size selection
            sizesEl.querySelectorAll('.size-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    sizesEl.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    state.selectedSize = opt.dataset.size;
                });
            });
        }

        // Add to cart button
        const addBtn = document.getElementById('modalAddToCart');
        addBtn.onclick = () => {
            if (window.cart && state.selectedSize) {
                window.cart.addItem(productId, state.selectedSize, 1);
                addBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Added!';
                addBtn.classList.add('success');
                setTimeout(() => {
                    addBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart';
                    addBtn.classList.remove('success');
                }, 2000);
            }
        };

        // Show modal
        elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // Close quick view modal
    window.closeQuickView = function () {
        elements.modal.classList.remove('active');
        document.body.style.overflow = '';
        state.selectedProduct = null;
    };

    // WhatsApp order from modal
    window.orderViaWhatsAppModal = function () {
        if (state.selectedProduct) {
            const product = state.selectedProduct;
            const size = state.selectedSize || 'selected size';
            const price = product.prices && state.selectedSize ? product.prices[state.selectedSize] : '';
            const message = `Hi! I'm interested in ordering:\n\n*${product.name}*\nSize: ${size}\n${price ? 'Price: ₹' + price : ''}\n\nPlease provide details.`;
            window.open(`https://wa.me/919901888305?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    // Reset filters
    window.resetFilters = function () {
        state.searchQuery = '';
        state.currentCategory = 'all';
        state.currentSort = '';
        elements.searchInput.value = '';
        elements.sortSelect.value = '';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
        filterAndRender();
    };

    // Handle hash navigation
    function handleHashNavigation() {
        if (window.location.hash) {
            const productId = window.location.hash.substring(1);
            setTimeout(() => {
                const productEl = document.getElementById(productId);
                if (productEl) {
                    productEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    productEl.classList.add('highlight');
                    setTimeout(() => productEl.classList.remove('highlight'), 2000);
                }
            }, 500);
        }
    }

    // Show loading state
    function showLoading() {
        elements.container.innerHTML = `
            <div class="products-loading">
                <div class="spinner"></div>
                <p>Loading products...</p>
            </div>
        `;
    }

    // Show error state
    function showError() {
        elements.container.innerHTML = `
            <div class="products-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Unable to load products</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

})();

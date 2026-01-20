/* ========================================
   TAWABIL SPICES – MAIN JAVASCRIPT
======================================== */

// ----------------------------------------
// WHATSAPP CONFIGURATION (uses config.js as single source of truth)
// ----------------------------------------
function getWhatsAppNumber() {
    return window.TawabilConfig?.whatsapp?.number || '919901888305';
}
function getWhatsAppDefaultMessage() {
    return window.TawabilConfig?.whatsapp?.defaultMessage || "Hi Tawabil! I'm interested in your premium spices. Please share details.";
}

// ----------------------------------------
// NAVIGATION FUNCTIONALITY
// ----------------------------------------
const navbar = document.querySelector('.navbar');
const navToggle = document.querySelector('.navbar-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

// Navbar scroll effect
function handleScroll() {
    if (window.scrollY > 50) {
        navbar?.classList.add('scrolled');
    } else {
        navbar?.classList.remove('scrolled');
    }
}

window.addEventListener('scroll', handleScroll);

// Mobile menu toggle
navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    mobileMenu?.classList.toggle('active');
    document.body.classList.toggle('menu-open');
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-menu-links a').forEach(link => {
    link.addEventListener('click', () => {
        navToggle?.classList.remove('active');
        mobileMenu?.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
});

// ----------------------------------------
// WHATSAPP FUNCTIONS
// ----------------------------------------
function openWhatsApp(message) {
    const finalMessage = message || getWhatsAppDefaultMessage();
    const url = `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, '_blank');
}

function orderViaWhatsApp(productName) {
    const message = `Hi Tawabil! I'd like to order ${productName}. Please share pricing and availability.`;
    openWhatsApp(message);
}

function inquireViaWhatsApp() {
    const message = 'Hi Tawabil! I\'m interested in bulk ordering for my business. Please share B2B pricing details.';
    openWhatsApp(message);
}

// ----------------------------------------
// SCROLL REVEAL ANIMATIONS
// ----------------------------------------
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

    reveals.forEach((element, index) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const revealPoint = 150;

        if (elementTop < windowHeight - revealPoint) {
            // Add stagger delay based on index within parent
            const delay = (index % 4) * 100;
            element.style.transitionDelay = `${delay}ms`;
            element.classList.add('active');
        }
    });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// ----------------------------------------
// SMOOTH SCROLL FOR ANCHOR LINKS
// ----------------------------------------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ----------------------------------------
// COUNTER ANIMATION
// ----------------------------------------
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');

    counters.forEach(counter => {
        const target = counter.getAttribute('data-count');
        if (!target) return;

        const targetNum = parseInt(target.replace(/\D/g, ''));
        const suffix = target.replace(/[0-9]/g, '');
        const duration = 2000;
        const step = targetNum / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < targetNum) {
                counter.textContent = Math.floor(current) + suffix;
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        updateCounter();
    });
}

// Trigger counter animation when in view
const statsSection = document.querySelector('.stats-grid');
if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(statsSection);
}

// ----------------------------------------
// TESTIMONIAL SLIDER
// ----------------------------------------
class TestimonialSlider {
    constructor(container) {
        this.container = container;
        this.track = container.querySelector('.slider-track');
        this.cards = container.querySelectorAll('.testimonial-card');
        this.prevBtn = container.querySelector('.slider-prev');
        this.nextBtn = container.querySelector('.slider-next');
        this.dots = container.querySelectorAll('.slider-dot');
        this.currentIndex = 0;
        this.cardWidth = 0;
        this.gap = 24;

        this.init();
    }

    init() {
        if (!this.track || this.cards.length === 0) return;

        this.updateCardWidth();
        this.bindEvents();
        this.updateSlider();

        window.addEventListener('resize', () => {
            this.updateCardWidth();
            this.updateSlider();
        });
    }

    updateCardWidth() {
        if (this.cards[0]) {
            this.cardWidth = this.cards[0].offsetWidth + this.gap;
        }
    }

    bindEvents() {
        this.prevBtn?.addEventListener('click', () => this.prev());
        this.nextBtn?.addEventListener('click', () => this.next());
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goTo(index));
        });
    }

    prev() {
        this.currentIndex = Math.max(0, this.currentIndex - 1);
        this.updateSlider();
    }

    next() {
        const maxIndex = Math.max(0, this.cards.length - this.getVisibleCards());
        this.currentIndex = Math.min(maxIndex, this.currentIndex + 1);
        this.updateSlider();
    }

    goTo(index) {
        this.currentIndex = index;
        this.updateSlider();
    }

    getVisibleCards() {
        const containerWidth = this.container.offsetWidth;
        return Math.floor(containerWidth / this.cardWidth) || 1;
    }

    updateSlider() {
        const offset = this.currentIndex * this.cardWidth;
        this.track.style.transform = `translateX(-${offset}px)`;

        // Update dots
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });

        // Update buttons
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentIndex === 0;
        }
        if (this.nextBtn) {
            const maxIndex = Math.max(0, this.cards.length - this.getVisibleCards());
            this.nextBtn.disabled = this.currentIndex >= maxIndex;
        }
    }
}

// Initialize sliders
document.querySelectorAll('.slider-container').forEach(container => {
    new TestimonialSlider(container);
});

// ----------------------------------------
// FORM VALIDATION
// ----------------------------------------
function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('[required]');

    inputs.forEach(input => {
        const formGroup = input.closest('.form-group');
        const errorEl = formGroup?.querySelector('.form-error');

        // Remove previous error state
        input.classList.remove('error');
        if (errorEl) errorEl.textContent = '';

        // Check validity
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'This field is required';
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            isValid = false;
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Please enter a valid email';
        } else if (input.type === 'tel' && !isValidPhone(input.value)) {
            isValid = false;
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Please enter a valid phone number';
        }
    });

    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
}

// ----------------------------------------
// FORM HANDLERS (WHATSAPP INTEGRATION)
// ----------------------------------------
// WhatsApp number from config (single source of truth)

// Bulk Order Form Handler
const bulkOrderForm = document.getElementById('bulkOrderForm');
if (bulkOrderForm) {
    bulkOrderForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm(this)) return;

        // Get form values
        const formData = new FormData(this);
        const businessName = formData.get('business_name');
        const contactPerson = formData.get('contact_person');
        const phone = formData.get('phone');
        const businessType = formData.get('business_type');
        const message = formData.get('message');

        // Get selected products
        const selectedProducts = [];
        this.querySelectorAll('input[name="products[]"]:checked').forEach(checkbox => {
            const productMap = {
                'cardamom': 'Cardamom',
                'pepper': 'Black Pepper',
                'cloves': 'Cloves',
                'cinnamon': 'Cinnamon',
                'cumin': 'Cumin',
                'dry_fruits': 'Dry Fruits'
            };
            selectedProducts.push(productMap[checkbox.value] || checkbox.value);
        });

        // Construct WhatsApp message
        let waMessage = `*New Bulk Order Inquiry*\n\n`;
        waMessage += `*Business:* ${businessName}\n`;
        waMessage += `*Contact:* ${contactPerson}\n`;
        waMessage += `*Phone:* ${phone}\n`;
        waMessage += `*Type:* ${businessType}\n`;
        if (selectedProducts.length > 0) {
            waMessage += `*Interested In:* ${selectedProducts.join(', ')}\n`;
        }
        if (message) {
            waMessage += `*Note:* ${message}\n`;
        }

        // Open WhatsApp
        const encodedMessage = encodeURIComponent(waMessage);
        window.open(`https://wa.me/${getWhatsAppNumber()}?text=${encodedMessage}`, '_blank');

        // Reset form and show success
        this.reset();
        showFormSuccess(this);
    });
}

// Contact Form Handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm(this)) return;

        const formData = new FormData(this);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const message = formData.get('message');

        let waMessage = `*New Website Inquiry*\n\n`;
        waMessage += `*Name:* ${name}\n`;
        waMessage += `*Email:* ${email}\n`;
        if (phone) waMessage += `*Phone:* ${phone}\n`;
        waMessage += `*Message:* ${message}\n`;

        const encodedMessage = encodeURIComponent(waMessage);
        window.open(`https://wa.me/${getWhatsAppNumber()}?text=${encodedMessage}`, '_blank');

        this.reset();
        showFormSuccess(this);
    });
}

function showFormSuccess(form) {
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    btn.textContent = 'Message Sent! ✓';
    btn.disabled = true;
    btn.classList.add('success');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.classList.remove('success');
        form.reset();
    }, 3000);
}

// ----------------------------------------
// LAZY LOADING IMAGES
// ----------------------------------------
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });

    images.forEach(img => imageObserver.observe(img));
}

document.addEventListener('DOMContentLoaded', lazyLoadImages);

// ----------------------------------------
// ACTIVE NAVIGATION LINK
// ----------------------------------------
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.navbar-links a, .mobile-menu-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', setActiveNavLink);

// ----------------------------------------
// INITIALIZE ON DOM LOAD
// ----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    handleScroll();
    revealOnScroll();
    setActiveNavLink();
});

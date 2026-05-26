const Cart = {
  drawerHTML: `
    <div class="cart-drawer-overlay" id="cartOverlay"></div>
    <div class="cart-drawer" id="cartDrawer">
      <div class="cart-drawer-header">
        <h3 style="margin:0; color: var(--c-primary); display: flex; align-items: center; gap: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          Your Bag
        </h3>
        <button class="drawer-close" onclick="Cart.toggleDrawer()">&times;</button>
      </div>
      <div class="cart-drawer-body" id="drawerItemsContainer">
        <!-- Items go here -->
      </div>
      <div class="cart-drawer-footer">
        <div style="display:flex; justify-content:space-between; margin-bottom: var(--sp-4); font-weight: var(--fw-bold); font-size: var(--fs-lg); color: var(--c-primary);">
          <span>Subtotal</span>
          <span id="drawerSubtotal">Rs. 0</span>
        </div>
        <p style="font-size: var(--fs-xs); color: var(--c-text-muted); margin-bottom: var(--sp-6); text-align: center;">Shipping & taxes calculated at checkout.</p>
        <a href="cart.html" class="btn btn-gold" style="width: 100%; margin-bottom: var(--sp-3); display: flex; align-items: center; justify-content: center;">View Full Cart</a>
        <button onclick="Cart.handleDrawerCheckout()" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Secure Checkout
        </button>
      </div>
    </div>
  `,

  init() {
    if(!document.getElementById('cartDrawer')) {
      const div = document.createElement('div');
      div.innerHTML = this.drawerHTML;
      document.body.appendChild(div);
      
      document.getElementById('cartOverlay').addEventListener('click', () => this.toggleDrawer());
      
      // Override nav cart buttons to open drawer
      const cartBtns = document.querySelectorAll('.nav-cart-btn');
      cartBtns.forEach(btn => {
        btn.href = 'javascript:void(0)';
        btn.onclick = (e) => {
          e.preventDefault();
          this.toggleDrawer();
        };
      });
    }
    
    // Add drawer CSS dynamically if not present
    if(!document.getElementById('cartDrawerCSS')) {
      const style = document.createElement('style');
      style.id = 'cartDrawerCSS';
      style.innerHTML = `
        .cart-drawer-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(13,34,71,0.6); backdrop-filter: blur(4px);
          z-index: 9998; opacity: 0; pointer-events: none; transition: opacity var(--dur-base);
        }
        .cart-drawer-overlay.active { opacity: 1; pointer-events: auto; }
        .cart-drawer {
          position: fixed; top: 0; right: 0; width: 100%; max-width: 420px; height: 100%; height: 100dvh;
          background: var(--c-pearl); z-index: 9999;
          transform: translateX(100%); transition: transform var(--dur-base) var(--ease-out-expo);
          display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }
        .cart-drawer.active { transform: translateX(0); }
        .cart-drawer-header { padding: var(--sp-6); border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: center; background: var(--c-white); }
        .drawer-close { background: none; border: none; font-size: 28px; cursor: pointer; color: var(--c-text-muted); transition: color var(--dur-fast); }
        .drawer-close:hover { color: var(--c-primary); }
        .cart-drawer-body { flex: 1; overflow-y: auto; padding: var(--sp-6); }
        .cart-drawer-footer { padding: var(--sp-6); background: var(--c-white); border-top: 1px solid var(--c-border); }
        .drawer-item { display: flex; gap: var(--sp-4); margin-bottom: var(--sp-6); background: var(--c-white); padding: var(--sp-4); border-radius: var(--r-md); box-shadow: var(--sh-sm); }
        .drawer-item img { width: 70px; height: 90px; object-fit: cover; border-radius: var(--r-sm); }
        .drawer-item-info { flex: 1; display: flex; flex-direction: column; }
        .drawer-item-title { font-weight: var(--fw-semibold); color: var(--c-primary); margin-bottom: 4px; font-size: var(--fs-sm); }
        .drawer-item-price { font-weight: var(--fw-bold); color: var(--c-gold-dark); font-size: var(--fs-sm); margin-bottom: 8px; }
        .drawer-qty-row { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
        .drawer-qty { display: flex; border: 1px solid var(--c-border); border-radius: var(--r-sm); overflow: hidden; width: max-content; }
        .drawer-qty button { width: 28px; height: 28px; background: var(--c-pearl); display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; }
        .drawer-qty button:hover { background: var(--c-border); }
        .drawer-qty span { width: 32px; text-align: center; font-size: var(--fs-xs); display: flex; align-items: center; justify-content: center; font-weight: var(--fw-semibold); }
      `;
      document.head.appendChild(style);
    }
    
    this.updateCartCount();
  },

  toggleDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if(drawer.classList.contains('active')) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      this.renderDrawer();
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  renderDrawer() {
    const cart = this.getCart();
    const container = document.getElementById('drawerItemsContainer');
    const subtotalEl = document.getElementById('drawerSubtotal');
    let subtotal = 0;
    
    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: var(--sp-12) 0;">
          <div style="font-size: 48px; margin-bottom: var(--sp-4);">🛍️</div>
          <h4 style="color: var(--c-primary); margin-bottom: var(--sp-2);">Your cart is empty</h4>
          <p style="color: var(--c-text-sub); font-size: var(--fs-sm); margin-bottom: var(--sp-6);">Looks like you haven't added any items yet.</p>
          <a href="catalog.html" class="btn btn-outline-gold" onclick="Cart.toggleDrawer()">Continue Shopping</a>
        </div>
      `;
    } else {
      container.innerHTML = cart.map((item, index) => {
        subtotal += this.parsePrice(item.price) * item.quantity;
        return `
          <div class="drawer-item">
            <img src="${item.image}" alt="${item.title}">
            <div class="drawer-item-info">
              <div class="drawer-item-title">${item.title}</div>
              <div style="font-size: 10px; color: var(--c-text-muted); margin-bottom: 2px;">${item.serviceType || 'Ready-to-Wear'} | ${item.category}</div>
              <div class="drawer-item-price">${item.price}</div>
              <div class="drawer-qty-row">
                <div class="drawer-qty">
                  <button onclick="Cart.updateQuantity(${index}, ${item.quantity - 1})">-</button>
                  <span>${item.quantity}</span>
                  <button onclick="Cart.updateQuantity(${index}, ${item.quantity + 1})">+</button>
                </div>
                <a href="javascript:void(0)" onclick="Cart.removeItem(${index})" style="font-size: 11px; color: #e53e3e; text-decoration: underline;">Remove</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    subtotalEl.textContent = this.formatPrice(subtotal);
  },

  getCart() {
    return JSON.parse(localStorage.getItem('nss_cart')) || [];
  },
  saveCart(cart) {
    localStorage.setItem('nss_cart', JSON.stringify(cart));
    this.updateCartCount();
    if(document.getElementById('cartDrawer') && document.getElementById('cartDrawer').classList.contains('active')) {
      this.renderDrawer();
    }
  },
  addItem(item) {
    const cart = this.getCart();
    
    // Normalize size before comparison
    item.size = item.size || 'Standard';
    
    // Add mock details for luxury breakdown
    item.serviceType = item.category === 'Bespoke' || item.size === 'Custom Measurement' ? 'Full Stitching' : 'Ready-to-Wear';
    
    if(item.size === 'Custom Measurement') {
      item.measurements = { chest: '36"', waist: '28"', length: '40"' }; // Mock data
    }

    const existing = cart.find(i => i.title === item.title && i.size === item.size);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.push({
        title: item.title,
        price: item.price,
        image: item.image,
        size: item.size || 'Standard',
        category: item.category || '',
        quantity: item.quantity || 1,
        serviceType: item.serviceType,
        measurements: item.measurements
      });
    }
    this.saveCart(cart);
    this.showToast(`${item.title} added to cart`);
    
    // Auto open drawer when added
    if(!document.getElementById('cartDrawer').classList.contains('active')){
      this.toggleDrawer();
    }
    return true;
  },
  removeItem(index) {
    const cart = this.getCart();
    cart.splice(index, 1);
    this.saveCart(cart);
    
    // If we are on cart.html, we need to trigger re-render of page cart
    if(typeof renderCart === 'function' && window.location.pathname.includes('cart.html')) {
      renderCart();
    }
  },
  updateQuantity(index, newQty) {
    const cart = this.getCart();
    if (newQty <= 0) {
      this.removeItem(index);
    } else {
      cart[index].quantity = newQty;
      this.saveCart(cart);
      
      if(typeof renderCart === 'function' && window.location.pathname.includes('cart.html')) {
        renderCart();
      }
    }
  },
  clearCart() {
    localStorage.removeItem('nss_cart');
    this.updateCartCount();
  },
  updateCartCount() {
    const cart = this.getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBtns = document.querySelectorAll('.nav-cart-btn');
    cartBtns.forEach(btn => {
      if (typeof Auth !== 'undefined' && !Auth.currentUser) {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; display:inline-block; vertical-align:middle;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg> Cart`;
      } else {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; display:inline-block; vertical-align:middle;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg> Cart (${count})`;
      }
    });
  },
  parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    const cleanStr = String(priceStr).replace(/Rs\.?/gi, '').replace(/,/g, '').trim();
    return parseFloat(cleanStr) || 0;
  },
  formatPrice(priceNum) {
    return `Rs. ${Number(priceNum).toLocaleString('en-US')}`;
  },
  showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'var(--c-primary)';
    toast.style.color = 'var(--c-white)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = 'var(--r-full)';
    toast.style.boxShadow = 'var(--sh-lg)';
    toast.style.zIndex = '99999';
    toast.style.animation = 'scaleIn 0.3s ease';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  handleDrawerCheckout() {
    // Guard: if the logged-in user is unverified, show verification modal
    if (typeof Auth !== 'undefined' && Auth.currentUser && !Auth.currentUser.isVerified) {
      this.toggleDrawer(); // close drawer first
      Auth.showVerificationModal();
      return;
    }
    // Not logged in: close drawer and prompt login
    if (typeof Auth !== 'undefined' && !Auth.currentUser) {
      this.toggleDrawer();
      Auth.openModal();
      return;
    }
    window.location.href = 'checkout.html';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Cart.init();
});

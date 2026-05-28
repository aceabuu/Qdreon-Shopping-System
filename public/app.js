/* ═══════════════════════════════════════════════════════════
   QDREON — app.js  (SPA frontend)
   ═══════════════════════════════════════════════════════════ */

/* ── State ── */
let currentUser  = null;
let currentPage  = 'home';
let promoData    = null;
let pendingUserId = null;   // for verify / reset flows
let detailBackPage = 'home';

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  const path = location.pathname.slice(1) || 'home';
  navigate(path);
  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const dd = document.getElementById('userDropdown');
    if (dd && !dd.classList.contains('hidden')) {
      if (!document.getElementById('userAvatarBtn').contains(e.target)) {
        dd.classList.add('hidden');
      }
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function navigate(page, params = {}) {
  // Auth guards
  const protected_ = ['cart', 'checkout', 'orders', 'order-detail', 'profile'];
  const adminOnly  = ['admin'];

  if (protected_.includes(page) && !currentUser) { navigate('login'); return; }
  if (adminOnly.includes(page) && currentUser?.role !== 'ADMIN') { navigate('home'); return; }

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.remove('hidden'); } else { navigate('home'); return; }

  currentPage = page;
  history.pushState({}, '', `/${page}`);
  window.scrollTo(0, 0);

  // Update active nav link
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Load page data
  switch (page) {
    case 'home':          loadHome(); break;
    case 'products':      loadAllProducts(); break;
    case 'product-detail': loadProductDetail(params.id); break;
    case 'cart':          loadCart(); break;
    case 'checkout':      loadCheckout(); break;
    case 'orders':        loadOrders(); break;
    case 'order-detail':  loadOrderDetail(params.id); break;
    case 'profile':       loadProfile(); break;
    case 'admin':         loadAdmin(); break;
  }
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
async function checkAuth() {
  try {
    const res = await api('/api/auth/me');
    if (res.loggedIn) {
      currentUser = res;
      updateNavForUser();
      updateCartBadge();
      updateOrdersBadge();
    } else {
      currentUser = null;
      updateNavForGuest();
    }
  } catch { currentUser = null; updateNavForGuest(); }
}

function updateNavForUser() {
  document.getElementById('authBtns').classList.add('hidden');
  document.getElementById('userMenu').classList.remove('hidden');
  document.getElementById('userInitials').textContent = 
    (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
  document.getElementById('dropdownName').textContent =
    `${currentUser.firstName} ${currentUser.lastName}`;
  document.querySelectorAll('.auth-only').forEach(el => el.classList.remove('hidden'));
  if (currentUser.role === 'ADMIN') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }
  document.getElementById('cartBtn').classList.remove('hidden');
  document.getElementById('ordersBtn').classList.remove('hidden');
}

function updateNavForGuest() {
  document.getElementById('authBtns').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
  document.querySelectorAll('.auth-only').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
}

function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('hidden');
}
function closeDropdown() {
  document.getElementById('userDropdown').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const res = await api('/api/auth/login', 'POST', {
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value
  });
  btn.disabled = false; btn.textContent = 'Sign In';
  if (res.success) {
    await checkAuth();
    navigate(res.redirect?.slice(1) || 'home');
    showToast('Welcome back!', 'success');
  } else if (res.needsVerification) {
    pendingUserId = res.userId;
    navigate('verify');
    showToast('Please verify your email first.', 'error');
  } else {
    showToast(res.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Creating account…';
  const res = await api('/api/auth/register', 'POST', {
    first_name: document.getElementById('regFirstName').value,
    last_name:  document.getElementById('regLastName').value,
    email:      document.getElementById('regEmail').value,
    phone:      document.getElementById('regPhone').value,
    password:   document.getElementById('regPassword').value
  });
  btn.disabled = false; btn.textContent = 'Create Account';
  if (res.success) {
    pendingUserId = res.userId;
    navigate('verify');
    showToast('Check your email for a verification code!', 'success');
  } else {
    showToast(res.message, 'error');
  }
}

async function handleVerify(e) {
  e.preventDefault();
  const digits = document.querySelectorAll('#page-verify .code-digit');
  const code = Array.from(digits).map(d => d.value).join('');
  if (code.length !== 6) { showToast('Enter the complete 6-digit code.', 'error'); return; }
  const res = await api('/api/auth/verify', 'POST', { userId: pendingUserId, code });
  if (res.success) {
    showToast('Email verified! Please log in.', 'success');
    navigate('login');
  } else { showToast(res.message, 'error'); }
}

async function resendCode() {
  if (!pendingUserId) return;
  const res = await api('/api/auth/resend-code', 'POST', { userId: pendingUserId });
  showToast(res.message || 'Code resent!', res.success ? 'success' : 'error');
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Sending…';
  const res = await api('/api/auth/forgot-password', 'POST', {
    email: document.getElementById('forgotEmail').value
  });
  btn.disabled = false; btn.textContent = 'Send Reset Code';
  showToast(res.message, 'success');
  if (res.userId) { pendingUserId = res.userId; navigate('reset-password'); }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const digits = document.querySelectorAll('#page-reset-password .code-digit');
  const code = Array.from(digits).map(d => d.value).join('');
  const newPassword = document.getElementById('resetNewPass').value;
  if (code.length !== 6) { showToast('Enter the complete 6-digit code.', 'error'); return; }
  const res = await api('/api/auth/reset-password', 'POST', { userId: pendingUserId, code, newPassword });
  if (res.success) {
    showToast('Password updated! Please log in.', 'success');
    navigate('login');
  } else { showToast(res.message, 'error'); }
}

async function logout() {
  await api('/api/auth/logout', 'POST');
  currentUser = null;
  updateNavForGuest();
  document.getElementById('cartBadge').classList.add('hidden');
  document.getElementById('ordersBadge').classList.add('hidden');
  navigate('home');
  showToast('Logged out.', 'success');
}

// OTP digit handling
function codeInput(el, idx, group = 'verify') {
  el.value = el.value.replace(/\D/g, '');
  if (el.value && idx < 5) {
    const page = group === 'reset' ? 'reset-password' : 'verify';
    document.querySelectorAll(`#page-${page} .code-digit`)[idx + 1]?.focus();
  }
}
function codeBack(el, idx) {
  if (event.key === 'Backspace' && !el.value && idx > 0) {
    const page = el.closest('.page').id.replace('page-', '');
    document.querySelectorAll(`#page-${page} .code-digit`)[idx - 1]?.focus();
  }
}
function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════ */
async function loadHome() {
  loadCategories();
  loadFeaturedProducts();
}

async function loadCategories() {
  const res = await api('/api/products/categories');
  const icons = { Electronics:'💻', Accessories:'🎒', Storage:'💾', Home:'🏠', Clothing:'👕', Sports:'⚽' };
  if (!res.success) return;
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = res.categories.map(c => `
    <a class="category-card" href="#" onclick="filterByCategory('${c.name}')">
      <div class="category-icon">${icons[c.name] || '📦'}</div>
      <div class="category-name">${c.name}</div>
    </a>
  `).join('');
}

async function loadFeaturedProducts() {
  const res = await api('/api/products?sort=rating');
  if (!res.success) return;
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = res.products.slice(0, 8).map(productCard).join('');
}

function filterByCategory(cat) {
  navigate('products');
  setTimeout(() => {
    document.getElementById('categoryFilter').value = cat;
    filterProducts();
  }, 50);
  return false;
}

function scrollToFeatured() {
  document.getElementById('featuredSection')?.scrollIntoView({ behavior: 'smooth' });
}

let searchTimeout;
function handleSearchInput(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    navigate('products');
    setTimeout(() => {
      document.getElementById('productSearch').value = val;
      filterProducts();
    }, 50);
  }, 300);
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS PAGE
═══════════════════════════════════════════════════════════ */
async function loadAllProducts() {
  const grid = document.getElementById('allProductsGrid');
  grid.innerHTML = '<div class="spinner"></div>';

  // Load categories into filter
  const catRes = await api('/api/products/categories');
  if (catRes.success) {
    const sel = document.getElementById('categoryFilter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All Categories</option>' +
      catRes.categories.map(c => `<option value="${c.name}" ${c.name === current ? 'selected' : ''}>${c.name}</option>`).join('');
  }

  filterProducts();
}

async function filterProducts() {
  const search   = document.getElementById('productSearch')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  const sort     = document.getElementById('sortFilter')?.value || '';

  const params = new URLSearchParams();
  if (search)   params.set('search', search);
  if (category) params.set('category', category);
  if (sort)     params.set('sort', sort);

  const grid = document.getElementById('allProductsGrid');
  grid.innerHTML = '<div class="spinner"></div>';
  const res = await api(`/api/products?${params}`);
  if (res.success) {
    grid.innerHTML = res.products.length
      ? res.products.map(productCard).join('')
      : '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your filters.</p></div>';
  }
}

function productCard(p) {
  const outOfStock = p.stock_quantity === 0;
  const stars = starRating(p.rating);
  return `
    <div class="product-card" onclick="openProduct(${p.product_id})">
      <div class="product-img-wrap">
        <img src="${p.image_url || 'https://via.placeholder.com/400?text=No+Image'}" alt="${esc(p.name)}" loading="lazy" />
        ${outOfStock ? '<span class="product-badge out-of-stock">Out of Stock</span>' : ''}
      </div>
      <div class="product-info">
        <div class="product-category">${esc(p.category_name || '')}</div>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span>${p.rating}</span>
        </div>
        <div class="product-footer">
          <div class="product-price">₱${formatPrice(p.price)}</div>
          <button class="product-add-btn" onclick="quickAddToCart(event, ${p.product_id})" ${outOfStock ? 'disabled' : ''} title="Add to cart">+</button>
        </div>
      </div>
    </div>`;
}

function openProduct(id) {
  detailBackPage = currentPage;
  navigate('product-detail', { id });
}

async function loadProductDetail(id) {
  const el = document.getElementById('productDetailContent');
  el.innerHTML = '<div class="spinner"></div>';

  const res = await api(`/api/products/${id}`);
  if (!res.success) { el.innerHTML = '<div class="empty-state"><h3>Product not found.</h3></div>'; return; }
  const p = res.product;
  const outOfStock = p.stock_quantity === 0;

  el.innerHTML = `
    <div class="product-detail">
      <button class="product-detail-back" onclick="navigate('${detailBackPage}')">← Back</button>
      <div class="product-detail-grid">
        <div>
          <img class="product-detail-img" src="${p.image_url || ''}" alt="${esc(p.name)}" />
        </div>
        <div>
          <div class="detail-category">${esc(p.category_name || '')}</div>
          <h1 class="detail-title">${esc(p.name)}</h1>
          <div class="detail-rating">
            <span class="stars">${starRating(p.rating)}</span>
            <span>${p.rating} / 5.0</span>
          </div>
          <div class="detail-price">₱${formatPrice(p.price)}</div>
          <p class="detail-desc">${esc(p.description || '')}</p>
          <div class="stock-info">
            ${outOfStock
              ? '<span style="color:var(--error)">Out of stock</span>'
              : `In Stock: <span class="${p.stock_quantity <= 5 ? 'low' : ''}">${p.stock_quantity} available</span>`}
          </div>
          ${!outOfStock ? `
          <div class="qty-row">
            <div class="qty-control">
              <button onclick="changeQty(-1, ${p.stock_quantity})">−</button>
              <span id="detailQty">1</span>
              <button onclick="changeQty(1, ${p.stock_quantity})">+</button>
            </div>
            <span style="color:var(--muted);font-size:.85rem">qty</span>
          </div>
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <button class="btn-primary btn-lg" onclick="addToCartFromDetail(${p.product_id}, ${p.price})">Add to Cart</button>
            <button class="btn-ghost btn-lg" onclick="buyNow(${p.product_id})">Buy Now</button>
          </div>` : `<button class="btn-ghost btn-lg" disabled>Out of Stock</button>`}
        </div>
      </div>
    </div>`;
}

let detailQty = 1;
function changeQty(delta, max) {
  detailQty = Math.max(1, Math.min(max, detailQty + delta));
  const el = document.getElementById('detailQty');
  if (el) el.textContent = detailQty;
}

async function addToCartFromDetail(productId, price) {
  if (!currentUser) { navigate('login'); return; }
  const res = await api('/api/cart/add', 'POST', { product_id: productId, quantity: detailQty });
  if (res.success) {
    showToast(`Added to cart!`, 'success');
    updateCartBadge(res.count);
  } else { showToast(res.message, 'error'); }
  detailQty = 1;
  const el = document.getElementById('detailQty');
  if (el) el.textContent = 1;
}

async function buyNow(productId) {
  if (!currentUser) { navigate('login'); return; }
  const res = await api('/api/cart/add', 'POST', { product_id: productId, quantity: detailQty });
  if (res.success) { navigate('cart'); updateCartBadge(res.count); }
  else { showToast(res.message, 'error'); }
}

async function quickAddToCart(e, productId) {
  e.stopPropagation();
  if (!currentUser) { navigate('login'); return; }
  const res = await api('/api/cart/add', 'POST', { product_id: productId, quantity: 1 });
  if (res.success) { showToast('Added to cart!', 'success'); updateCartBadge(res.count); }
  else { showToast(res.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════════════════ */
async function loadCart() {
  const itemsEl   = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');
  itemsEl.innerHTML = '<div class="spinner"></div>';

  const res = await api('/api/cart');
  if (!res.success) return;

  if (!res.items.length) {
    itemsEl.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Browse products and add items to your cart.</p>
        <br/>
        <button class="btn-primary" onclick="navigate('products')">Browse Products</button>
      </div>`;
    summaryEl.innerHTML = '';
    updateCartBadge(0);
    return;
  }

  itemsEl.innerHTML = res.items.map(item => `
    <div class="cart-item" id="cart-item-${item.product_id}">
      <img class="cart-item-img" src="${item.image_url || ''}" alt="${esc(item.name)}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}</div>
        <div class="cart-item-price">₱${formatPrice(item.unit_price)} each</div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button onclick="updateCartItem(${item.product_id}, ${item.quantity - 1})">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateCartItem(${item.product_id}, ${item.quantity + 1}, ${item.stock_quantity})">+</button>
          </div>
          <button class="btn-danger btn-sm" onclick="removeCartItem(${item.product_id})">Remove</button>
        </div>
      </div>
      <div class="cart-item-total">₱${formatPrice(item.unit_price * item.quantity)}</div>
    </div>`).join('');

  summaryEl.innerHTML = `
    <div class="cart-summary">
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${res.count} items)</span><span>₱${formatPrice(res.total)}</span></div>
      <div class="summary-row"><span>Shipping</span><span style="color:var(--success)">Free</span></div>
      <div class="summary-row total"><span>Total</span><span class="price">₱${formatPrice(res.total)}</span></div>
      <br/>
      <button class="btn-primary btn-full btn-lg" onclick="navigate('checkout')">Proceed to Checkout</button>
      <br/><br/>
      <button class="btn-ghost btn-full" onclick="navigate('products')">Continue Shopping</button>
    </div>`;
}

async function updateCartItem(productId, newQty, maxStock = 9999) {
  if (newQty > maxStock) { showToast('Not enough stock.', 'error'); return; }
  const res = await api('/api/cart/update', 'PUT', { product_id: productId, quantity: newQty });
  if (res.success) { loadCart(); updateCartBadge(); }
  else { showToast(res.message, 'error'); }
}

async function removeCartItem(productId) {
  const res = await api(`/api/cart/remove/${productId}`, 'DELETE');
  if (res.success) { loadCart(); updateCartBadge(); }
}

async function updateCartBadge(count) {
  if (count !== undefined) {
    const badge = document.getElementById('cartBadge');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
    return;
  }
  if (!currentUser) return;
  const res = await api('/api/cart/count');
  const badge = document.getElementById('cartBadge');
  badge.textContent = res.count || 0;
  badge.classList.toggle('hidden', !res.count);
}

/* ═══════════════════════════════════════════════════════════
   CHECKOUT
═══════════════════════════════════════════════════════════ */
async function loadCheckout() {
  const [cartRes, addrRes] = await Promise.all([
    api('/api/cart'),
    api('/api/user/addresses')
  ]);

  if (!cartRes.success || !cartRes.items.length) {
    navigate('cart');
    showToast('Your cart is empty.', 'error');
    return;
  }

  // Render address selector
  renderAddressSelector(addrRes.addresses || []);
  renderCheckoutSummary(cartRes);
  promoData = null;
  document.getElementById('promoInput').value = '';
  document.getElementById('promoMsg').textContent = '';
  document.getElementById('promoMsg').className = 'promo-msg';
}

let selectedAddressId = null;

function renderAddressSelector(addresses) {
  const el = document.getElementById('addressSelector');
  if (!addresses.length) {
    el.innerHTML = `
      <p style="color:var(--muted);margin-bottom:.75rem">No saved addresses.</p>
      <button class="btn-ghost btn-sm" onclick="navigate('profile'); switchProfileTab('addresses')">+ Add Address</button>`;
    selectedAddressId = null;
    return;
  }
  // Auto-select default
  const def = addresses.find(a => a.is_default) || addresses[0];
  selectedAddressId = def.address_id;

  el.innerHTML = addresses.map(a => `
    <div class="address-option ${a.address_id === selectedAddressId ? 'selected' : ''}"
         id="addr-opt-${a.address_id}"
         onclick="selectAddress(${a.address_id})">
      <div class="addr-name">${esc(a.full_name)} ${a.phone ? '· ' + esc(a.phone) : ''}
        ${a.is_default ? '<span class="addr-default-badge">Default</span>' : ''}
      </div>
      <div class="addr-detail">${esc(a.street)}${a.barangay ? ', ' + esc(a.barangay) : ''}, ${esc(a.city)}, ${esc(a.province)} ${a.zip_code || ''}</div>
    </div>`).join('');
}

function selectAddress(id) {
  selectedAddressId = id;
  document.querySelectorAll('.address-option').forEach(el => {
    el.classList.toggle('selected', el.id === `addr-opt-${id}`);
  });
}

let checkoutCartData = null;
function renderCheckoutSummary(cartRes) {
  checkoutCartData = cartRes;
  const el = document.getElementById('checkoutSummary');
  const discount = promoData?.discount || 0;
  const total = cartRes.total - discount;

  el.innerHTML = `
    ${cartRes.items.map(i => `
      <div class="summary-row">
        <span>${esc(i.name)} × ${i.quantity}</span>
        <span>₱${formatPrice(i.unit_price * i.quantity)}</span>
      </div>`).join('')}
    <div class="summary-row" style="border-top:1px solid var(--border);padding-top:.75rem;margin-top:.5rem">
      <span>Subtotal</span><span>₱${formatPrice(cartRes.total)}</span>
    </div>
    ${discount > 0 ? `<div class="summary-row" style="color:var(--success)"><span>Discount</span><span>−₱${formatPrice(discount)}</span></div>` : ''}
    <div class="summary-row"><span>Shipping</span><span style="color:var(--success)">Free</span></div>
    <div class="summary-row total">
      <span>Total</span>
      <span class="price">₱${formatPrice(Math.max(0, total))}</span>
    </div>
    <br/>`;
}

async function applyPromo() {
  const code = document.getElementById('promoInput').value.trim();
  const msgEl = document.getElementById('promoMsg');
  if (!code) return;
  if (!checkoutCartData) return;

  const res = await api('/api/orders/validate-promo', 'POST', {
    code,
    subtotal: checkoutCartData.total
  });

  if (res.valid) {
    promoData = res;
    msgEl.textContent = res.message;
    msgEl.className = 'promo-msg success';
    renderCheckoutSummary(checkoutCartData);
  } else {
    promoData = null;
    msgEl.textContent = res.message;
    msgEl.className = 'promo-msg error';
  }
}

async function placeOrder() {
  if (!selectedAddressId) { showToast('Please select a shipping address.', 'error'); return; }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true; btn.textContent = 'Placing order…';

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  const notes = document.getElementById('orderNotes').value;

  const body = {
    address_id: selectedAddressId,
    payment_method: paymentMethod,
    notes: notes || undefined,
    promo_code: promoData?.valid ? document.getElementById('promoInput').value.trim() : undefined
  };

  const res = await api('/api/orders/checkout', 'POST', body);
  btn.disabled = false; btn.textContent = 'Place Order';

  if (res.success) {
    updateCartBadge(0);
    updateOrdersBadge();
    promoData = null;
    document.getElementById('successOrderId').textContent = `Order #${res.order_id}`;
    document.getElementById('orderSuccessOverlay').classList.remove('hidden');
  } else {
    showToast(res.message, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════════════════ */
async function loadOrders() {
  const el = document.getElementById('ordersList');
  el.innerHTML = '<div class="spinner"></div>';
  const res = await api('/api/orders');
  if (!res.success) return;

  updateOrdersBadge(res.orders);

  if (!res.orders.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div style="font-size:3rem">📦</div>
        <h3>No orders yet</h3>
        <p>Your order history will appear here.</p>
        <br/><button class="btn-primary" onclick="navigate('products')">Shop Now</button>
      </div>`;
    return;
  }

  el.innerHTML = res.orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${o.order_id}</div>
          <div class="order-date">${formatDate(o.placed_at)}</div>
        </div>
        <span class="status-badge status-${o.order_status}">${o.order_status.replace('_', ' ')}</span>
      </div>
      <div class="order-meta">
        <span>${o.item_count} item(s)</span>
        <span>Payment: <strong>${o.payment_method}</strong></span>
        <span class="order-amount">₱${formatPrice(o.total_amount)}</span>
      </div>
      <div class="order-actions">
        <button class="btn-ghost btn-sm" onclick="viewOrderDetail(${o.order_id})">View Details</button>
        ${['PENDING', 'TO_SHIP'].includes(o.order_status)
          ? `<button class="btn-danger btn-sm" onclick="cancelOrder(${o.order_id})">Cancel Order</button>`
          : ''}
      </div>
    </div>`).join('');
}

function viewOrderDetail(id) {
  navigate('order-detail', { id });
}

async function loadOrderDetail(id) {
  const el = document.getElementById('orderDetailContent');
  el.innerHTML = '<div class="spinner"></div>';
  const res = await api(`/api/orders/${id}`);
  if (!res.success) { el.innerHTML = '<div class="empty-state"><h3>Order not found.</h3></div>'; return; }
  const o = res.order;

  const steps = ['PENDING', 'TO_SHIP', 'SHIPPING', 'COMPLETED'];
  const currIdx = steps.indexOf(o.order_status);
  const stepLabels = {
    PENDING:   ['Order Placed', 'Your order has been received.'],
    TO_SHIP:   ['Processing', 'Your order is being packed.'],
    SHIPPING:  ['Shipped', `On the way${o.tracking_number ? ' · Tracking: ' + o.tracking_number : ''}`],
    COMPLETED: ['Delivered', 'Your order has been delivered!']
  };

  el.innerHTML = `
    <div class="order-detail-page">
      <button class="product-detail-back" onclick="navigate('orders')">← My Orders</button>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
        <div>
          <h2 style="font-family:var(--font-head);font-size:2rem;color:var(--white)">Order #${o.order_id}</h2>
          <p style="color:var(--muted)">${formatDate(o.placed_at)}</p>
        </div>
        <span class="status-badge status-${o.order_status}">${o.order_status.replace('_', ' ')}</span>
      </div>

      ${o.order_status !== 'CANCELLED' ? `
      <div class="checkout-card">
        <h3>Tracking</h3>
        <div class="tracking-timeline">
          ${steps.map((s, i) => `
            <div class="timeline-step">
              <div class="timeline-dot ${i <= currIdx ? 'done' : ''}">
                ${i <= currIdx ? '✓' : i + 1}
              </div>
              <div class="timeline-content">
                <div class="timeline-label">${stepLabels[s][0]}</div>
                <div class="timeline-desc">${i <= currIdx ? stepLabels[s][1] : 'Pending'}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>` : `<div class="checkout-card"><span class="status-badge status-CANCELLED">Order Cancelled</span></div>`}

      <div class="checkout-card">
        <h3>Items Ordered</h3>
        <table class="order-items-table">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${o.items.map(i => `
              <tr>
                <td>${esc(i.product_name)}</td>
                <td>${i.quantity}</td>
                <td>₱${formatPrice(i.unit_price)}</td>
                <td>₱${formatPrice(i.line_total)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="text-align:right;margin-top:1rem">
          ${o.discount_amount > 0 ? `<div style="color:var(--success);margin-bottom:.4rem">Discount: −₱${formatPrice(o.discount_amount)} (${o.promo_code})</div>` : ''}
          <strong style="font-size:1.1rem;color:var(--gold-light)">Total: ₱${formatPrice(o.total_amount)}</strong>
        </div>
      </div>

      <div class="checkout-card">
        <h3>Shipping Details</h3>
        <p style="color:var(--muted);font-size:.9rem">${esc(o.shipping_address || '')}</p>
        <p style="color:var(--muted);font-size:.9rem;margin-top:.5rem">Payment: ${o.payment_method}</p>
      </div>

      ${['PENDING', 'TO_SHIP'].includes(o.order_status)
        ? `<button class="btn-danger" onclick="cancelOrder(${o.order_id}, true)">Cancel This Order</button>`
        : ''}
    </div>`;
}

async function cancelOrder(id, fromDetail = false) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  const res = await api(`/api/orders/${id}/cancel`, 'POST');
  if (res.success) {
    showToast('Order cancelled. Stock has been restored.', 'success');
    updateOrdersBadge();
    if (fromDetail) navigate('orders');
    else loadOrders();
  } else { showToast(res.message, 'error'); }
}

async function updateOrdersBadge(orders) {
  if (!currentUser) return;
  const data = orders || (await api('/api/orders')).orders || [];
  const active = data.filter(o => ['PENDING','TO_SHIP','SHIPPING'].includes(o.order_status)).length;
  const badge = document.getElementById('ordersBadge');
  badge.textContent = active;
  badge.classList.toggle('hidden', active === 0);
}

/* ═══════════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════════ */
async function loadProfile() {
  const res = await api('/api/user/profile');
  if (!res.success) return;
  const u = res.user;
  document.getElementById('pFirstName').value = u.first_name;
  document.getElementById('pLastName').value  = u.last_name;
  document.getElementById('pEmail').value     = u.email;
  document.getElementById('pPhone').value     = u.phone || '';
  loadAddressList();
}

function switchProfileTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  event.target.classList.add('active');
  if (tab === 'addresses') loadAddressList();
}

async function updateProfile(e) {
  e.preventDefault();
  const res = await api('/api/user/profile', 'PUT', {
    first_name: document.getElementById('pFirstName').value,
    last_name:  document.getElementById('pLastName').value,
    phone:      document.getElementById('pPhone').value
  });
  showToast(res.message || (res.success ? 'Profile updated.' : 'Update failed.'), res.success ? 'success' : 'error');
  if (res.success) await checkAuth();
}

async function updatePassword(e) {
  e.preventDefault();
  const newPass  = document.getElementById('newPass').value;
  const confPass = document.getElementById('confPass').value;
  if (newPass !== confPass) { showToast('Passwords do not match.', 'error'); return; }
  const res = await api('/api/user/password', 'PUT', {
    currentPassword: document.getElementById('currPass').value,
    newPassword: newPass
  });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) document.getElementById('passwordForm').reset();
}

async function loadAddressList() {
  const res = await api('/api/user/addresses');
  const el = document.getElementById('addressList');
  if (!res.addresses?.length) {
    el.innerHTML = '<p style="color:var(--muted);margin-bottom:1rem">No saved addresses.</p>';
    return;
  }
  el.innerHTML = res.addresses.map(a => `
    <div class="address-card">
      <div class="address-card-header">
        <div>
          <div class="address-card-name">${esc(a.full_name)} ${a.is_default ? '<span class="addr-default-badge">Default</span>' : ''}</div>
          <div class="address-card-text">
            ${esc(a.street)}${a.barangay ? ', ' + esc(a.barangay) : ''}<br/>
            ${esc(a.city)}, ${esc(a.province)} ${a.zip_code || ''}
            ${a.phone ? '<br/>' + esc(a.phone) : ''}
          </div>
        </div>
      </div>
      <div class="address-card-actions">
        <button class="btn-ghost btn-sm" onclick="showAddressModal(${a.address_id})">Edit</button>
        ${!a.is_default ? `<button class="btn-ghost btn-sm" onclick="setDefaultAddress(${a.address_id})">Set Default</button>` : ''}
        <button class="btn-danger btn-sm" onclick="deleteAddress(${a.address_id})">Delete</button>
      </div>
    </div>`).join('');
}

async function setDefaultAddress(id) {
  const res = await api(`/api/user/addresses/${id}/default`, 'PUT');
  if (res.success) { showToast('Default address updated.', 'success'); loadAddressList(); }
}

async function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  const res = await api(`/api/user/addresses/${id}`, 'DELETE');
  if (res.success) { showToast('Address removed.', 'success'); loadAddressList(); }
}

function showAddressModal(id = null) {
  const isEdit = !!id;
  const fill = async () => {
    if (isEdit) {
      const res = await api('/api/user/addresses');
      const a = res.addresses.find(x => x.address_id === id);
      if (a) {
        document.getElementById('addrFullName').value  = a.full_name;
        document.getElementById('addrPhone').value     = a.phone || '';
        document.getElementById('addrStreet').value    = a.street;
        document.getElementById('addrBarangay').value  = a.barangay || '';
        document.getElementById('addrCity').value      = a.city;
        document.getElementById('addrProvince').value  = a.province;
        document.getElementById('addrZip').value       = a.zip_code || '';
        document.getElementById('addrDefault').checked = a.is_default === 1;
      }
    }
  };

  document.getElementById('modalContent').innerHTML = `
    <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Address</h3>
    <form id="addrForm" onsubmit="saveAddress(event, ${id})">
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><input id="addrFullName" required /></div>
        <div class="form-group"><label>Phone</label><input id="addrPhone" /></div>
      </div>
      <div class="form-group"><label>Street</label><input id="addrStreet" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Barangay</label><input id="addrBarangay" /></div>
        <div class="form-group"><label>City</label><input id="addrCity" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Province</label><input id="addrProvince" required /></div>
        <div class="form-group"><label>ZIP Code</label><input id="addrZip" /></div>
      </div>
      <label class="checkbox-label" style="margin-bottom:1.25rem">
        <input type="checkbox" id="addrDefault" /> Set as default address
      </label>
      <div style="display:flex;gap:.75rem">
        <button type="submit" class="btn-primary">Save Address</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </form>`;
  document.getElementById('modalOverlay').classList.remove('hidden');
  fill();
}

async function saveAddress(e, id) {
  e.preventDefault();
  const body = {
    full_name:  document.getElementById('addrFullName').value,
    phone:      document.getElementById('addrPhone').value,
    street:     document.getElementById('addrStreet').value,
    barangay:   document.getElementById('addrBarangay').value,
    city:       document.getElementById('addrCity').value,
    province:   document.getElementById('addrProvince').value,
    zip_code:   document.getElementById('addrZip').value,
    is_default: document.getElementById('addrDefault').checked ? 1 : 0
  };
  const res = id
    ? await api(`/api/user/addresses/${id}`, 'PUT', body)
    : await api('/api/user/addresses', 'POST', body);
  if (res.success) {
    closeModal();
    showToast('Address saved.', 'success');
    loadAddressList();
  } else { showToast(res.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════════════════════ */
async function loadAdmin() {
  loadAdminDashboard();
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.admin-nav-item').forEach(a => a.classList.remove('active'));
  document.getElementById(`admin-tab-${tab}`).classList.remove('hidden');
  event.currentTarget.classList.add('active');

  switch (tab) {
    case 'dashboard': loadAdminDashboard(); break;
    case 'orders':    loadAdminOrders(); break;
    case 'products':  loadAdminProducts(); break;
    case 'users':     loadAdminUsers(); break;
  }
}

async function loadAdminDashboard() {
  const res = await api('/api/admin/stats');
  if (!res.success) return;
  const s = res.stats;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">₱${formatPrice(s.revenue)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${s.orders}</div></div>
    <div class="stat-card"><div class="stat-label">Customers</div><div class="stat-value">${s.users}</div></div>
    <div class="stat-card"><div class="stat-label">Active Products</div><div class="stat-value">${s.products}</div></div>`;

  const tbody = document.querySelector('#recentOrdersTable tbody');
  tbody.innerHTML = res.recentOrders.map(o => `
    <tr>
      <td>#${o.order_id}</td>
      <td>${esc(o.name)}</td>
      <td>₱${formatPrice(o.total_amount)}</td>
      <td><span class="status-badge status-${o.order_status}">${o.order_status}</span></td>
      <td>${formatDate(o.placed_at)}</td>
    </tr>`).join('');
}

async function loadAdminOrders() {
  const res = await api('/api/orders/admin/all');
  if (!res.success) return;
  const tbody = document.querySelector('#adminOrdersTable tbody');
  tbody.innerHTML = res.orders.map(o => `
    <tr>
      <td>#${o.order_id}</td>
      <td>${esc(o.customer_name)}<br/><small style="color:var(--muted)">${esc(o.customer_email)}</small></td>
      <td>₱${formatPrice(o.total_amount)}</td>
      <td><span class="status-badge status-${o.order_status}">${o.order_status.replace('_',' ')}</span></td>
      <td>${o.payment_method}</td>
      <td>${formatDate(o.placed_at)}</td>
      <td>
        ${getAdminOrderActions(o)}
      </td>
    </tr>`).join('');
}

function getAdminOrderActions(o) {
  const transitions = {
    PENDING:  ['TO_SHIP'],
    TO_SHIP:  ['SHIPPING'],
    SHIPPING: ['COMPLETED']
  };
  const nexts = transitions[o.order_status] || [];
  return [
    ...nexts.map(s => `<button class="btn-ghost btn-sm" onclick="adminUpdateStatus(${o.order_id},'${s}')" style="margin:.2rem">${s.replace('_',' ')}</button>`),
    ['PENDING','TO_SHIP','SHIPPING'].includes(o.order_status)
      ? `<button class="btn-danger btn-sm" onclick="adminUpdateStatus(${o.order_id},'CANCELLED')" style="margin:.2rem">Cancel</button>`
      : ''
  ].join('');
}

async function adminUpdateStatus(orderId, status) {
  let tracking_number;
  if (status === 'SHIPPING') {
    tracking_number = prompt('Enter tracking number:');
    if (!tracking_number) return;
  }
  const res = await api(`/api/orders/${orderId}/status`, 'PUT', { status, tracking_number });
  if (res.success) { showToast('Status updated.', 'success'); loadAdminOrders(); }
  else showToast(res.message, 'error');
}

async function loadAdminProducts() {
  const res = await api('/api/products');
  if (!res.success) return;
  const tbody = document.querySelector('#adminProductsTable tbody');
  tbody.innerHTML = res.products.map(p => `
    <tr>
      <td><img class="img-thumb" src="${p.image_url || ''}" alt="" /></td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.category_name || '-')}</td>
      <td>₱${formatPrice(p.price)}</td>
      <td>${p.stock_quantity === 0 ? '<span style="color:var(--error)">Out</span>' : p.stock_quantity}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="showProductModal(${p.product_id})" style="margin:.2rem">Edit</button>
        <button class="btn-danger btn-sm" onclick="deleteProduct(${p.product_id})" style="margin:.2rem">Delete</button>
      </td>
    </tr>`).join('');
}

async function showProductModal(id = null) {
  const catRes = await api('/api/products/categories');
  const cats = catRes.categories || [];
  let p = {};
  if (id) {
    const res = await api(`/api/products/${id}`);
    if (res.success) p = res.product;
  }

  document.getElementById('modalContent').innerHTML = `
    <h3 class="modal-title">${id ? 'Edit' : 'Add'} Product</h3>
    <form id="productForm" onsubmit="saveProduct(event, ${id || 'null'})">
      <div class="form-group">
        <label>Category</label>
        <select id="prodCat">
          ${cats.map(c => `<option value="${c.category_id}" ${p.category_id === c.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Name</label><input id="prodName" value="${esc(p.name || '')}" required /></div>
      <div class="form-group"><label>Description</label><textarea id="prodDesc" rows="3">${esc(p.description || '')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Price (₱)</label><input type="number" id="prodPrice" value="${p.price || ''}" required min="0" step="0.01" /></div>
        <div class="form-group"><label>Stock</label><input type="number" id="prodStock" value="${p.stock_quantity ?? ''}" required min="0" /></div>
      </div>
      <div class="form-group"><label>Image URL</label><input id="prodImg" value="${esc(p.image_url || '')}" placeholder="https://..." /></div>
      <div style="display:flex;gap:.75rem;margin-top:1rem">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </form>`;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

async function saveProduct(e, id) {
  e.preventDefault();
  const body = {
    category_id:    document.getElementById('prodCat').value,
    name:           document.getElementById('prodName').value,
    description:    document.getElementById('prodDesc').value,
    price:          document.getElementById('prodPrice').value,
    stock_quantity: document.getElementById('prodStock').value,
    image_url:      document.getElementById('prodImg').value
  };
  const res = id
    ? await api(`/api/products/${id}`, 'PUT', body)
    : await api('/api/products', 'POST', body);
  if (res.success) {
    closeModal(); showToast('Product saved.', 'success'); loadAdminProducts();
  } else { showToast(res.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Deactivate this product?')) return;
  const res = await api(`/api/products/${id}`, 'DELETE');
  if (res.success) { showToast('Product removed.', 'success'); loadAdminProducts(); }
}

async function loadAdminUsers() {
  const res = await api('/api/admin/users');
  if (!res.success) return;
  const tbody = document.querySelector('#adminUsersTable tbody');
  tbody.innerHTML = res.users.map(u => `
    <tr>
      <td>${esc(u.first_name)} ${esc(u.last_name)}</td>
      <td style="color:var(--muted)">${esc(u.email)}</td>
      <td><span class="status-badge ${u.role === 'ADMIN' ? 'status-COMPLETED' : 'status-TO_SHIP'}">${u.role}</span></td>
      <td><span class="status-badge ${u.is_active ? 'status-COMPLETED' : 'status-CANCELLED'}">${u.is_active ? 'Active' : 'Banned'}</span></td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        ${u.role !== 'ADMIN' ? `
          ${u.is_active
            ? `<button class="btn-danger btn-sm" onclick="adminBanUser(${u.user_id})" style="margin:.2rem">Ban</button>`
            : `<button class="btn-ghost btn-sm" onclick="adminUnbanUser(${u.user_id})" style="margin:.2rem">Unban</button>`}
          <button class="btn-ghost btn-sm" onclick="adminPromote(${u.user_id})" style="margin:.2rem">Promote</button>
        ` : '—'}
      </td>
    </tr>`).join('');
}

async function adminBanUser(id) {
  if (!confirm('Ban this user?')) return;
  const res = await api(`/api/admin/users/${id}/ban`, 'PUT');
  if (res.success) { showToast('User banned.', 'success'); loadAdminUsers(); }
  else showToast(res.message, 'error');
}
async function adminUnbanUser(id) {
  const res = await api(`/api/admin/users/${id}/unban`, 'PUT');
  if (res.success) { showToast('User unbanned.', 'success'); loadAdminUsers(); }
}
async function adminPromote(id) {
  if (!confirm('Promote this user to Admin?')) return;
  const res = await api(`/api/admin/users/${id}/promote`, 'PUT');
  if (res.success) { showToast('User promoted.', 'success'); loadAdminUsers(); }
}

/* ═══════════════════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════════════════ */
function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

/* ═══════════════════════════════════════════════════════════
   API HELPER
═══════════════════════════════════════════════════════════ */
async function api(url, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: 'Network error.' };
  }
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function formatPrice(n) {
  return parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function starRating(r) {
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

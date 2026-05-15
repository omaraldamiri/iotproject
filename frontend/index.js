/* ═══════════════════════════════════════════════════════
   IoT Smart Cart System — Shop Page JavaScript
   ═══════════════════════════════════════════════════════ */

const PI_STATIC_IP = "10.87.49.189";
const API_BASE = `http://${PI_STATIC_IP}:8000`;

let cart = [];
let productsMap = {};

// ── Cart State Management ──────────────────────────────

function loadCart() {
  try {
    const stored = localStorage.getItem("smartcart");
    cart = stored ? JSON.parse(stored) : [];
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem("smartcart", JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const product = productsMap[productId];
  if (!product || product.stock <= 0) return;

  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyInput.value) || 1;

  if (quantity <= 0) return;
  if (quantity > product.stock) {
    showToast(`Only ${product.stock} units of ${product.name} available`, "error");
    return;
  }

  const existing = cart.find((c) => c.product_id === productId);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) {
      showToast(`Cart would exceed stock for ${product.name} (max ${product.stock})`, "error");
      return;
    }
    existing.quantity = newQty;
  } else {
    cart.push({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image,
      location: product.location,
    });
  }

  saveCart();
  renderCartItems();
  showToast(`Added ${quantity}x ${product.name} to cart`, "success");

  qtyInput.value = 1;
}

function removeFromCart(productId) {
  cart = cart.filter((c) => c.product_id !== productId);
  saveCart();
  renderCartItems();
}

function updateCartQty(productId, delta) {
  const item = cart.find((c) => c.product_id === productId);
  if (!item) return;

  const product = productsMap[productId];
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (product && newQty > product.stock) {
    showToast(`Only ${product.stock} units of ${item.product_name} available`, "error");
    return;
  }

  item.quantity = newQty;
  saveCart();
  renderCartItems();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCartItems();
}

function getCartTotalItems() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotalPrice() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ── Cart UI ────────────────────────────────────────────

function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  const count = getCartTotalItems();
  if (count > 0) {
    badge.style.display = "flex";
    badge.textContent = count;
  } else {
    badge.style.display = "none";
  }
}

function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const isOpen = drawer.classList.contains("open");

  if (isOpen) {
    drawer.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  } else {
    renderCartItems();
    drawer.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function renderCartItems() {
  const emptyEl = document.getElementById("cart-empty");
  const itemsEl = document.getElementById("cart-items");
  const footerEl = document.getElementById("cart-drawer-footer");

  if (cart.length === 0) {
    emptyEl.style.display = "flex";
    itemsEl.style.display = "none";
    footerEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  itemsEl.style.display = "flex";
  footerEl.style.display = "flex";

  itemsEl.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" id="cart-item-${item.product_id}">
      <img src="images/${item.image}" alt="${item.product_name}" class="cart-item-image" />
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.product_name}</h4>
        <div class="cart-item-price">$${item.price.toFixed(2)} <span>/ unit</span></div>
        <div class="cart-item-controls">
          <div class="cart-qty-selector">
            <button class="cart-qty-btn" onclick="updateCartQty(${item.product_id}, -1)">−</button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="updateCartQty(${item.product_id}, 1)">+</button>
          </div>
          <button class="cart-remove-btn" onclick="removeFromCart(${item.product_id})">Remove</button>
        </div>
      </div>
      <div class="cart-item-line-total">$${(item.price * item.quantity).toFixed(2)}</div>
    </div>`
    )
    .join("");

  document.getElementById("cart-total-items").textContent = getCartTotalItems();
  document.getElementById("cart-total-price").textContent = `$${getCartTotalPrice().toFixed(2)}`;
}

// ── Checkout ───────────────────────────────────────────

async function checkout() {
  if (cart.length === 0) {
    showToast("Cart is empty", "error");
    return;
  }

  const nameInput = document.getElementById("checkout-name");
  const customerName = nameInput.value.trim() || "Guest";
  const btn = document.getElementById("checkout-btn");

  btn.disabled = true;
  btn.textContent = "PROCESSING...";

  const payload = {
    items: cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    customer_name: customerName,
  };

  try {
    const res = await fetch(`${API_BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.detail || "Checkout failed", "error");
      btn.disabled = false;
      btn.textContent = "CHECKOUT";
      return;
    }

    const order = data.order;
    const itemSummary = order.items.map((i) => `${i.quantity}x ${i.product_name}`).join(", ");
    showToast(`✅ Order #${order.id}: ${itemSummary} — $${order.total_price.toFixed(2)}`, "success");

    clearCart();
    nameInput.value = "";
    toggleCart();
    loadProducts();
  } catch (err) {
    showToast("Connection error — is the backend running?", "error");
    btn.disabled = false;
    btn.textContent = "CHECKOUT";
  }
}

// ── Fetch & Render Products ──────────────────────────────

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("API unavailable");
    const products = await res.json();
    grid.innerHTML = "";
    productsMap = {};
    products.forEach((p) => {
      productsMap[p.id] = p;
      grid.appendChild(createProductCard(p));
    });
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
        <h2 style="font-family:var(--font-display);color:var(--accent-amber);margin-bottom:8px;">Backend Offline</h2>
        <p style="color:var(--text-secondary);">Start your FastAPI server: <code style="color:var(--accent-cyan);">uvicorn main:app --reload</code></p>
        <button onclick="loadProducts()" style="margin-top:20px;padding:10px 28px;background:var(--gradient-btn);border:none;border-radius:var(--radius-md);color:#fff;cursor:pointer;font-weight:600;">Retry</button>
      </div>`;
  }
}

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.id = `product-card-${product.id}`;

  const stockClass = product.stock <= 0 ? "out" : product.stock <= 3 ? "low" : "";
  const badgeClass = product.stock <= 0 ? "out-of-stock" : product.stock <= 3 ? "low-stock" : "in-stock";
  const badgeText = product.stock <= 0 ? "Out of Stock" : product.stock <= 3 ? `Only ${product.stock} left` : "In Stock";
  const isDisabled = product.stock <= 0;

  const inCart = cart.find((c) => c.product_id === product.id);
  const cartLabel = inCart ? `(${inCart.quantity} in cart)` : "";

  card.innerHTML = `
    <div class="product-image-wrapper">
      <img src="images/${product.image}" alt="${product.name}" loading="lazy" />
      <span class="product-badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="product-info">
      <h3 class="product-name">${product.name}</h3>
      <div class="product-price">$${product.price.toFixed(2)} <span>/ unit</span></div>
      <div class="product-stock">
        <span class="stock-dot ${stockClass}"></span>
        <span id="stock-count-${product.id}">${product.stock} units available</span>
      </div>
      <div class="product-location">
        <span class="location-icon">📍</span>
        <span>${product.location}</span>
      </div>
      <div class="order-controls">
        <div class="quantity-selector">
          <button class="qty-btn" onclick="changeQty(${product.id},-1)" id="qty-minus-${product.id}">−</button>
          <input type="number" class="qty-input" id="qty-${product.id}" value="1" min="1" max="${product.stock}" />
          <button class="qty-btn" onclick="changeQty(${product.id},1)" id="qty-plus-${product.id}">+</button>
        </div>
        <button class="add-to-cart-btn" id="add-btn-${product.id}" onclick="addToCart(${product.id})" ${isDisabled ? "disabled" : ""}>
          ${isDisabled ? "SOLD OUT" : "ADD TO CART"}
        </button>
      </div>
      ${cartLabel ? `<div class="cart-status">${cartLabel}</div>` : ""}
    </div>`;
  return card;
}

// ── Quantity Controls ────────────────────────────────────

function changeQty(productId, delta) {
  const input = document.getElementById(`qty-${productId}`);
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(parseInt(input.max) || 99, val + delta));
  input.value = val;
}

// ── Toast Notifications ──────────────────────────────────

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const icons = { success: "✅", error: "❌", warning: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Init ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  updateCartBadge();
  loadProducts();
});

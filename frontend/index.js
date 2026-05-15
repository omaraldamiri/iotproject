/* ═══════════════════════════════════════════════════════
   IoT Smart Order System — Order Page JavaScript
   ═══════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:8000";

// ── Fetch & Render Products ──────────────────────────────

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("API unavailable");
    const products = await res.json();
    grid.innerHTML = "";
    products.forEach((p) => grid.appendChild(createProductCard(p)));
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
      <div class="customer-input-wrapper">
        <input type="text" class="customer-input" id="customer-${product.id}" placeholder="Your name (optional)" />
      </div>
      <div class="order-controls">
        <div class="quantity-selector">
          <button class="qty-btn" onclick="changeQty(${product.id},-1)" id="qty-minus-${product.id}">−</button>
          <input type="number" class="qty-input" id="qty-${product.id}" value="1" min="1" max="${product.stock}" />
          <button class="qty-btn" onclick="changeQty(${product.id},1)" id="qty-plus-${product.id}">+</button>
        </div>
        <button class="order-btn" id="order-btn-${product.id}" onclick="placeOrder(${product.id})" ${isDisabled ? "disabled" : ""}>
          ${isDisabled ? "SOLD OUT" : "ORDER NOW"}
        </button>
      </div>
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

// ── Place Order ──────────────────────────────────────────

async function placeOrder(productId) {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const nameInput = document.getElementById(`customer-${productId}`);
  const btn = document.getElementById(`order-btn-${productId}`);
  const quantity = parseInt(qtyInput.value) || 1;
  const customerName = nameInput.value.trim() || "Guest";

  btn.disabled = true;
  btn.textContent = "ORDERING...";

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity, customer_name: customerName }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.detail || "Order failed", "error");
      btn.disabled = false;
      btn.textContent = "ORDER NOW";
      return;
    }

    showToast(`✅ Ordered ${quantity}x ${data.order.product_name} — $${data.order.total_price}`, "success");
    qtyInput.value = 1;
    nameInput.value = "";
    loadProducts(); // refresh stock
  } catch (err) {
    showToast("Connection error — is the backend running?", "error");
    btn.disabled = false;
    btn.textContent = "ORDER NOW";
  }
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
document.addEventListener("DOMContentLoaded", loadProducts);

/* ═══════════════════════════════════════════════════════
   IoT Smart Cart Dashboard — JavaScript
   ═══════════════════════════════════════════════════════ */

const PI_STATIC_IP = "10.87.49.189";
const API_BASE = `http://${PI_STATIC_IP}:8000`;

let ordersChart = null;
let revenueChart = null;

// ── Chart.js Global Config ───────────────────────────────

Chart.defaults.color = "#94a3b8";
Chart.defaults.font.family = "'Inter', sans-serif";

const CHART_COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6"];
const CHART_BG = ["rgba(34,211,238,0.2)", "rgba(59,130,246,0.2)", "rgba(139,92,246,0.2)"];

// ── Load Everything ──────────────────────────────────────

async function loadDashboard() {
  try {
    const [statsRes, ordersRes, productsRes] = await Promise.all([
      fetch(`${API_BASE}/stats`),
      fetch(`${API_BASE}/orders`),
      fetch(`${API_BASE}/products`),
    ]);

    if (!statsRes.ok || !ordersRes.ok || !productsRes.ok) throw new Error("API error");

    const stats = await statsRes.json();
    const orders = await ordersRes.json();
    const products = await productsRes.json();

    updateKPIs(stats, products);
    updateAlerts(stats);
    updateOrdersChart(stats);
    updateRevenueChart(stats);
    updateStockBars(products);
    updateOrdersTable(orders);
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

// ── KPI Cards ────────────────────────────────────────────

function updateKPIs(stats, products) {
  animateValue("kpi-val-orders", stats.total_orders);
  document.getElementById("kpi-val-revenue").textContent = "$" + stats.total_revenue.toFixed(2);

  if (stats.most_popular) {
    document.getElementById("kpi-val-popular").textContent = stats.most_popular.product_name;
  } else {
    document.getElementById("kpi-val-popular").textContent = "—";
  }

  const outCount = stats.out_of_stock.length;
  const stockEl = document.getElementById("kpi-val-stock");
  if (outCount > 0) {
    stockEl.textContent = outCount + " Empty";
    stockEl.style.color = "#ef4444";
  } else if (stats.low_stock.length > 0) {
    stockEl.textContent = stats.low_stock.length + " Low";
    stockEl.style.color = "#f59e0b";
  } else {
    stockEl.textContent = "All Good";
    stockEl.style.color = "#10b981";
  }
}

function animateValue(elementId, target) {
  const el = document.getElementById(elementId);
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  const duration = 600;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + (target - current) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Alerts ───────────────────────────────────────────────

function updateAlerts(stats) {
  const banner = document.getElementById("alert-banner");
  const msg = document.getElementById("alert-message");

  const alerts = [];

  stats.out_of_stock.forEach((p) => {
    alerts.push(`<strong>${p.product_name}</strong> is OUT OF STOCK!`);
  });

  stats.low_stock.forEach((p) => {
    alerts.push(`<strong>${p.product_name}</strong> has only <strong>${p.remaining}</strong> units left.`);
  });

  if (alerts.length > 0) {
    msg.innerHTML = alerts.join(" &nbsp;|&nbsp; ");
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}

// ── Orders Chart ─────────────────────────────────────────

function updateOrdersChart(stats) {
  const ctx = document.getElementById("orders-chart").getContext("2d");
  const labels = stats.per_product.map((p) => p.product_name);
  const data = stats.per_product.map((p) => p.total_ordered);

  if (ordersChart) {
    ordersChart.data.labels = labels;
    ordersChart.data.datasets[0].data = data;
    ordersChart.update("none");
    return;
  }

  ordersChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Units Ordered",
        data,
        backgroundColor: CHART_BG,
        borderColor: CHART_COLORS,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { color: "rgba(99,179,237,0.06)" },
          ticks: { font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(99,179,237,0.06)" },
          ticks: { stepSize: 1, font: { size: 11 } },
        },
      },
    },
  });
}

// ── Revenue Chart ────────────────────────────────────────

function updateRevenueChart(stats) {
  const ctx = document.getElementById("revenue-chart").getContext("2d");
  const labels = stats.per_product.map((p) => p.product_name);
  const data = stats.per_product.map((p) => p.revenue);

  if (revenueChart) {
    revenueChart.data.labels = labels;
    revenueChart.data.datasets[0].data = data;
    revenueChart.update("none");
    return;
  }

  revenueChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS,
        borderColor: "rgba(10,14,26,0.8)",
        borderWidth: 3,
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
        },
      },
    },
  });
}

// ── Stock Bars ───────────────────────────────────────────

function updateStockBars(products) {
  const container = document.getElementById("stock-bars");
  const maxStock = 10;

  container.innerHTML = products.map((p) => {
    const pct = Math.round((p.stock / maxStock) * 100);
    const colorClass = p.stock <= 0 ? "red" : p.stock <= 3 ? "amber" : "green";
    return `
      <div class="stock-item">
        <div class="stock-item-header">
          <span class="stock-item-name">${p.name}</span>
          <span class="stock-item-count">${p.stock} / ${maxStock}</span>
        </div>
        <div class="stock-bar-track">
          <div class="stock-bar-fill ${colorClass}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

// ── Orders Table (Multi-Item with Expandable Rows) ───────

function updateOrdersTable(orders) {
  const tbody = document.getElementById("orders-tbody");

  if (orders.length === 0) {
    tbody.innerHTML = '<tr class="order-header-row"><td colspan="6" class="empty-row">No orders yet — go place some!</td></tr>';
    return;
  }

  let html = "";
  orders.slice(0, 20).forEach((o) => {
    const time = new Date(o.timestamp).toLocaleString();
    const itemCount = o.items ? o.items.length : 0;
    const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;

    html += `
      <tr class="order-header-row" onclick="toggleOrderRow(${o.id})">
        <td class="order-id-cell">#${o.id}</td>
        <td>${o.customer_name}</td>
        <td class="order-items-summary">${itemLabel}</td>
        <td>${o.total_items || 0}</td>
        <td class="order-total-cell">$${o.total_price.toFixed(2)}</td>
        <td class="order-time-cell">${time}</td>
      </tr>`;

    if (o.items && o.items.length > 0) {
      html += `
        <tr class="order-detail-row" id="order-detail-${o.id}" style="display:none;">
          <td colspan="6">
            <div class="order-detail-inner">
              <table class="order-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${o.items.map((item) => `
                    <tr>
                      <td class="detail-product">
                        <img src="images/${item.image}" alt="${item.product_name}" class="detail-product-img" />
                        ${item.product_name}
                      </td>
                      <td class="detail-location">📍 ${item.location}</td>
                      <td class="detail-qty">${item.quantity}</td>
                      <td class="detail-unit">$${item.unit_price.toFixed(2)}</td>
                      <td class="detail-line">$${item.line_total.toFixed(2)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </td>
        </tr>`;
    }
  });

  tbody.innerHTML = html;
}

function toggleOrderRow(orderId) {
  const detailRow = document.getElementById(`order-detail-${orderId}`);
  if (!detailRow) return;

  if (detailRow.style.display === "none") {
    detailRow.style.display = "";
    detailRow.style.animation = "detail-expand 0.3s ease-out";
  } else {
    detailRow.style.display = "none";
  }
}

// ── Init & Auto-Refresh ──────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  setInterval(loadDashboard, 10000);
});

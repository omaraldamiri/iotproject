import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Navbar from '../components/Navbar';
import '../dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = 'http://10.87.49.189:8000';
const CHART_COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6'];
const CHART_BG = ['rgba(34,211,238,0.2)', 'rgba(59,130,246,0.2)', 'rgba(139,92,246,0.2)'];

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const loadDashboard = async () => {
    try {
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/products`),
      ]);

      if (!statsRes.ok || !ordersRes.ok || !productsRes.ok) throw new Error('API error');

      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setStats(statsData);
      setOrders(ordersData);
      setProducts(productsData);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const ordersChartData = {
    labels: stats?.per_product.map((p) => p.product_name) || [],
    datasets: [
      {
        label: 'Units Ordered',
        data: stats?.per_product.map((p) => p.total_ordered) || [],
        backgroundColor: CHART_BG,
        borderColor: CHART_COLORS,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const revenueChartData = {
    labels: stats?.per_product.map((p) => p.product_name) || [],
    datasets: [
      {
        data: stats?.per_product.map((p) => p.revenue) || [],
        backgroundColor: CHART_COLORS,
        borderColor: 'rgba(10,14,26,0.8)',
        borderWidth: 3,
        hoverOffset: 10,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(99,179,237,0.06)' },
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(99,179,237,0.06)' },
        ticks: { stepSize: 1, font: { size: 11 } },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 20, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } },
      },
    },
  };

  const outCount = stats?.out_of_stock.length || 0;
  const lowCount = stats?.low_stock.length || 0;

  const alerts = [];
  if (stats) {
    stats.out_of_stock.forEach((p) => {
      alerts.push(`${p.product_name} is OUT OF STOCK!`);
    });
    stats.low_stock.forEach((p) => {
      alerts.push(`${p.product_name} has only ${p.remaining} units left.`);
    });
  }

  const maxStock = 10;

  return (
    <>
      <Navbar />
      <main className="page-container">
        <header className="page-header">
          <h1>ANALYTICS DASHBOARD</h1>
          <p>Real-time order analytics, stock monitoring, and product insights.</p>
        </header>

        {alerts.length > 0 && (
          <div className="alert-banner">
            <div className="alert-icon">🚨</div>
            <div className="alert-content">
              <strong>Stock Alert!</strong>
              <span dangerouslySetInnerHTML={{ __html: alerts.join(' &nbsp;|&nbsp; ') }}></span>
            </div>
          </div>
        )}

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">📦</div>
            <div className="kpi-data">
              <span className="kpi-value">{stats?.total_orders || 0}</span>
              <span className="kpi-label">Total Orders</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">💰</div>
            <div className="kpi-data">
              <span className="kpi-value">${stats?.total_revenue.toFixed(2) || '$0'}</span>
              <span className="kpi-label">Total Revenue</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🏆</div>
            <div className="kpi-data">
              <span className="kpi-value">{stats?.most_popular?.product_name || '—'}</span>
              <span className="kpi-label">Most Popular</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">📊</div>
            <div className="kpi-data">
              <span
                className="kpi-value"
                style={{ color: outCount > 0 ? '#ef4444' : lowCount > 0 ? '#f59e0b' : '#10b981' }}
              >
                {outCount > 0 ? `${outCount} Empty` : lowCount > 0 ? `${lowCount} Low` : 'All Good'}
              </span>
              <span className="kpi-label">Stock Status</span>
            </div>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h3 className="chart-title">Orders by Product</h3>
            <div className="chart-wrapper">
              <Bar data={ordersChartData} options={chartOptions} />
            </div>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Revenue by Product</h3>
            <div className="chart-wrapper">
              <Doughnut data={revenueChartData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        <div className="stock-section">
          <h3 className="section-title">Stock Levels</h3>
          <div className="stock-bars">
            {products.map((p) => {
              const pct = Math.round((p.stock / maxStock) * 100);
              const colorClass = p.stock <= 0 ? 'red' : p.stock <= 3 ? 'amber' : 'green';
              return (
                <div key={p.id} className="stock-item">
                  <div className="stock-item-header">
                    <span className="stock-item-name">{p.name}</span>
                    <span className="stock-item-count">{p.stock} / {maxStock}</span>
                  </div>
                  <div className="stock-bar-track">
                    <div className={`stock-bar-fill ${colorClass}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="orders-section">
          <h3 className="section-title">Recent Orders</h3>
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Qty</th>
                  <th>Total</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">No orders yet — go place some!</td>
                  </tr>
                ) : (
                  orders.slice(0, 20).map((o) => {
                    const time = new Date(o.timestamp).toLocaleString();
                    const itemCount = o.items ? o.items.length : 0;
                    const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

                    return (
                      <React.Fragment key={o.id}>
                        <tr className="order-header-row" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                          <td className="order-id-cell">#{o.id}</td>
                          <td>{o.customer_name}</td>
                          <td className="order-items-summary">{itemLabel}</td>
                          <td>{o.total_items || 0}</td>
                          <td className="order-total-cell">${o.total_price.toFixed(2)}</td>
                          <td className="order-time-cell">{time}</td>
                        </tr>
                        {o.items && o.items.length > 0 && expandedOrder === o.id && (
                          <tr className="order-detail-row">
                            <td colSpan="6">
                              <div className="order-detail-inner">
                                <table className="order-items-table">
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
                                    {o.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="detail-product">
                                          <img src={`/src/assets/images/${item.image}`} alt={item.product_name} className="detail-product-img" />
                                          {item.product_name}
                                        </td>
                                        <td className="detail-location">📍 {item.location}</td>
                                        <td className="detail-qty">{item.quantity}</td>
                                        <td className="detail-unit">${item.unit_price.toFixed(2)}</td>
                                        <td className="detail-line">${item.line_total.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="auto-refresh-note">
          <span className="refresh-dot"></span> Auto-refreshes every 10 seconds
        </div>
      </main>
    </>
  );
}

export default DashboardPage;

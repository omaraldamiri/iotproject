import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';
import ProductCard from '../components/ProductCard';
import { useToast } from '../components/Toast';

const API_BASE = 'http://raspberrypi:8000';

function ShopPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('smartcart');
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartcart', JSON.stringify(cart));
  }, [cart]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      setProducts(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      showToast('Backend offline — start your FastAPI server', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const addToCart = (productId, quantity) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    if (quantity <= 0 || quantity > product.stock) {
      showToast(`Only ${product.stock} units of ${product.name} available`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === productId);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          showToast(`Cart would exceed stock for ${product.name} (max ${product.stock})`, 'error');
          return prev;
        }
        return prev.map((c) =>
          c.product_id === productId ? { ...c, quantity: newQty } : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity,
          image: product.image,
          location: product.location,
        },
      ];
    });

    showToast(`Added ${quantity}x ${product.name} to cart`, 'success');
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) => {
      const item = prev.find((c) => c.product_id === productId);
      if (!item) return prev;

      const product = products.find((p) => p.id === productId);
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((c) => c.product_id !== productId);
      }

      if (product && newQty > product.stock) {
        showToast(`Only ${product.stock} units of ${item.product_name} available`, 'error');
        return prev;
      }

      return prev.map((c) =>
        c.product_id === productId ? { ...c, quantity: newQty } : c
      );
    });
  };

  const checkout = async (customerName) => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    const payload = {
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      customer_name: customerName || 'Guest',
    };

    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.detail || 'Checkout failed', 'error');
        return;
      }

      const order = data.order;
      const itemSummary = order.items
        .map((i) => `${i.quantity}x ${i.product_name}`)
        .join(', ');
      showToast(`✅ Order #${order.id}: ${itemSummary} — $${order.total_price.toFixed(2)}`, 'success');

      setCart([]);
      setCartOpen(false);
      loadProducts();
    } catch (err) {
      showToast('Connection error — is the backend running?', 'error');
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <Navbar cartCount={totalItems} onCartToggle={() => setCartOpen(!cartOpen)} />
      <main className="page-container">
        <header className="page-header">
          <h1>SMART DEVICES</h1>
          <p>Add items to your cart and checkout. The smart cart will navigate to collect them.</p>
        </header>
        <div className="product-grid">
          {loading
            ? [1, 2, 3].map((i) => <div key={i} className="product-card skeleton" style={{ height: 420 }}></div>)
            : products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartItem={cart.find((c) => c.product_id === product.id)}
                  onAddToCart={addToCart}
                />
              ))}
        </div>
      </main>
      <CartDrawer
        isOpen={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onUpdateQty={updateCartQty}
        onCheckout={checkout}
        totalItems={totalItems}
        totalPrice={totalPrice}
      />
    </>
  );
}

export default ShopPage;

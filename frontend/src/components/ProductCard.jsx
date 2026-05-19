import React, { useState } from 'react';

function ProductCard({ product, cartItem, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);

  const stockClass = product.stock <= 0 ? 'out' : product.stock <= 3 ? 'low' : '';
  const badgeClass = product.stock <= 0 ? 'out-of-stock' : product.stock <= 3 ? 'low-stock' : 'in-stock';
  const badgeText = product.stock <= 0 ? 'Out of Stock' : product.stock <= 3 ? `Only ${product.stock} left` : 'In Stock';
  const isDisabled = product.stock <= 0;

  const changeQty = (delta) => {
    setQuantity((prev) => Math.max(1, Math.min(product.stock, prev + delta)));
  };

  const handleAdd = () => {
    onAddToCart(product.id, quantity);
    setQuantity(1);
  };

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        <img src={`/src/assets/images/${product.image}`} alt={product.name} loading="lazy" />
        <span className={`product-badge ${badgeClass}`}>{badgeText}</span>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-price">
          ${product.price.toFixed(2)} <span>/ unit</span>
        </div>
        <div className="product-stock">
          <span className={`stock-dot ${stockClass}`}></span>
          <span>{product.stock} units available</span>
        </div>
        <div className="product-location">
          <span className="location-icon">📍</span>
          <span>{product.location}</span>
        </div>
        <div className="order-controls">
          <div className="quantity-selector">
            <button className="qty-btn" onClick={() => changeQty(-1)}>−</button>
            <input
              type="number"
              className="qty-input"
              value={quantity}
              min="1"
              max={product.stock}
              onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
            />
            <button className="qty-btn" onClick={() => changeQty(1)}>+</button>
          </div>
          <button
            className="add-to-cart-btn"
            onClick={handleAdd}
            disabled={isDisabled}
          >
            {isDisabled ? 'SOLD OUT' : 'ADD TO CART'}
          </button>
        </div>
        {cartItem && (
          <div className="cart-status">({cartItem.quantity} in cart)</div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
